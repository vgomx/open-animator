import { attachMatrixDisplayKeyframes, layerHasAnimation } from '@/editor/layer-animation'
import {
  buildLayersFromCssTracks,
  mergeAnimatedKeyframesIntoStaticLayers,
  parseCssKeyframeTracks,
} from '@/io/css-keyframes'
import {
  createEllipseShape,
  createId,
  createLayerFromShape,
  createPathShape,
  createRectShape,
  createTextShape,
} from '@/editor/scene'
import type { Keyframe, Layer, LayerGroupMeta, PathPoint, PathShape, Project, Shape, TextShape } from '@/editor/types'
import { createArtboard } from '@/editor/types'
import { createDefaultProject } from '@/editor/scene'
import {
  type ImportedGradient,
  parseSvgGradients,
  resolvePaintValue,
} from '@/io/svg-gradients'
import { parseSvgMasks, resolveMaskId } from '@/io/svg-masks'
import { parseSvgClipPaths, resolveClipPathId } from '@/io/svg-clippaths'
import { parseSvgFilters, resolveFilterId } from '@/io/svg-filters'
import {
  isSvgFile,
  looksLikeSvgText,
  openFilePicker,
} from '@/io/file-picker'
import {
  collectMatrixKeyframesForNode,
  collectTransformKeyframesForNode,
  beginMatrixTimeCache,
  effectiveMatrixAtTime,
  endMatrixTimeCache,
} from '@/io/svg-smil'
import {
  applyMatrixToPoint,
  type AffineMatrix,
  IDENTITY_MATRIX,
  multiplyMatrix,
  parseTransformAttribute,
} from '@/io/svg-transform'
import { arcToCubicBeziers } from '@/io/svg-arc'
import {
  applyElementStyles,
  parseSvgStyleSheet,
  resolveClassStyle,
  type SvgStyleSheet,
} from '@/io/svg-styles'
import {
  getNodePath,
  sampleMatrixKeyframesBatch,
  sampleMatrixKeyframesInWorker,
} from '@/io/svg-matrix-batch'
import { SHAPE_FILL_SECONDARY } from '@/lib/brand-colors'
import { waitForPaint, yieldToUi } from '@/lib/yield-to-ui'

export { parseSvgColor } from '@/io/svg-colors'

type SvgStyle = {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
}

export type SvgImportResult = {
  layers: Layer[]
  artboard: { width: number; height: number }
  gradients: Record<string, ImportedGradient>
  masks: Record<string, { id: string; markup: string }>
  clipPaths: Record<string, { id: string; markup: string }>
  filters: Record<string, { id: string; markup: string; cssFilter?: string; partial?: boolean }>
  groups: Record<string, LayerGroupMeta>
  duration: number
}

type PendingMatrixSample = {
  layerIndex: number
  nodePath: number[]
}

type CollectLayersContext = {
  gradients: Record<string, ImportedGradient>
  styleSheet: SvgStyleSheet
  groups: Record<string, LayerGroupMeta>
  layers: Layer[]
  pendingMatrixSamples: PendingMatrixSample[]
  deferMatrixSampling: boolean
}

function parseNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isInsideDefs(node: Element): boolean {
  let parent = node.parentElement
  while (parent) {
    if (parent.tagName.toLowerCase() === 'defs') {
      return true
    }
    parent = parent.parentElement
  }
  return false
}

/** Clone `<use>` references inline so imported SVGs retain tiled/reused content. */
export function expandSvgUses(root: SVGSVGElement): void {
  const uses = [...root.querySelectorAll('use')]

  for (const use of uses) {
    if (isInsideDefs(use)) {
      continue
    }

    const href = use.getAttribute('href') ?? use.getAttribute('xlink:href')
    if (!href?.startsWith('#')) {
      continue
    }

    const id = href.slice(1)
    const ref = root.querySelector(`[id="${id}"]`)
    if (!ref) {
      continue
    }

    const x = parseNumber(use.getAttribute('x'))
    const y = parseNumber(use.getAttribute('y'))
    const clone = ref.cloneNode(true) as Element

    if (x !== 0 || y !== 0) {
      const existingTransform = clone.getAttribute('transform') ?? ''
      const translate = `translate(${x},${y})`
      clone.setAttribute(
        'transform',
        existingTransform ? `${translate} ${existingTransform}` : translate,
      )
    }

    use.parentNode?.insertBefore(clone, use)
    use.remove()
  }
}

