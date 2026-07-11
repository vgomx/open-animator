import { createId } from '@/editor/scene'
import type { Keyframe } from '@/editor/types'
import {
  type AffineMatrix,
  IDENTITY_MATRIX,
  decomposeMatrix,
  invertMatrix,
  multiplyMatrix,
  parseTransformAttribute,
} from '@/io/svg-transform'

function parseDurationMs(raw: string | null | undefined): number {
  if (!raw) {
    return 0
  }

  const trimmed = raw.trim().toLowerCase()
  if (trimmed.endsWith('ms')) {
    return Number.parseFloat(trimmed) / 1000
  }

  if (trimmed.endsWith('s')) {
    return Number.parseFloat(trimmed)
  }

  const parsed = Number.parseFloat(trimmed)
  return Number.isFinite(parsed) ? parsed : 0
}

function parsePair(raw: string): { x: number; y: number } | null {
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part))
    .filter((value) => Number.isFinite(value))

  if (parts.length < 2) {
    return null
  }

  return { x: parts[0]!, y: parts[1]! }
}

function lerpPair(
  from: { x: number; y: number },
  to: { x: number; y: number },
  progress: number,
): { x: number; y: number } {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
  }
}

function translateMatrix(x: number, y: number): AffineMatrix {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y }
}

function scaleMatrix(scaleX: number, scaleY: number): AffineMatrix {
  return { a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 }
}

function parseRotateSpec(raw: string): { angle: number; cx: number; cy: number } | null {
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseFloat(part))
    .filter((value) => Number.isFinite(value))

  if (parts.length === 0) {
    return null
  }

  if (parts.length === 1) {
    return { angle: parts[0]!, cx: 0, cy: 0 }
  }

  if (parts.length >= 3) {
    return { angle: parts[0]!, cx: parts[1]!, cy: parts[2]! }
  }

  return { angle: parts[0]!, cx: parts[1]!, cy: 0 }
}

function lerpRotate(
  from: { angle: number; cx: number; cy: number },
  to: { angle: number; cx: number; cy: number },
  progress: number,
): { angle: number; cx: number; cy: number } {
  return {
    angle: from.angle + (to.angle - from.angle) * progress,
    cx: from.cx + (to.cx - from.cx) * progress,
    cy: from.cy + (to.cy - from.cy) * progress,
  }
}

function rotateMatrix(angleDeg: number, cx = 0, cy = 0): AffineMatrix {
  const angle = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const rotate = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
  const toOrigin = translateMatrix(-cx, -cy)
  const back = translateMatrix(cx, cy)
  return multiplyMatrix(back, multiplyMatrix(rotate, toOrigin))
}

function sampleRotateAnimateTransform(element: Element, progress: number): AffineMatrix {
  const valuesAttr = element.getAttribute('values')

  if (valuesAttr) {
    const specs = valuesAttr
      .split(';')
      .map(parseRotateSpec)
      .filter((spec): spec is { angle: number; cx: number; cy: number } => spec !== null)

    if (specs.length === 1) {
      const spec = specs[0]!
      return rotateMatrix(spec.angle, spec.cx, spec.cy)
    }

    if (specs.length > 1) {
      const scaled = progress * (specs.length - 1)
      const index = Math.min(specs.length - 2, Math.floor(scaled))
      const localProgress = scaled - index
      const spec = lerpRotate(specs[index]!, specs[index + 1]!, localProgress)
      return rotateMatrix(spec.angle, spec.cx, spec.cy)
    }
  }

  const from = parseRotateSpec(element.getAttribute('from') ?? '')
  const to = parseRotateSpec(element.getAttribute('to') ?? '')
  if (from && to) {
    const spec = lerpRotate(from, to, progress)
    return rotateMatrix(spec.angle, spec.cx, spec.cy)
  }

  if (from) {
    return rotateMatrix(from.angle, from.cx, from.cy)
  }

  return IDENTITY_MATRIX
}

