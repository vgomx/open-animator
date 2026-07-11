import { normalizePathShape } from '@/editor/path-nodes'
import {
  createEllipseShape,
  createId,
  createLayerFromShape,
  createPathShape,
  createRectShape,
  createTextShape,
} from '@/editor/scene'
import type { Layer, PathPoint, Project, Shape, TextShape } from '@/editor/types'
import { createArtboard } from '@/editor/types'
import { createDefaultProject } from '@/editor/scene'
import {
  isSvgFile,
  looksLikeSvgText,
  openFilePicker,
} from '@/io/file-picker'
import { SHAPE_FILL_SECONDARY } from '@/lib/brand-colors'

type SvgStyle = {
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
}

type TransformState = {
  x: number
  y: number
  rotation: number
  scale: number
}

export type SvgImportResult = {
  layers: Layer[]
  artboard: { width: number; height: number }
}

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  none: 'none',
  transparent: 'transparent',
}

function parseNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function parseSvgColor(raw: string | null | undefined, fallback = '#000000'): string {
  if (!raw) {
    return fallback
  }

  const trimmed = raw.trim().toLowerCase()
  if (trimmed in NAMED_COLORS) {
    return NAMED_COLORS[trimmed]!
  }

  if (trimmed === 'none' || trimmed === 'transparent') {
    return 'none'
  }

  if (trimmed.startsWith('#')) {
    return trimmed
  }

  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/)
  if (rgbMatch) {
    const channels = rgbMatch[1]!
      .split(',')
      .map((part) => Number.parseFloat(part.trim()))
      .filter((value) => Number.isFinite(value))

    if (channels.length >= 3) {
      const toHex = (value: number) =>
        Math.max(0, Math.min(255, Math.round(value)))
          .toString(16)
          .padStart(2, '0')
      return `#${toHex(channels[0]!)}${toHex(channels[1]!)}${toHex(channels[2]!)}`
    }
  }

  return fallback
}

function readStyle(element: Element, inherited: SvgStyle): SvgStyle {
  const fill = element.getAttribute('fill')
  const stroke = element.getAttribute('stroke')
  const strokeWidth = element.getAttribute('stroke-width')
  const opacity = element.getAttribute('opacity')

  return {
    fill: fill ? parseSvgColor(fill, inherited.fill) : inherited.fill,
    stroke: stroke ? parseSvgColor(stroke, inherited.stroke) : inherited.stroke,
    strokeWidth: strokeWidth ? parseNumber(strokeWidth, inherited.strokeWidth) : inherited.strokeWidth,
    opacity: opacity ? parseNumber(opacity, inherited.opacity) : inherited.opacity,
  }
}

function parseTransform(attr: string | null): TransformState {
  const state: TransformState = { x: 0, y: 0, rotation: 0, scale: 1 }
  if (!attr) {
    return state
  }

  const translateMatch = attr.match(/translate\(([^)]+)\)/)
  if (translateMatch) {
    const parts = translateMatch[1]!.split(/[\s,]+/).map((part) => Number.parseFloat(part))
    state.x += parts[0] ?? 0
    state.y += parts[1] ?? 0
  }

  const rotateMatch = attr.match(/rotate\(([^)]+)\)/)
  if (rotateMatch) {
    const parts = rotateMatch[1]!.split(/[\s,]+/).map((part) => Number.parseFloat(part))
    state.rotation += parts[0] ?? 0
  }

  const scaleMatch = attr.match(/scale\(([^)]+)\)/)
  if (scaleMatch) {
    const parts = scaleMatch[1]!.split(/[\s,]+/).map((part) => Number.parseFloat(part))
    const scaleX = parts[0] ?? 1
    const scaleY = parts[1] ?? scaleX
    state.scale *= (scaleX + scaleY) / 2
  }

  return state
}