const SKIP_TAGS = new Set([
  'defs',
  'style',
  'metadata',
  'lineargradient',
  'radialgradient',
  'stop',
  'mask',
  'clippath',
  'animatetransform',
  'animate',
  'animatemotion',
])

function readStyle(
  element: Element,
  inherited: SvgStyle,
  gradients: Record<string, ImportedGradient>,
  styleSheet: SvgStyleSheet,
): SvgStyle {
  const fromClasses = resolveClassStyle(
    applyElementStyles(element, inherited, styleSheet),
    inherited,
    gradients,
  )

  const fill = element.getAttribute('fill')
  const stroke = element.getAttribute('stroke')
  const strokeWidth = element.getAttribute('stroke-width')
  const opacity = element.getAttribute('opacity')
  const fillOpacity = element.getAttribute('fill-opacity')
  const inheritedOpacity = fromClasses.opacity

  return {
    fill: fill
      ? resolvePaintValue(fill, fromClasses.fill, gradients)
      : fromClasses.fill,
    stroke: stroke
      ? resolvePaintValue(stroke, fromClasses.stroke, gradients)
      : fromClasses.stroke,
    strokeWidth: strokeWidth ? parseNumber(strokeWidth, fromClasses.strokeWidth) : fromClasses.strokeWidth,
    opacity: opacity
      ? parseNumber(opacity, inheritedOpacity)
      : fillOpacity
        ? parseNumber(fillOpacity, inheritedOpacity)
        : inheritedOpacity,
  }
}

function transformPathPoints(points: PathPoint[], matrix: AffineMatrix): PathPoint[] {
  return points.map((point) => {
    const mapped = applyMatrixToPoint(matrix, point.x, point.y)
    return {
      ...point,
      x: mapped.x,
      y: mapped.y,
      handleIn: point.handleIn
        ? applyMatrixToPoint(matrix, point.handleIn.x, point.handleIn.y)
        : point.handleIn,
      handleOut: point.handleOut
        ? applyMatrixToPoint(matrix, point.handleOut.x, point.handleOut.y)
        : point.handleOut,
    }
  })
}

function applyStyle(shape: Shape, style: SvgStyle): Shape {
  return {
    ...shape,
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
  }
}

function tokenizePathData(d: string): Array<string | number> {
  const tokens: Array<string | number> = []
  const pattern = /([a-zA-Z])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(d)) !== null) {
    if (match[1]) {
      tokens.push(match[1])
    } else if (match[2]) {
      tokens.push(Number.parseFloat(match[2]))
    }
  }

  return tokens
}

