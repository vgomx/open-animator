import type { ExportOptions } from '@/io/export-options'
import { DEFAULT_EXPORT_OPTIONS, resolveExportScale } from '@/io/export-options'
import { getExportArtboard, getExportLayers } from '@/editor/artboard-utils'
import { buildLayerTreeRows, type LayerTreeRow } from '@/editor/layer-tree'
import type { Artboard, Layer, Project, Shape } from '@/editor/types'
import { isTransparentColor } from '@/editor/color-utils'
import { getAnimatedShape } from '@/editor/animation'
import { pathPointsToString } from '@/editor/path-nodes'
import { buildShapeTransform } from '@/editor/transforms'
import { importedFilterId } from '@/io/svg-filters'
import {
  getExportAnimationContext,
  groupAnimationCss,
  hasAnimatedGroupsInProject,
} from '@/io/group-export'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function toCssTransform(shape: Shape): string {
  return buildShapeTransform(shape)
    .replace(/translate\(([^)]+)\)/g, (_, values: string) => {
      const [x, y] = values.trim().split(/\s+/)
      return `translate(${x}px, ${y}px)`
    })
    .replace(/rotate\(([^)]+)\)/g, 'rotate($1deg)')
}

function scaledDimension(value: number, scale: number): number {
  return Math.round(value * scale)
}

function exportDimensions(
  artboard: { width: number; height: number },
  options: ExportOptions,
): { width: number; height: number; scale: number } {
  const scale = resolveExportScale(artboard, options)
  return {
    scale,
    width: scaledDimension(artboard.width, scale),
    height: scaledDimension(artboard.height, scale),
  }
}

function shapeMarkup(shape: Shape, className?: string, animated = false): string {
  const classAttr = className ? ` class="${className}"` : ''
  const shared = [
    ...(animated ? [] : [`transform="${buildShapeTransform(shape)}"`]),
    `fill="${escapeXml(shape.fill)}"`,
    `stroke="${escapeXml(shape.stroke)}"`,
    `stroke-width="${shape.strokeWidth}"`,
    `opacity="${shape.opacity}"`,
  ]

  if (shape.type === 'rect') {
    return `<rect${classAttr} ${shared.join(' ')} width="${shape.width}" height="${shape.height}" />`
  }

  if (shape.type === 'text') {
    return `<text${classAttr} x="${shape.x}" y="${shape.y}" font-size="${shape.fontSize}" font-family="${escapeXml(shape.fontFamily)}" fill="${escapeXml(shape.fill)}" opacity="${shape.opacity}">${escapeXml(shape.text)}</text>`
  }

  if (shape.type === 'path') {
    const d = pathPointsToString(shape.points, shape.closed)
    if (!d) {
      return ''
    }

    const pathAttrs = [
      `d="${d}"`,
      `fill="${escapeXml(shape.fill)}"`,
      `stroke="${escapeXml(shape.stroke)}"`,
      `stroke-width="${shape.strokeWidth}"`,
      `opacity="${shape.opacity}"`,
      'stroke-linejoin="round"',
      'stroke-linecap="round"',
    ].join(' ')

    if (animated && className) {
      return `<g class="${className}"><path ${pathAttrs} /></g>`
    }

    return `<g transform="${buildShapeTransform(shape)}"><path ${pathAttrs} /></g>`
  }

  return `<ellipse${classAttr} ${shared.join(' ')} rx="${shape.rx}" ry="${shape.ry}" />`
}

function layerFilterAttr(layer: Layer, project: Project): string {
  const filterId = layer.svgFilterId
  if (!filterId || !project.importedSvg?.filters?.[filterId]?.markup) {
    return ''
  }

  return ` filter="url(#${importedFilterId(filterId)})"`
}

function wrapLayerMarkup(layer: Layer, project: Project, innerMarkup: string): string {
  const filterAttr = layerFilterAttr(layer, project)
  if (!filterAttr) {
    return innerMarkup
  }

  return `<g${filterAttr}>${innerMarkup}</g>`
}

function buildImportedFilterDefs(project: Project, artboardId?: string): string {
  const filters = project.importedSvg?.filters
  if (!filters) {
    return ''
  }

  const usedFilterIds = new Set(
    getExportLayers(project, artboardId)
      .map((layer) => layer.svgFilterId)
      .filter(Boolean) as string[],
  )

  const markup = Object.values(filters)
    .filter((filter) => usedFilterIds.has(filter.id) && filter.markup)
    .map(
      (filter) =>
        `<filter id="${importedFilterId(filter.id)}" filterUnits="userSpaceOnUse">${filter.markup}</filter>`,
    )
    .join('\n    ')

  return markup ? `<defs>\n    ${markup}\n  </defs>\n  ` : ''
}

function backgroundMarkup(artboard: Artboard, options: ExportOptions): string {
  if (options.background === 'transparent') {
    return ''
  }

  const artboardColor = artboard.backgroundColor
  const color =
    !artboardColor || isTransparentColor(artboardColor)
      ? options.backgroundColor
      : artboardColor

  return `<rect width="100%" height="100%" fill="${escapeXml(color)}" />`
}

function collectLayerTimes(layer: Layer, duration: number): number[] {
  const times = new Set<number>([0, duration])
  for (const keyframe of layer.keyframes) {
    times.add(Math.max(0, Math.min(keyframe.time, duration)))
  }

  return [...times].sort((a, b) => a - b)
}