function parseMotionPath(raw: string): Array<{ x: number; y: number }> {
  const trimmed = raw.trim()
  if (!trimmed || /^url\(/i.test(trimmed)) {
    return []
  }

  const points: Array<{ x: number; y: number }> = []
  const tokens = trimmed.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []
  let index = 0
  let currentX = 0
  let currentY = 0
  let command = ''
  let pendingLine = false

  const readNumber = () => {
    const value = Number.parseFloat(tokens[index] ?? '0')
    index += 1
    return Number.isFinite(value) ? value : 0
  }

  const pushPoint = (x: number, y: number) => {
    currentX = x
    currentY = y
    points.push({ x, y })
  }

  while (index < tokens.length) {
    const token = tokens[index]!
    if (/^[a-zA-Z]$/.test(token)) {
      command = token
      index += 1
      pendingLine = false
    } else if (command === '' || pendingLine) {
      command = pendingLine ? command : 'L'
    }

    const relative = command === command.toLowerCase() && command !== 'Z' && command !== 'z'
    const upper = command.toUpperCase()
    pendingLine = upper === 'M'

    if (upper === 'M' || upper === 'L') {
      const x = readNumber()
      const y = readNumber()
      pushPoint(relative ? currentX + x : x, relative ? currentY + y : y)
      continue
    }

    if (upper === 'H') {
      const x = readNumber()
      pushPoint(relative ? currentX + x : x, currentY)
      continue
    }

    if (upper === 'V') {
      const y = readNumber()
      pushPoint(currentX, relative ? currentY + y : y)
      continue
    }

    if (upper === 'Q') {
      readNumber()
      readNumber()
      const x = readNumber()
      const y = readNumber()
      pushPoint(relative ? currentX + x : x, relative ? currentY + y : y)
      continue
    }

    if (upper === 'C') {
      readNumber()
      readNumber()
      readNumber()
      readNumber()
      const x = readNumber()
      const y = readNumber()
      pushPoint(relative ? currentX + x : x, relative ? currentY + y : y)
      continue
    }

    if (upper === 'Z') {
      if (points.length > 0) {
        points.push({ ...points[0]! })
      }
      continue
    }

    index += 1
  }

  return points
}

function samplePointOnPath(points: Array<{ x: number; y: number }>, progress: number): { x: number; y: number } {
  if (points.length === 0) {
    return { x: 0, y: 0 }
  }

  if (points.length === 1) {
    return points[0]!
  }

  const segments: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; length: number }> = []
  let totalLength = 0

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!
    const to = points[index]!
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    segments.push({ from, to, length })
    totalLength += length
  }

  if (totalLength <= 0) {
    return points[0]!
  }

  const target = Math.max(0, Math.min(1, progress)) * totalLength
  let walked = 0

  for (const segment of segments) {
    if (walked + segment.length >= target) {
      const local = segment.length === 0 ? 0 : (target - walked) / segment.length
      return lerpPair(segment.from, segment.to, local)
    }
    walked += segment.length
  }

  return points[points.length - 1]!
}

function resolveFragmentRef(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  const trimmed = raw.trim()
  if (trimmed.startsWith('#')) {
    return trimmed.slice(1)
  }

  const match = trimmed.match(/^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/i)
  return match ? match[1]! : null
}

function pathDataFromReferencedElement(element: Element | null): string | null {
  if (!element) {
    return null
  }

  const tag = element.tagName.toLowerCase()
  if (tag === 'path') {
    return element.getAttribute('d')
  }

  const nestedPath = element.querySelector('path')
  return nestedPath?.getAttribute('d') ?? null
}