export function parseSvgPathData(d: string): { points: PathPoint[]; closed: boolean } {
  const tokens = tokenizePathData(d)
  const points: PathPoint[] = []
  let index = 0
  let currentX = 0
  let currentY = 0
  let subpathStartX = 0
  let subpathStartY = 0
  let closed = false
  let command = ''

  const readNumber = () => {
    const value = tokens[index]
    index += 1
    return typeof value === 'number' ? value : 0
  }

  const pushPoint = (point: PathPoint) => {
    points.push(point)
  }

  while (index < tokens.length) {
    const token = tokens[index]
    if (typeof token === 'string') {
      command = token
      index += 1
    }

    const relative = command === command.toLowerCase() && command !== 'Z' && command !== 'z'
    const upper = command.toUpperCase()

    if (upper === 'M') {
      const x = readNumber()
      const y = readNumber()
      currentX = relative ? currentX + x : x
      currentY = relative ? currentY + y : y
      subpathStartX = currentX
      subpathStartY = currentY
      pushPoint({ x: currentX, y: currentY })

      while (index < tokens.length && typeof tokens[index] === 'number') {
        const lineX = readNumber()
        const lineY = readNumber()
        currentX = relative ? currentX + lineX : lineX
        currentY = relative ? currentY + lineY : lineY
        pushPoint({ x: currentX, y: currentY })
      }
      continue
    }

    if (upper === 'L') {
      const x = readNumber()
      const y = readNumber()
      currentX = relative ? currentX + x : x
      currentY = relative ? currentY + y : y
      pushPoint({ x: currentX, y: currentY })
      continue
    }

    if (upper === 'H') {
      const x = readNumber()
      currentX = relative ? currentX + x : x
      pushPoint({ x: currentX, y: currentY })
      continue
    }

    if (upper === 'V') {
      const y = readNumber()
      currentY = relative ? currentY + y : y
      pushPoint({ x: currentX, y: currentY })
      continue
    }

    if (upper === 'C') {
      const x1 = readNumber()
      const y1 = readNumber()
      const x2 = readNumber()
      const y2 = readNumber()
      const x = readNumber()
      const y = readNumber()
      const absX1 = relative ? currentX + x1 : x1
      const absY1 = relative ? currentY + y1 : y1
      const absX2 = relative ? currentX + x2 : x2
      const absY2 = relative ? currentY + y2 : y2
      currentX = relative ? currentX + x : x
      currentY = relative ? currentY + y : y

      const previous = points[points.length - 1]
      if (previous) {
        points[points.length - 1] = {
          ...previous,
          handleOut: { x: absX1, y: absY1 },
        }
      }

      pushPoint({
        x: currentX,
        y: currentY,
        handleIn: { x: absX2, y: absY2 },
      })
      continue
    }

    if (upper === 'Q') {
      const x1 = readNumber()
      const y1 = readNumber()
      const x = readNumber()
      const y = readNumber()
      const absX1 = relative ? currentX + x1 : x1
      const absY1 = relative ? currentY + y1 : y1
      currentX = relative ? currentX + x : x
      currentY = relative ? currentY + y : y

      const previous = points[points.length - 1]
      if (previous) {
        points[points.length - 1] = {
          ...previous,
          handleOut: { x: absX1, y: absY1 },
        }
      }

      pushPoint({ x: currentX, y: currentY })
      continue
    }

    if (upper === 'A') {
      const rx = readNumber()
      const ry = readNumber()
      const xAxisRotation = readNumber()
      const largeArc = readNumber() !== 0
      const sweep = readNumber() !== 0
      const x = readNumber()
      const y = readNumber()
      const endX = relative ? currentX + x : x
      const endY = relative ? currentY + y : y

      const segments = arcToCubicBeziers(
        currentX,
        currentY,
        Math.abs(rx),
        Math.abs(ry),
        xAxisRotation,
        largeArc,
        sweep,
        endX,
        endY,
      )

      for (const segment of segments) {
        const previous = points[points.length - 1]
        if (previous) {
          points[points.length - 1] = {
            ...previous,
            handleOut: { x: segment.cp1x, y: segment.cp1y },
          }
        }

        currentX = segment.x
        currentY = segment.y
        pushPoint({
          x: segment.x,
          y: segment.y,
          handleIn: { x: segment.cp2x, y: segment.cp2y },
        })
      }
      continue
    }

    if (upper === 'Z') {
      closed = true
      currentX = subpathStartX
      currentY = subpathStartY
      continue
    }

    if (typeof tokens[index] === 'number') {
      continue
    }

    break
  }

  return { points, closed }
}

function normalizePathPlacement(shape: PathShape): PathShape {
  if (shape.localCoords || shape.points.length === 0) {
    return shape
  }

  const xs = shape.points.map((point) => point.x)
  const ys = shape.points.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)

  if (minX === 0 && minY === 0) {
    return shape
  }

  return {
    ...shape,
    x: shape.x + minX,
    y: shape.y + minY,
    points: shape.points.map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    })),
  }
}