function layerAnimationCss(
  layer: Layer,
  duration: number,
  className: string,
  context?: ReturnType<typeof getExportAnimationContext>,
): string {
  const times = collectLayerTimes(layer, duration)
  if (times.length <= 1) {
    return ''
  }

  const keyframeLines = times
    .map((time) => {
      const shape = getAnimatedShape(layer, time, context)
      const percent = duration === 0 ? 0 : (time / duration) * 100
      return `  ${percent}% { transform: ${toCssTransform(shape)}; opacity: ${shape.opacity}; fill: ${shape.fill}; stroke: ${shape.stroke}; }`
    })
    .join('\n')

  return `@keyframes ${className} {\n${keyframeLines}\n}\n.${className} { animation: ${className} ${duration}s linear infinite; transform-box: fill-box; transform-origin: center; }`
}

type ExportMarkupState = {
  styles: string[]
  layerIndex: number
  groupIndex: number
}

function exportLayerMarkup(
  layer: Layer,
  project: Project,
  duration: number,
  state: ExportMarkupState,
  bakeGroupMotion: boolean,
): string {
  const context = bakeGroupMotion ? getExportAnimationContext(project) : undefined
  const className = `layer-anim-${state.layerIndex}`
  state.layerIndex += 1

  const css = layerAnimationCss(layer, duration, className, context)
  if (css) {
    state.styles.push(css)
  }

  const baseShape = getAnimatedShape(layer, 0, context)
  const innerMarkup = shapeMarkup(baseShape, css ? className : undefined, Boolean(css))
  return wrapLayerMarkup(layer, project, innerMarkup)
}

function exportTreeMarkup(
  rows: LayerTreeRow[],
  project: Project,
  duration: number,
  state: ExportMarkupState,
): string {
  return rows
    .map((row) => {
      if (row.kind === 'layer') {
        return exportLayerMarkup(row.layer, project, duration, state, false)
      }

      const className = `group-anim-${state.groupIndex}`
      state.groupIndex += 1
      const css = groupAnimationCss(row.groupId, project.layerGroups, duration, className)
      if (css) {
        state.styles.push(css)
      }

      const children = exportTreeMarkup(row.children, project, duration, state)
      if (css) {
        return `<g class="${className}">\n    ${children}\n    </g>`
      }

      return `<g>\n    ${children}\n    </g>`
    })
    .join('\n    ')
}

export function exportSvgAtTime(
  project: Project,
  time: number,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): string {
  const artboard = getExportArtboard(project, artboardId)
  const { width, height, scale } = exportDimensions(artboard, options)
  const visibleLayers = getExportLayers(project, artboardId).filter((layer) => layer.visible)
  const context = getExportAnimationContext(project)
  const shapes = visibleLayers
    .map((layer) =>
      wrapLayerMarkup(layer, project, shapeMarkup(getAnimatedShape(layer, time, context))),
    )
    .join('\n    ')

  const scaleGroup =
    scale === 1
      ? shapes
      : `<g transform="scale(${scale})">\n    ${shapes}\n  </g>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${buildImportedFilterDefs(project, artboardId)}${backgroundMarkup(artboard, options)}
  ${scaleGroup}
</svg>`
}

export function exportAnimatedSvg(
  project: Project,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): string {
  const artboard = getExportArtboard(project, artboardId)
  const { width, height, scale } = exportDimensions(artboard, options)
  const visibleLayers = getExportLayers(project, artboardId).filter((layer) => layer.visible)
  const state: ExportMarkupState = { styles: [], layerIndex: 0, groupIndex: 0 }

  const shapes = hasAnimatedGroupsInProject(project)
    ? exportTreeMarkup(buildLayerTreeRows(visibleLayers, project.layerGroups), project, project.duration, state)
    : visibleLayers
        .map((layer) => exportLayerMarkup(layer, project, project.duration, state, true))
        .join('\n    ')

  const styles = state.styles

  const styleBlock =
    styles.length > 0 ? `<style>\n${styles.join('\n')}\n</style>\n  ` : ''
  const scaleGroup =
    scale === 1
      ? shapes
      : `<g transform="scale(${scale})">\n    ${shapes}\n  </g>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${styleBlock}${buildImportedFilterDefs(project, artboardId)}${backgroundMarkup(artboard, options)}
  ${scaleGroup}
</svg>`
}

export function exportStaticSvg(
  project: Project,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): string {
  return exportSvgAtTime(project, 0, options, artboardId)
}

export function downloadStaticSvg(
  project: Project,
  filename = 'artboard.svg',
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): void {
  const blob = new Blob([exportStaticSvg(project, options, artboardId)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadAnimatedSvg(
  project: Project,
  filename = 'animation.svg',
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): void {
  const blob = new Blob([exportAnimatedSvg(project, options, artboardId)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadWebm(
  project: Project,
  filename = 'animation.webm',
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): Promise<void> {
  const artboard = getExportArtboard(project, artboardId)
  const fps = options.fps
  const { width, height } = exportDimensions(artboard, options)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const stream = canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  const chunks: Blob[] = []

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }
  })

  recorder.start()
  const loopIn = project.loopIn ?? 0
  const loopOut = project.loopOut ?? project.duration
  const regionDuration = Math.max(0.1, loopOut - loopIn)
  const frameCount = Math.max(1, Math.ceil(regionDuration * fps))

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = Math.min(loopOut, loopIn + frame / fps)
    const svgMarkup = exportSvgAtTime(project, time, options, artboardId)
    const image = new Image()
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }))

    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve()
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to render animation frame.'))
      }
      image.src = url
    })

    await new Promise((resolve) => {
      window.setTimeout(resolve, 1000 / fps)
    })
  }

  recorder.stop()
  const blob = await stopped
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
