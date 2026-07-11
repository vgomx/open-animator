import { createId, createDefaultProject, createLayerFromShape } from '@/editor/scene'
import {
  isHtmlFile,
  looksLikeHtmlText,
  openFilePicker,
} from '@/io/file-picker'
import { importSvgAsProject, parseShapeElement } from '@/io/svg-import'
import type { AnimatableProperty, Keyframe, Layer, Project, Shape } from '@/editor/types'
import { createArtboard } from '@/editor/types'

export type CssKeyframeStep = {
  percent: number
  transform?: string
  opacity?: number
  fill?: string
  stroke?: string
}

export type CssAnimationTrack = {
  duration: number
  steps: CssKeyframeStep[]
}

function collectCssText(document: Document, svg: SVGSVGElement): string {
  const chunks: string[] = []

  for (const style of document.querySelectorAll('style')) {
    chunks.push(style.textContent ?? '')
  }

  for (const style of svg.querySelectorAll('style')) {
    chunks.push(style.textContent ?? '')
  }

  return chunks.join('\n')
}

function readArtboard(svg: SVGSVGElement): { width: number; height: number } {
  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map((value) => Number.parseFloat(value))
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return {
        width: Math.max(1, parts[2]!),
        height: Math.max(1, parts[3]!),
      }
    }
  }

  const width = Number.parseFloat(svg.getAttribute('width') ?? '')
  const height = Number.parseFloat(svg.getAttribute('height') ?? '')

  return {
    width: Number.isFinite(width) && width > 0 ? width : 800,
    height: Number.isFinite(height) && height > 0 ? height : 600,
  }
}

function extractKeyframesBlocks(css: string): Array<{ name: string; body: string }> {
  const blocks: Array<{ name: string; body: string }> = []
  const startPattern = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{/g
  let match: RegExpExecArray | null

  while ((match = startPattern.exec(css)) !== null) {
    const name = match[1]!
    let depth = 1
    let index = startPattern.lastIndex
    let body = ''

    while (index < css.length && depth > 0) {
      const char = css[index]!
      if (char === '{') {
        depth += 1
      } else if (char === '}') {
        depth -= 1
      }

      if (depth > 0) {
        body += char
      }

      index += 1
    }

    blocks.push({ name, body })
  }

  return blocks
}

export function parseCssKeyframeTracks(css: string): Map<string, CssAnimationTrack> {
  const tracks = new Map<string, CssAnimationTrack>()

  for (const block of extractKeyframesBlocks(css)) {
    const steps: CssKeyframeStep[] = []
    const stepPattern = /([0-9.]+)%\s*\{([^}]+)\}/g
    let stepMatch: RegExpExecArray | null

    while ((stepMatch = stepPattern.exec(block.body)) !== null) {
      const percent = Number.parseFloat(stepMatch[1]!)
      const declarations = stepMatch[2]!
      const step: CssKeyframeStep = { percent }

      const transform = declarations.match(/transform:\s*([^;]+)/)?.[1]?.trim()
      if (transform) {
        step.transform = transform
      }

      const opacity = declarations.match(/opacity:\s*([^;]+)/)?.[1]?.trim()
      if (opacity) {
        step.opacity = Number.parseFloat(opacity)
      }

      const fill = declarations.match(/fill:\s*([^;]+)/)?.[1]?.trim()
      if (fill) {
        step.fill = fill
      }

      const stroke = declarations.match(/stroke:\s*([^;]+)/)?.[1]?.trim()
      if (stroke) {
        step.stroke = stroke
      }

      if (Number.isFinite(step.percent)) {
        steps.push(step)
      }
    }

    if (steps.length > 0) {
      steps.sort((a, b) => a.percent - b.percent)
      tracks.set(block.name, {
        duration: 3,
        steps,
      })
    }
  }

  for (const [className, track] of tracks) {
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const durationMatch = css.match(new RegExp(`animation:\\s*${escaped}\\s+([0-9.]+)s`))
    const duration = durationMatch ? Number.parseFloat(durationMatch[1]!) : Number.NaN
    if (Number.isFinite(duration) && duration > 0) {
      track.duration = duration
    }
  }

  return tracks
}

export function applyCssTransformToShape(shape: Shape, transformCss: string): Shape {
  const rotationMatch = transformCss.match(/rotate\(([-0-9.]+)deg\)/)
  const scaleMatch = transformCss.match(/scale\(([-0-9.]+)\)/)
  const rotation = rotationMatch ? Number.parseFloat(rotationMatch[1]!) : shape.rotation
  const scale = scaleMatch ? Number.parseFloat(scaleMatch[1]!) : shape.scale
  const translates = [
    ...transformCss.matchAll(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/g),
  ]

  if (shape.type === 'rect' && translates.length >= 2) {
    const centerX = Number.parseFloat(translates[0]![1]!)
    const centerY = Number.parseFloat(translates[0]![2]!)
    return {
      ...shape,
      x: centerX - shape.width / 2,
      y: centerY - shape.height / 2,
      rotation,
      scale,
    }
  }

  if (translates.length >= 1) {
    return {
      ...shape,
      x: Number.parseFloat(translates[0]![1]!),
      y: Number.parseFloat(translates[0]![2]!),
      rotation,
      scale,
    }
  }

  return {
    ...shape,
    rotation,
    scale,
  }
}