function elementToShape(element: Element, style: SvgStyle, matrix: AffineMatrix): Shape | null {
  const tag = element.tagName.toLowerCase()

  if (tag === 'rect') {
    const x = parseNumber(element.getAttribute('x'))
    const y = parseNumber(element.getAttribute('y'))
    const width = parseNumber(element.getAttribute('width'), 1)
    const height = parseNumber(element.getAttribute('height'), 1)
    const corners = [
      applyMatrixToPoint(matrix, x, y),
      applyMatrixToPoint(matrix, x + width, y + height),
    ]
    const minX = Math.min(corners[0]!.x, corners[1]!.x)
    const minY = Math.min(corners[0]!.y, corners[1]!.y)
    const maxX = Math.max(corners[0]!.x, corners[1]!.x)
    const maxY = Math.max(corners[0]!.y, corners[1]!.y)
    return applyStyle(createRectShape(minX, minY, maxX - minX, maxY - minY), style)
  }

  if (tag === 'circle') {
    const cx = parseNumber(element.getAttribute('cx'))
    const cy = parseNumber(element.getAttribute('cy'))
    const r = parseNumber(element.getAttribute('r'), 1)
    const center = applyMatrixToPoint(matrix, cx, cy)
    const edge = applyMatrixToPoint(matrix, cx + r, cy)
    const radius = Math.hypot(edge.x - center.x, edge.y - center.y)
    const shape = createEllipseShape(center.x - radius, center.y - radius, radius * 2, radius * 2)
    return applyStyle(shape, style)
  }

  if (tag === 'ellipse') {
    const cx = parseNumber(element.getAttribute('cx'))
    const cy = parseNumber(element.getAttribute('cy'))
    const rx = parseNumber(element.getAttribute('rx'), 1)
    const ry = parseNumber(element.getAttribute('ry'), rx)
    const center = applyMatrixToPoint(matrix, cx, cy)
    const right = applyMatrixToPoint(matrix, cx + rx, cy)
    const bottom = applyMatrixToPoint(matrix, cx, cy + ry)
    const shape = createEllipseShape(
      center.x - Math.abs(right.x - center.x),
      center.y - Math.abs(bottom.y - center.y),
      Math.abs(right.x - center.x) * 2,
      Math.abs(bottom.y - center.y) * 2,
    )
    return applyStyle(shape, style)
  }

  if (tag === 'text') {
    const x = parseNumber(element.getAttribute('x'))
    const y = parseNumber(element.getAttribute('y'))
    const mapped = applyMatrixToPoint(matrix, x, y)
    const text = element.textContent?.trim() || 'Text'
    const fontSize = parseNumber(element.getAttribute('font-size'), 24)
    const fontFamily = element.getAttribute('font-family') || 'Geist, system-ui, sans-serif'
    const base = createTextShape(mapped.x, mapped.y)
    const styled = applyStyle(base, style) as TextShape
    return {
      ...styled,
      text,
      fontSize,
      fontFamily,
    }
  }

  if (tag === 'path') {
    const d = element.getAttribute('d')
    if (!d) {
      return null
    }

    const { points, closed } = parseSvgPathData(d)
    if (points.length < 2) {
      return null
    }

    const pathShape = createPathShape(transformPathPoints(points, matrix), closed)
    return applyStyle(pathShape, style)
  }

  if (tag === 'line') {
    const x1 = parseNumber(element.getAttribute('x1'))
    const y1 = parseNumber(element.getAttribute('y1'))
    const x2 = parseNumber(element.getAttribute('x2'))
    const y2 = parseNumber(element.getAttribute('y2'))
    const start = applyMatrixToPoint(matrix, x1, y1)
    const end = applyMatrixToPoint(matrix, x2, y2)
    const pathShape = normalizePathPlacement(
      createPathShape(
        [
          { x: start.x, y: start.y },
          { x: end.x, y: end.y },
        ],
        false,
      ),
    )
    return applyStyle(pathShape, style)
  }

  if (tag === 'polyline' || tag === 'polygon') {
    const rawPoints = element.getAttribute('points')
    if (!rawPoints) {
      return null
    }

    const coords = rawPoints
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value))

    const pathPoints: PathPoint[] = []
    for (let pointIndex = 0; pointIndex < coords.length; pointIndex += 2) {
      const x = coords[pointIndex]
      const y = coords[pointIndex + 1]
      if (x === undefined || y === undefined) {
        continue
      }
      const mapped = applyMatrixToPoint(matrix, x, y)
      pathPoints.push({ x: mapped.x, y: mapped.y })
    }

    if (pathPoints.length < 2) {
      return null
    }

    const pathShape = normalizePathPlacement(createPathShape(pathPoints, tag === 'polygon'))
    return applyStyle(pathShape, style)
  }

  return null
}