function resolveMotionPath(element: Element): Array<{ x: number; y: number }> {
  const pathAttr = element.getAttribute('path')
  if (pathAttr && !/^url\(/i.test(pathAttr.trim())) {
    return parseMotionPath(pathAttr)
  }

  const directRef = resolveFragmentRef(
    element.getAttribute('href') ?? element.getAttribute('xlink:href'),
  )
  if (directRef) {
    const pathData = pathDataFromReferencedElement(element.ownerDocument?.getElementById(directRef) ?? null)
    if (pathData) {
      return parseMotionPath(pathData)
    }
  }

  for (const child of [...element.children]) {
    if (child.tagName.toLowerCase() !== 'mpath') {
      continue
    }

    const mpathRef = resolveFragmentRef(child.getAttribute('href') ?? child.getAttribute('xlink:href'))
    if (!mpathRef) {
      continue
    }

    const pathData = pathDataFromReferencedElement(element.ownerDocument?.getElementById(mpathRef) ?? null)
    if (pathData) {
      return parseMotionPath(pathData)
    }
  }

  return []
}

let matrixTimeCache: WeakMap<Element, Map<number, AffineMatrix>> | null = null

export function beginMatrixTimeCache(): void {
  matrixTimeCache = new WeakMap()
}

export function endMatrixTimeCache(): void {
  matrixTimeCache = null
}

function sampleAnimateMotion(element: Element, time: number): AffineMatrix {
  const duration = parseDurationMs(element.getAttribute('dur'))
  if (duration <= 0) {
    return IDENTITY_MATRIX
  }

  const clampedTime = Math.min(Math.max(time, 0), duration)
  const progress = duration === 0 ? 0 : clampedTime / duration
  const points = resolveMotionPath(element)
  if (points.length === 0) {
    return IDENTITY_MATRIX
  }

  const start = points[0]!
  const point = samplePointOnPath(points, progress)
  const additive = (element.getAttribute('additive') ?? '').toLowerCase() === 'sum'

  if (additive) {
    return translateMatrix(point.x - start.x, point.y - start.y)
  }

  return translateMatrix(point.x, point.y)
}

function sampleAnimateTransform(element: Element, time: number): AffineMatrix {
  const tag = element.tagName.toLowerCase()
  const duration = parseDurationMs(element.getAttribute('dur'))
  if (duration <= 0) {
    return IDENTITY_MATRIX
  }

  const clampedTime = Math.min(Math.max(time, 0), duration)
  const progress = duration === 0 ? 0 : clampedTime / duration

  if (tag === 'animatetransform') {
    const type = (element.getAttribute('type') ?? 'translate').toLowerCase()

    if (type === 'rotate') {
      return sampleRotateAnimateTransform(element, progress)
    }

    const valuesAttr = element.getAttribute('values')

    if (valuesAttr) {
      const pairs = valuesAttr
        .split(';')
        .map(parsePair)
        .filter((pair): pair is { x: number; y: number } => pair !== null)

      if (pairs.length === 1) {
        const pair = pairs[0]!
        if (type === 'scale') {
          return scaleMatrix(pair.x, pair.y)
        }
        return translateMatrix(pair.x, pair.y)
      }

      if (pairs.length > 1) {
        const scaled = progress * (pairs.length - 1)
        const index = Math.min(pairs.length - 2, Math.floor(scaled))
        const localProgress = scaled - index
        const from = pairs[index]!
        const to = pairs[index + 1]!
        const pair = lerpPair(from, to, localProgress)

        if (type === 'scale') {
          return scaleMatrix(pair.x, pair.y)
        }
        return translateMatrix(pair.x, pair.y)
      }
    }

    const from = parsePair(element.getAttribute('from') ?? '')
    const to = parsePair(element.getAttribute('to') ?? '')
    if (from && to) {
      const pair = lerpPair(from, to, progress)
      if (type === 'scale') {
        return scaleMatrix(pair.x, pair.y)
      }
      return translateMatrix(pair.x, pair.y)
    }

    if (from) {
      if (type === 'scale') {
        return scaleMatrix(from.x, from.y)
      }
      return translateMatrix(from.x, from.y)
    }
  }

  if (tag === 'animate' && element.getAttribute('attributeName') === 'transform') {
    const from = parsePair(element.getAttribute('from') ?? '')
    const to = parsePair(element.getAttribute('to') ?? '')
    if (from && to) {
      const pair = lerpPair(from, to, progress)
      return translateMatrix(pair.x, pair.y)
    }
  }

  return IDENTITY_MATRIX
}

function hasSmilChildren(element: Element): boolean {
  return [...element.children].some((child) => {
    const tag = child.tagName.toLowerCase()
    return tag === 'animatetransform' || tag === 'animate' || tag === 'animatemotion'
  })
}

function matricesApproximatelyEqual(
  left: AffineMatrix,
  right: AffineMatrix,
  tolerance = 0.5,
): boolean {
  return (
    Math.abs(left.a - right.a) <= tolerance &&
    Math.abs(left.b - right.b) <= tolerance &&
    Math.abs(left.c - right.c) <= tolerance &&
    Math.abs(left.d - right.d) <= tolerance &&
    Math.abs(left.e - right.e) <= tolerance &&
    Math.abs(left.f - right.f) <= tolerance
  )
}

/**
 * Expressive Animator sometimes duplicates a static transform as sibling
 * animateTransform nodes (static ≈ smil(0)). Use animated smil only in that case;
 * otherwise compose static * smil(t) per SVG.
 */
function shouldUseSmilInsteadOfStatic(element: Element): boolean {
  if (!hasSmilChildren(element)) {
    return false
  }

  const staticMatrix = parseTransformAttribute(element.getAttribute('transform'))
  const smilAtZero = evaluateSmilTransforms(element, 0)
  return matricesApproximatelyEqual(staticMatrix, smilAtZero)
}

export function evaluateSmilTransforms(element: Element, time: number): AffineMatrix {
  let matrix = IDENTITY_MATRIX

  for (const child of [...element.children]) {
    const tag = child.tagName.toLowerCase()
    if (tag === 'animatetransform' || tag === 'animate') {
      matrix = multiplyMatrix(matrix, sampleAnimateTransform(child, time))
      continue
    }

    if (tag === 'animatemotion') {
      matrix = multiplyMatrix(matrix, sampleAnimateMotion(child, time))
    }
  }

  return matrix
}

export function effectiveMatrixAtTime(node: Element, time: number): AffineMatrix {
  const cache = matrixTimeCache
  if (cache) {
    let times = cache.get(node)
    if (!times) {
      times = new Map()
      cache.set(node, times)
    }

    const cached = times.get(time)
    if (cached) {
      return cached
    }

    const computed = computeEffectiveMatrixAtTime(node, time)
    times.set(time, computed)
    return computed
  }

  return computeEffectiveMatrixAtTime(node, time)
}

function computeEffectiveMatrixAtTime(node: Element, time: number): AffineMatrix {
  const chain: Element[] = []
  let current: Element | null = node

  while (current && current.tagName.toLowerCase() !== 'svg') {
    chain.push(current)
    current = current.parentElement
  }

  chain.reverse()

  let matrix = IDENTITY_MATRIX
  for (const element of chain) {
    const staticMatrix = parseTransformAttribute(element.getAttribute('transform'))

    if (shouldUseSmilInsteadOfStatic(element)) {
      matrix = multiplyMatrix(matrix, evaluateSmilTransforms(element, time))
      continue
    }

    matrix = multiplyMatrix(matrix, staticMatrix)
    if (hasSmilChildren(element)) {
      matrix = multiplyMatrix(matrix, evaluateSmilTransforms(element, time))
    }
  }

  return matrix
}

function addUniformSampleTimes(times: Set<number>, duration: number, sampleCount = 13): void {
  if (duration <= 0 || sampleCount < 2) {
    return
  }

  for (let index = 0; index < sampleCount; index += 1) {
    times.add((index / (sampleCount - 1)) * duration)
  }
}

function collectSampleTimes(node: Element): number[] {
  const times = new Set<number>([0])
  let current: Element | null = node

  while (current && current.tagName.toLowerCase() !== 'svg') {
    for (const child of [...current.children]) {
      const tag = child.tagName.toLowerCase()
      if (tag !== 'animatetransform' && tag !== 'animate' && tag !== 'animatemotion') {
        continue
      }

      const duration = parseDurationMs(child.getAttribute('dur'))
      if (duration <= 0) {
        continue
      }

      times.add(duration)

      const valuesAttr = child.getAttribute('values')
      if (valuesAttr) {
        const valueCount = valuesAttr.split(';').length
        if (valueCount > 1) {
          for (let index = 1; index < valueCount - 1; index += 1) {
            times.add((index / (valueCount - 1)) * duration)
          }
        }
      } else if (child.getAttribute('from') && child.getAttribute('to')) {
        times.add(duration / 2)
      }
    }

    current = current.parentElement
  }

  const sorted = [...times].sort((left, right) => left - right)
  const duration = sorted[sorted.length - 1] ?? 0
  addUniformSampleTimes(times, duration)

  return [...times].sort((left, right) => left - right)
}

const IDENTITY_DECOMPOSED = { x: 0, y: 0, rotation: 0, scale: 1 }

function matrixKeyframeHasMotion(
  keyframes: Array<{ time: number; a: number; b: number; c: number; d: number; e: number; f: number }>,
): boolean {
  if (keyframes.length <= 1) {
    return false
  }

  const first = keyframes[0]!
  return keyframes.some(
    (keyframe) =>
      Math.abs(keyframe.a - first.a) > 0.001 ||
      Math.abs(keyframe.b - first.b) > 0.001 ||
      Math.abs(keyframe.c - first.c) > 0.001 ||
      Math.abs(keyframe.d - first.d) > 0.001 ||
      Math.abs(keyframe.e - first.e) > 0.5 ||
      Math.abs(keyframe.f - first.f) > 0.5,
  )
}

function collapseStaticMatrixKeyframes(
  keyframes: Array<{ time: number; a: number; b: number; c: number; d: number; e: number; f: number }>,
  duration: number,
): {
  keyframes: Array<{ time: number; a: number; b: number; c: number; d: number; e: number; f: number }>
  duration: number
} {
  if (!matrixKeyframeHasMotion(keyframes)) {
    return { keyframes: keyframes.slice(0, 1), duration: 0 }
  }

  return { keyframes, duration }
}

export function collectMatrixKeyframesForNode(node: Element): {
  keyframes: Array<{ time: number; a: number; b: number; c: number; d: number; e: number; f: number }>
  duration: number
} {
  const sampleTimes = collectSampleTimes(node)
  const duration = sampleTimes[sampleTimes.length - 1] ?? 0

  const times = duration > 0 && sampleTimes.length > 1 ? sampleTimes : [0]

  const keyframes = times.map((time) => {
    const matrix = effectiveMatrixAtTime(node, time)
    return {
      time,
      a: matrix.a,
      b: matrix.b,
      c: matrix.c,
      d: matrix.d,
      e: matrix.e,
      f: matrix.f,
    }
  })

  const resolvedDuration = duration > 0 && sampleTimes.length > 1 ? duration : 0
  return collapseStaticMatrixKeyframes(keyframes, resolvedDuration)
}

export function collectTransformKeyframesForNode(
  node: Element,
  baseMatrix: AffineMatrix,
): {
  keyframes: Keyframe[]
  duration: number
} {
  const sampleTimes = collectSampleTimes(node)
  const duration = sampleTimes[sampleTimes.length - 1] ?? 0
  if (duration <= 0 || sampleTimes.length <= 1) {
    return { keyframes: [], duration: 0 }
  }

  const baseInverse = invertMatrix(baseMatrix)
  if (!baseInverse) {
    return { keyframes: [], duration: 0 }
  }

  const keyframes: Keyframe[] = []

  const addKeyframe = (
    time: number,
    property: 'x' | 'y' | 'rotation' | 'scale',
    value: number,
  ) => {
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

  for (const time of sampleTimes) {
    if (time === 0) {
      continue
    }

    const delta = multiplyMatrix(effectiveMatrixAtTime(node, time), baseInverse)
    const decomposed = decomposeMatrix(delta)

    if (Math.abs(decomposed.x - IDENTITY_DECOMPOSED.x) > 0.001) {
      addKeyframe(0, 'x', IDENTITY_DECOMPOSED.x)
      addKeyframe(time, 'x', decomposed.x)
    }
    if (Math.abs(decomposed.y - IDENTITY_DECOMPOSED.y) > 0.001) {
      addKeyframe(0, 'y', IDENTITY_DECOMPOSED.y)
      addKeyframe(time, 'y', decomposed.y)
    }
    if (Math.abs(decomposed.rotation - IDENTITY_DECOMPOSED.rotation) > 0.001) {
      addKeyframe(0, 'rotation', IDENTITY_DECOMPOSED.rotation)
      addKeyframe(time, 'rotation', decomposed.rotation)
    }
    if (Math.abs(decomposed.scale - IDENTITY_DECOMPOSED.scale) > 0.001) {
      addKeyframe(0, 'scale', IDENTITY_DECOMPOSED.scale)
      addKeyframe(time, 'scale', decomposed.scale)
    }
  }

  return { keyframes, duration }
}

export function applyDecomposedMatrixToShape<T extends { x: number; y: number; rotation: number; scale: number }>(
  shape: T,
  matrix: AffineMatrix,
): T {
  const decomposed = decomposeMatrix(matrix)
  return {
    ...shape,
    x: decomposed.x,
    y: decomposed.y,
    rotation: decomposed.rotation,
    scale: decomposed.scale,
  }
}