function applyTransform(shape: Shape, transform: TransformState): Shape {
  const next = {
    ...shape,
    x: shape.x + transform.x,
    y: shape.y + transform.y,
    rotation: shape.rotation + transform.rotation,
    scale: shape.scale * transform.scale,
  }

  if (shape.type === 'path') {
    return {
      ...next,
      type: 'path',
      points: shape.points.map((point) => ({
        ...point,
        x: point.x + transform.x,
        y: point.y + transform.y,
        handleIn: point.handleIn
          ? { x: point.handleIn.x + transform.x, y: point.handleIn.y + transform.y }
          : point.handleIn,
        handleOut: point.handleOut
          ? { x: point.handleOut.x + transform.x, y: point.handleOut.y + transform.y }
          : point.handleOut,
      })),
      closed: shape.closed,
    }
  }

  return next
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

function elementToShape(element: Element, style: SvgStyle, transform: TransformState): Shape | null {
  const tag = element.tagName.toLowerCase()

  if (tag === 'rect') {
    const x = parseNumber(element.getAttribute('x'))
    const y = parseNumber(element.getAttribute('y'))
    const width = parseNumber(element.getAttribute('width'), 1)
    const height = parseNumber(element.getAttribute('height'), 1)
    return applyTransform(applyStyle(createRectShape(x, y, width, height), style), transform)
  }

  if (tag === 'circle') {
    const cx = parseNumber(element.getAttribute('cx'))
    const cy = parseNumber(element.getAttribute('cy'))
    const r = parseNumber(element.getAttribute('r'), 1)
    const shape = createEllipseShape(cx - r, cy - r, r * 2, r * 2)
    return applyTransform(applyStyle(shape, style), transform)
  }

  if (tag === 'ellipse') {
    const cx = parseNumber(element.getAttribute('cx'))
    const cy = parseNumber(element.getAttribute('cy'))
    const rx = parseNumber(element.getAttribute('rx'), 1)
    const ry = parseNumber(element.getAttribute('ry'), rx)
    const shape = createEllipseShape(cx - rx, cy - ry, rx * 2, ry * 2)
    return applyTransform(applyStyle(shape, style), transform)
  }

  if (tag === 'text') {
    const x = parseNumber(element.getAttribute('x'))
    const y = parseNumber(element.getAttribute('y'))
    const text = element.textContent?.trim() || 'Text'
    const fontSize = parseNumber(element.getAttribute('font-size'), 24)
    const fontFamily = element.getAttribute('font-family') || 'Geist, system-ui, sans-serif'
    const base = createTextShape(x, y)
    const styled = applyStyle(base, style) as TextShape
    return applyTransform(
      {
        ...styled,
        text,
        fontSize,
        fontFamily,
      },
      transform,
    )
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

    const pathShape = normalizePathShape(createPathShape(points, closed))
    return applyTransform(applyStyle(pathShape, style), transform)
  }

  if (tag === 'line') {
    const x1 = parseNumber(element.getAttribute('x1'))
    const y1 = parseNumber(element.getAttribute('y1'))
    const x2 = parseNumber(element.getAttribute('x2'))
    const y2 = parseNumber(element.getAttribute('y2'))
    const pathShape = normalizePathShape(
      createPathShape(
        [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ],
        false,
      ),
    )
    return applyTransform(applyStyle(pathShape, style), transform)
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
      pathPoints.push({ x, y })
    }

    if (pathPoints.length < 2) {
      return null
    }

    const pathShape = normalizePathShape(createPathShape(pathPoints, tag === 'polygon'))
    return applyTransform(applyStyle(pathShape, style), transform)
  }

  return null
}

function collectLayers(
  node: Element,
  inheritedStyle: SvgStyle,
  inheritedTransform: TransformState,
  layers: Layer[],
  startIndex: number,
): number {
  let nextIndex = startIndex
  const tag = node.tagName.toLowerCase()

  if (tag === 'defs' || tag === 'style' || tag === 'metadata') {
    return nextIndex
  }

  const style = readStyle(node, inheritedStyle)
  const localTransform = parseTransform(node.getAttribute('transform'))
  const transform: TransformState = {
    x: inheritedTransform.x + localTransform.x,
    y: inheritedTransform.y + localTransform.y,
    rotation: inheritedTransform.rotation + localTransform.rotation,
    scale: inheritedTransform.scale * localTransform.scale,
  }

  if (tag === 'g' || tag === 'svg') {
    for (const child of [...node.children]) {
      nextIndex = collectLayers(child, style, transform, layers, nextIndex)
    }
    return nextIndex
  }

  const shape = elementToShape(node, style, { x: 0, y: 0, rotation: 0, scale: 1 })
  if (!shape) {
    return nextIndex
  }

  const finalShape = applyTransform(shape, transform)
  const name = node.getAttribute('id') || node.getAttribute('data-name') || `${tag}-${nextIndex + 1}`
  layers.push(createLayerFromShape(finalShape, nextIndex, name))
  return nextIndex + 1
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

export function parseShapeElement(element: Element): Shape | null {
  const defaultStyle: SvgStyle = {
    fill: SHAPE_FILL_SECONDARY,
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
  }
  const style = readStyle(element, defaultStyle)
  return elementToShape(element, style, { x: 0, y: 0, rotation: 0, scale: 1 })
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

export function importSvg(raw: string): SvgImportResult | null {
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

  const defaultStyle: SvgStyle = {
    fill: SHAPE_FILL_SECONDARY,
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
  }

  const layers: Layer[] = []
  collectLayers(svg, defaultStyle, { x: 0, y: 0, rotation: 0, scale: 1 }, layers, 0)

  if (layers.length === 0) {
    return null
  }

  return {
    layers,
    artboard: readArtboard(svg),
  }
}

export function importSvgAsProject(raw: string): Project | null {
  const imported = importSvg(raw)
  if (!imported) {
    return null
  }

  return svgImportToProject(imported)
}

export function svgImportToProject(imported: SvgImportResult): Project {
  const artboard = createArtboard(imported.artboard)
  return {
    ...createDefaultProject(),
    artboards: [artboard],
    layers: createImportLayerIds(imported.layers, artboard.id),
  }
}

export type OpenSvgFileResult =
  | { status: 'cancelled' }
  | { status: 'rejected'; fileName: string }
  | { status: 'ok'; value: SvgImportResult }

export async function openSvgFile(): Promise<OpenSvgFileResult> {
  const picked = await openFilePicker({
    validateText: (text, file) => isSvgFile(file) || looksLikeSvgText(text),
  })

  if (picked.status === 'cancelled') {
    return { status: 'cancelled' }
  }

  if (picked.status === 'rejected') {
    return { status: 'rejected', fileName: picked.file.name }
  }

  try {
    const value = importSvg(picked.text)
    if (!value) {
      return { status: 'rejected', fileName: picked.file.name }
    }

    return { status: 'ok', value }
  } catch {
    return { status: 'rejected', fileName: picked.file.name }
  }
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
  }))
}