function collectLayers(
  node: Element,
  inheritedStyle: SvgStyle,
  inheritedMatrix: AffineMatrix,
  inheritedMaskId: string | null,
  inheritedClipPathId: string | null,
  inheritedFilterId: string | null,
  inheritedGroupId: string | null,
  context: CollectLayersContext,
  startIndex: number,
): { nextIndex: number; duration: number } {
  let nextIndex = startIndex
  let duration = 0
  const tag = node.tagName.toLowerCase()

  if (SKIP_TAGS.has(tag) || isInsideDefs(node)) {
    return { nextIndex, duration }
  }

  const style = readStyle(node, inheritedStyle, context.gradients, context.styleSheet)
  const localMatrix = parseTransformAttribute(node.getAttribute('transform'))
  const matrix = multiplyMatrix(inheritedMatrix, localMatrix)
  const maskId = resolveMaskId(node.getAttribute('mask')) ?? inheritedMaskId
  const clipPathId = resolveClipPathId(node.getAttribute('clip-path')) ?? inheritedClipPathId
  const filterId = resolveFilterId(node.getAttribute('filter')) ?? inheritedFilterId

  let activeGroupId = inheritedGroupId
  if (tag === 'g') {
    activeGroupId = createId()
    const name =
      node.getAttribute('id') ||
      node.getAttribute('data-name') ||
      `Group ${Object.keys(context.groups).length + 1}`
    const classAttribute = node.getAttribute('class')
    const classNames = classAttribute?.split(/\s+/).filter(Boolean) ?? []
    context.groups[activeGroupId] = {
      name,
      parentGroupId: inheritedGroupId,
      nodePath: getNodePath(node),
      classNames: classNames.length > 0 ? classNames : undefined,
    }
  }

  if (tag === 'g' || tag === 'svg') {
    for (const child of [...node.children]) {
      const childResult = collectLayers(
        child,
        style,
        matrix,
        maskId,
        clipPathId,
        filterId,
        activeGroupId,
        context,
        nextIndex,
      )
      nextIndex = childResult.nextIndex
      duration = Math.max(duration, childResult.duration)
    }
    return { nextIndex, duration }
  }

  const baseMatrix = effectiveMatrixAtTime(node, 0)
  const isPath = tag === 'path'
  const shape = elementToShape(node, style, isPath ? IDENTITY_MATRIX : matrix)
  if (!shape) {
    return { nextIndex, duration }
  }

  if (isPath && shape.type === 'path') {
    const positionedShape = {
      ...shape,
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1, scaleY: 1,
      localCoords: true,
    }

    const name = node.getAttribute('id') || node.getAttribute('data-name') || `${tag}-${nextIndex + 1}`
    const layer = createLayerFromShape(positionedShape, nextIndex, '', name)
    layer.groupId = activeGroupId
    if (maskId) {
      layer.svgMaskId = maskId
    }
    if (clipPathId) {
      layer.svgClipPathId = clipPathId
    }
    if (filterId) {
      layer.svgFilterId = filterId
    }

    if (context.deferMatrixSampling) {
      context.pendingMatrixSamples.push({
        layerIndex: context.layers.length,
        nodePath: getNodePath(node),
      })
      context.layers.push(layer)
      return { nextIndex: nextIndex + 1, duration }
    }

    const matrixAnim = collectMatrixKeyframesForNode(node)
    duration = Math.max(duration, matrixAnim.duration)
    layer.matrixKeyframes = matrixAnim.keyframes
    context.layers.push(attachMatrixDisplayKeyframes(layer))
    return { nextIndex: nextIndex + 1, duration }
  }

  const positionedShape = shape

  const smil = collectTransformKeyframesForNode(node, baseMatrix)
  duration = Math.max(duration, smil.duration)

  const name = node.getAttribute('id') || node.getAttribute('data-name') || `${tag}-${nextIndex + 1}`
  const layer = createLayerFromShape(positionedShape, nextIndex, '', name)
  layer.keyframes = mergeKeyframes(layer.keyframes, smil.keyframes)
  layer.groupId = activeGroupId
  if (maskId) {
    layer.svgMaskId = maskId
  }
  if (clipPathId) {
    layer.svgClipPathId = clipPathId
  }
  if (filterId) {
    layer.svgFilterId = filterId
  }

  context.layers.push(layer)
  return { nextIndex: nextIndex + 1, duration }
}

async function finalizeMatrixSamples(
  layers: Layer[],
  pendingSamples: PendingMatrixSample[],
  svgMarkup: string,
  duration: number,
  useWorker: boolean,
  onProgress?: (progress: SvgImportProgress) => void,
): Promise<number> {
  if (pendingSamples.length === 0) {
    return duration
  }

  const total = pendingSamples.length
  const chunkSize = useWorker ? 50 : 25
  let maxDuration = duration

  for (let offset = 0; offset < total; offset += chunkSize) {
    const chunk = pendingSamples.slice(offset, offset + chunkSize)
    const requests = chunk.map((sample) => ({ nodePath: sample.nodePath }))
    const results = useWorker
      ? await sampleMatrixKeyframesInWorker(svgMarkup, requests)
      : sampleMatrixKeyframesBatch(svgMarkup, requests)

    for (let index = 0; index < chunk.length; index += 1) {
      const sample = chunk[index]!
      const matrixAnim = results[index]!
      const layer = layers[sample.layerIndex]
      if (!layer) {
        continue
      }

      layer.matrixKeyframes = matrixAnim.keyframes
      maxDuration = Math.max(maxDuration, matrixAnim.duration)
      const enriched = attachMatrixDisplayKeyframes(layer)
      layers[sample.layerIndex] = enriched
    }

    onProgress?.({
      stage: 'matrix-sampling',
      current: Math.min(offset + chunk.length, total),
      total,
    })
    await yieldToUi()
  }

  onProgress?.({ stage: 'applying', current: total, total })
  return maxDuration
}

