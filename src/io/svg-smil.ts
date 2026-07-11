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
    return tag === 'animatetransform' || tag === 'animate'
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
    }
  }

  return matrix
}

export function effectiveMatrixAtTime(node: Element, time: number): AffineMatrix {
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
      if (tag !== 'animatetransform' && tag !== 'animate') {
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