function resolveShapeElement(element: Element): Element | null {
  const tag = element.tagName.toLowerCase()
  if (tag === 'g') {
    return element.querySelector('rect, circle, ellipse, path, text, line, polyline, polygon')
  }

  return element
}

function shapeAtStep(baseShape: Shape, step: CssKeyframeStep): Shape {
  let next: Shape = { ...baseShape }

  if (step.transform) {
    next = applyCssTransformToShape(next, step.transform)
  }

  if (step.opacity !== undefined && Number.isFinite(step.opacity)) {
    next = { ...next, opacity: step.opacity }
  }

  if (step.fill) {
    next = { ...next, fill: step.fill }
  }

  if (step.stroke) {
    next = { ...next, stroke: step.stroke }
  }

  return next
}

function addKeyframe(
  keyframes: Keyframe[],
  time: number,
  property: AnimatableProperty,
  value: number | string,
) {
  const existing = keyframes.find(
    (keyframe) => keyframe.time === time && keyframe.property === property,
  )
  if (existing) {
    existing.value = value
    return
  }

  keyframes.push({
    id: createId(),
    time,
    property,
    value,
    easing: 'linear',
  })
}

function buildLayerFromTrack(
  element: Element,
  className: string,
  track: CssAnimationTrack,
  index: number,
  artboardId: string,
): Layer | null {
  const shapeElement = resolveShapeElement(element)
  if (!shapeElement) {
    return null
  }

  const parsedShape = parseShapeElement(shapeElement)
  if (!parsedShape) {
    return null
  }

  const keyframes: Keyframe[] = []
  const sampledShapes = track.steps.map((step) => shapeAtStep(parsedShape, step))

  track.steps.forEach((step, stepIndex) => {
    const time = (step.percent / 100) * track.duration
    const shape = sampledShapes[stepIndex]!
    addKeyframe(keyframes, time, 'x', shape.x)
    addKeyframe(keyframes, time, 'y', shape.y)
    addKeyframe(keyframes, time, 'rotation', shape.rotation)
    addKeyframe(keyframes, time, 'scale', shape.scale)
    addKeyframe(keyframes, time, 'opacity', shape.opacity)
    addKeyframe(keyframes, time, 'fill', shape.fill)
    addKeyframe(keyframes, time, 'stroke', shape.stroke)
  })

  const firstStep = track.steps[0] ?? { percent: 0 }
  const initialShape = shapeAtStep(parsedShape, firstStep)

  return {
    ...createLayerFromShape(
      { ...initialShape, id: createId() },
      index,
      artboardId,
      element.getAttribute('id') || className || `Layer ${index + 1}`,
    ),
    keyframes,
  }
}

function findAnimatedElement(svg: SVGSVGElement, className: string): Element | null {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`)
  const candidates = svg.querySelectorAll('[class]')

  for (const candidate of candidates) {
    const classes = candidate.getAttribute('class') ?? ''
    if (pattern.test(classes)) {
      return candidate
    }
  }

  return null
}

export function importHtmlAnimation(raw: string): Project | null {
  const document = new DOMParser().parseFromString(raw, 'text/html')
  const svg = document.querySelector('svg')
  if (!svg) {
    return null
  }

  const css = collectCssText(document, svg)
  const tracks = parseCssKeyframeTracks(css)

  if (tracks.size === 0) {
    return importSvgAsProject(svg.outerHTML)
  }

  const artboard = createArtboard(readArtboard(svg))
  const layers: Layer[] = []
  let duration = 0
  let index = 0

  for (const [className, track] of tracks) {
    const element = findAnimatedElement(svg, className)
    if (!element) {
      continue
    }

    const layer = buildLayerFromTrack(element, className, track, index, artboard.id)
    if (!layer) {
      continue
    }

    duration = Math.max(duration, track.duration)
    layers.push(layer)
    index += 1
  }

  if (layers.length === 0) {
    return null
  }

  const resolvedDuration = duration > 0 ? duration : 3

  return {
    ...createDefaultProject(),
    artboards: [artboard],
    duration: resolvedDuration,
    loopOut: resolvedDuration,
    layers,
  }
}

export type OpenHtmlFileResult =
  | { status: 'cancelled' }
  | { status: 'rejected'; fileName: string }
  | { status: 'ok'; value: Project }

export async function openHtmlFile(): Promise<OpenHtmlFileResult> {
  const picked = await openFilePicker({
    validateText: (text, file) => isHtmlFile(file) || looksLikeHtmlText(text),
  })

  if (picked.status === 'cancelled') {
    return { status: 'cancelled' }
  }

  if (picked.status === 'rejected') {
    return { status: 'rejected', fileName: picked.file.name }
  }

  try {
    const value = importHtmlAnimation(picked.text)
    if (!value) {
      return { status: 'rejected', fileName: picked.file.name }
    }

    return { status: 'ok', value }
  } catch {
    return { status: 'rejected', fileName: picked.file.name }
  }
}