function parseSvgDocument(raw: string, deferMatrixSampling: boolean): {
  svg: SVGSVGElement
  layers: Layer[]
  groups: Record<string, LayerGroupMeta>
  gradients: Record<string, ImportedGradient>
  masks: ReturnType<typeof parseSvgMasks>
  clipPaths: ReturnType<typeof parseSvgClipPaths>
  filters: ReturnType<typeof parseSvgFilters>
  duration: number
  pendingMatrixSamples: PendingMatrixSample[]
} | null {
  const parser = new DOMParser()
  const document = parser.parseFromString(raw, 'image/svg+xml')
  const parserError = document.querySelector('parsererror')
  if (parserError) {
    return null
  }

  const svg = document.querySelector('svg')
  if (!svg) {
    return null
  }

  expandSvgUses(svg)

  const gradients = parseSvgGradients(svg)
  const masks = parseSvgMasks(svg, gradients)
  const clipPaths = parseSvgClipPaths(svg, gradients)
  const filters = parseSvgFilters(svg)
  const styleSheet = parseSvgStyleSheet(svg)
  const groups: Record<string, LayerGroupMeta> = {}
  const defaultStyle: SvgStyle = {
    fill: SHAPE_FILL_SECONDARY,
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
  }

  const context: CollectLayersContext = {
    gradients,
    styleSheet,
    groups,
    layers: [],
    pendingMatrixSamples: [],
    deferMatrixSampling,
  }

  beginMatrixTimeCache()
  let duration = 0
  try {
    const result = collectLayers(
      svg,
      defaultStyle,
      IDENTITY_MATRIX,
      null,
      null,
      null,
      null,
      context,
      0,
    )
    duration = result.duration
  } finally {
    endMatrixTimeCache()
  }

  if (context.layers.length === 0) {
    return null
  }

  return {
    svg,
    layers: context.layers,
    groups,
    gradients,
    masks,
    clipPaths,
    filters,
    duration,
    pendingMatrixSamples: context.pendingMatrixSamples,
  }
}

function mergeKeyframes(existing: Keyframe[], imported: Keyframe[]): Keyframe[] {
  if (imported.length === 0) {
    return existing
  }

  const merged = [...existing]
  for (const keyframe of imported) {
    const match = merged.find(
      (entry) => entry.time === keyframe.time && entry.property === keyframe.property,
    )
    if (match) {
      match.value = keyframe.value
      continue
    }
    merged.push({ ...keyframe, id: createId() })
  }

  return merged
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

  return {
    width: Math.max(1, parseNumber(svg.getAttribute('width'), 800)),
    height: Math.max(1, parseNumber(svg.getAttribute('height'), 600)),
  }
}

function buildAncestorChain(element: Element): Element[] {
  const chain: Element[] = []
  let current: Element | null = element

  while (current) {
    const tag = current.tagName.toLowerCase()
    if (tag === 'html' || tag === 'body' || tag === 'div') {
      break
    }

    chain.unshift(current)
    if (tag === 'svg') {
      break
    }

    current = current.parentElement
  }

  return chain
}

function resolveShapeContext(element: Element): { style: SvgStyle; matrix: AffineMatrix } {
  const svg = element.closest('svg')
  const gradients = svg ? parseSvgGradients(svg) : {}
  const styleSheet = svg ? parseSvgStyleSheet(svg) : { classes: {}, ids: {} }
  const defaultStyle: SvgStyle = {
    fill: SHAPE_FILL_SECONDARY,
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
  }

  let style = defaultStyle
  let matrix = IDENTITY_MATRIX

  for (const node of buildAncestorChain(element)) {
    style = readStyle(node, style, gradients, styleSheet)
    const localMatrix = parseTransformAttribute(node.getAttribute('transform'))
    matrix = multiplyMatrix(matrix, localMatrix)
  }

  return { style, matrix }
}

export function parseShapeElement(element: Element): Shape | null {
  const { style, matrix } = resolveShapeContext(element)
  const tag = element.tagName.toLowerCase()
  const isPath = tag === 'path'
  return elementToShape(element, style, isPath ? IDENTITY_MATRIX : matrix)
}

export function parseSvgArtboardFromMarkup(raw: string): { width: number; height: number } | null {
  const parser = new DOMParser()
  const document = parser.parseFromString(raw, 'image/svg+xml')
  const svg = document.querySelector('svg')
  if (!svg) {
    return null
  }

  return readArtboard(svg)
}

function buildSvgImportResult(
  parsed: NonNullable<ReturnType<typeof parseSvgDocument>>,
  duration: number,
): SvgImportResult {
  return {
    layers: parsed.layers,
    artboard: readArtboard(parsed.svg),
    gradients: parsed.gradients,
    masks: parsed.masks,
    clipPaths: parsed.clipPaths,
    filters: parsed.filters,
    groups: parsed.groups,
    duration: duration > 0 ? duration : 0,
  }
}

export function importSvg(raw: string): SvgImportResult | null {
  const parsed = parseSvgDocument(raw, false)
  if (!parsed) {
    return null
  }

  return buildSvgImportResult(parsed, parsed.duration)
}

export type SvgImportStage = 'parsing' | 'matrix-sampling' | 'applying'

export type SvgImportProgress = {
  stage: SvgImportStage
  current?: number
  total?: number
}

export type SvgImportOptions = {
  onProgress?: (progress: SvgImportProgress) => void
}

export function computeSvgImportProgress(progress: SvgImportProgress): number {
  if (progress.stage === 'parsing') {
    return 12
  }

  if (progress.stage === 'matrix-sampling') {
    if (progress.total && progress.total > 0 && progress.current !== undefined) {
      return 12 + Math.round((progress.current / progress.total) * 78)
    }

    return 25
  }

  return 95
}

export function formatSvgImportProgress(progress: SvgImportProgress): string {
  if (progress.stage === 'parsing') {
    return 'Parsing SVG structure…'
  }

  if (progress.stage === 'matrix-sampling') {
    if (progress.total && progress.total > 0 && progress.current !== undefined) {
      return `Sampling motion (${progress.current}/${progress.total} layers)…`
    }
    return 'Sampling motion paths…'
  }

  return 'Applying transforms…'
}

export async function importSvgAsync(
  raw: string,
  options?: SvgImportOptions,
): Promise<SvgImportResult | null> {
  options?.onProgress?.({ stage: 'parsing' })
  await waitForPaint()
  const deferMatrixSampling = true
  const parsed = parseSvgDocument(raw, deferMatrixSampling)
  if (!parsed) {
    return null
  }

  const useWorker = parsed.pendingMatrixSamples.length >= 300
  const duration = await finalizeMatrixSamples(
    parsed.layers,
    parsed.pendingMatrixSamples,
    raw,
    parsed.duration,
    useWorker,
    options?.onProgress,
  )

  return buildSvgImportResult(parsed, duration)
}

function collectSvgCssText(svg: SVGSVGElement): string {
  return [...svg.querySelectorAll('style')]
    .map((style) => style.textContent ?? '')
    .join('\n')
}

export function importCssAnimatedSvgProject(raw: string): Project | null {
  const parser = new DOMParser()
  const document = parser.parseFromString(raw, 'image/svg+xml')
  const parserError = document.querySelector('parsererror')
  if (parserError) {
    return null
  }

  const svg = document.querySelector('svg')
  if (!svg) {
    return null
  }

  expandSvgUses(svg)

  const css = collectSvgCssText(svg)
  const tracks = parseCssKeyframeTracks(css)
  if (tracks.size === 0) {
    return null
  }

  const staticImported = importSvg(svg.outerHTML)
  if (!staticImported) {
    return null
  }

  const baseProject = svgImportToProject(staticImported)
  const { layers: animatedLayers, duration: cssDuration } = buildLayersFromCssTracks(
    svg,
    css,
    baseProject.artboards[0]!.id,
    {
      parseShape: parseShapeElement,
      createLayer: (shape, index, artboardId, name, keyframes) => ({
        ...createLayerFromShape(shape, index, artboardId, name),
        keyframes,
      }),
    },
  )

  if (animatedLayers.length === 0) {
    return null
  }

  const resolvedDuration =
    cssDuration > 0 ? cssDuration : baseProject.duration > 0 ? baseProject.duration : 3

  return {
    ...baseProject,
    duration: resolvedDuration,
    loopOut: resolvedDuration,
    layers: mergeAnimatedKeyframesIntoStaticLayers(baseProject.layers, animatedLayers),
  }
}

export function importSvgAsProject(raw: string, options?: { staticOnly?: boolean }): Project | null {
  if (!options?.staticOnly) {
    const cssProject = importCssAnimatedSvgProject(raw)
    if (cssProject) {
      return cssProject
    }
  }

  const imported = importSvg(raw)
  if (!imported) {
    return null
  }

  return svgImportToProject(imported)
}

export function svgImportToProject(imported: SvgImportResult): Project {
  const artboard = createArtboard(imported.artboard)
  const duration = imported.duration > 0 ? imported.duration : 3
  const animatedLayerCount = imported.layers.filter(layerHasAnimation).length
  const hasImportedDefs =
    Object.keys(imported.gradients).length > 0 ||
    Object.keys(imported.masks).length > 0 ||
    Object.keys(imported.clipPaths).length > 0 ||
    Object.keys(imported.filters).length > 0

  return {
    ...createDefaultProject(),
    artboards: [artboard],
    duration,
    loopOut: duration,
    layers: createImportLayerIds(imported.layers, artboard.id),
    layerGroups: Object.keys(imported.groups).length > 0 ? imported.groups : undefined,
    importedSvg: hasImportedDefs
      ? {
          gradients: imported.gradients,
          ...(Object.keys(imported.masks).length > 0 ? { masks: imported.masks } : {}),
          ...(Object.keys(imported.clipPaths).length > 0 ? { clipPaths: imported.clipPaths } : {}),
          ...(Object.keys(imported.filters).length > 0 ? { filters: imported.filters } : {}),
        }
      : undefined,
    ...(animatedLayerCount > 0 ? { loopIn: 0 } : {}),
  }
}

export function getSvgImportSummary(imported: SvgImportResult): {
  layerCount: number
  animatedLayerCount: number
  duration: number
  gradientCount: number
  maskCount: number
  clipPathCount: number
  groupCount: number
} {
  return {
    layerCount: imported.layers.length,
    animatedLayerCount: imported.layers.filter(layerHasAnimation).length,
    duration: imported.duration > 0 ? imported.duration : 3,
    gradientCount: Object.keys(imported.gradients).length,
    maskCount: Object.keys(imported.masks).length,
    clipPathCount: Object.keys(imported.clipPaths).length,
    groupCount: Object.keys(imported.groups).length,
  }
}

export type OpenSvgFileResult =
  | { status: 'cancelled' }
  | { status: 'rejected'; fileName: string }
  | { status: 'ok'; value: SvgImportResult }

export async function readSvgImportFromFile(
  file: File,
  options?: SvgImportOptions,
): Promise<OpenSvgFileResult> {
  try {
    const text = await file.text()
    if (!isSvgFile(file) && !looksLikeSvgText(text)) {
      return { status: 'rejected', fileName: file.name }
    }

    const value = await importSvgAsync(text, options)
    if (!value) {
      return { status: 'rejected', fileName: file.name }
    }

    return { status: 'ok', value }
  } catch {
    return { status: 'rejected', fileName: file.name }
  }
}

export async function openSvgFile(options?: SvgImportOptions): Promise<OpenSvgFileResult> {
  const picked = await openFilePicker({
    validateText: (text, file) => isSvgFile(file) || looksLikeSvgText(text),
  })

  if (picked.status === 'cancelled') {
    return { status: 'cancelled' }
  }

  if (picked.status === 'rejected') {
    return { status: 'rejected', fileName: picked.file.name }
  }

  return readSvgImportFromFile(picked.file, options)
}

export function createImportLayerIds(layers: Layer[], artboardId: string): Layer[] {
  return layers.map((layer) => ({
    ...layer,
    artboardId,
    id: createId(),
    shape: {
      ...layer.shape,
      id: createId(),
    },
    keyframes: layer.keyframes.map((keyframe) => ({
      ...keyframe,
      id: createId(),
    })),
    matrixKeyframes: layer.matrixKeyframes?.map((keyframe) => ({ ...keyframe })),
    svgMaskId: layer.svgMaskId,
    svgClipPathId: layer.svgClipPathId,
    svgFilterId: layer.svgFilterId,
  }))
}
