import type {
  AnimatableProperty,
  BezierHandle,
  ColorAnimatableProperty,
  EasingType,
  Keyframe,
  Layer,
  MatrixKeyframe,
  NumericAnimatableProperty,
  Shape,
} from '@/editor/types'
import {
  applyGroupTransformsToShape,
  layerHasGroupAnimation,
  type AnimatedShapeContext,
} from '@/editor/group-animation'
export type { AnimatedShapeContext } from '@/editor/group-animation'
import { sampleEasing } from '@/editor/easing'
import { layerHasAnimation } from '@/editor/layer-animation'
import type { AffineMatrix } from '@/io/svg-transform'

type KeyframeTracks = Map<AnimatableProperty, Keyframe[]>

const animatedShapeCache = new WeakMap<Layer, { time: number; shape: Shape }>()
const layerKeyframeTracksCache = new WeakMap<
  Layer,
  { keyframesRef: Keyframe[]; tracks: KeyframeTracks }
>()

function getLayerKeyframeTracks(layer: Layer): KeyframeTracks | null {
  const { keyframes } = layer
  if (keyframes.length === 0) {
    return null
  }

  const cached = layerKeyframeTracksCache.get(layer)
  if (cached && cached.keyframesRef === keyframes) {
    return cached.tracks
  }

  const tracks = buildKeyframeTracks(keyframes)
  layerKeyframeTracksCache.set(layer, { keyframesRef: keyframes, tracks })
  return tracks
}

function buildKeyframeTracks(keyframes: Keyframe[]): KeyframeTracks {
  const tracks: KeyframeTracks = new Map()

  for (const keyframe of keyframes) {
    const track = tracks.get(keyframe.property)
    if (track) {
      track.push(keyframe)
    } else {
      tracks.set(keyframe.property, [keyframe])
    }
  }

  for (const track of tracks.values()) {
    track.sort((left, right) => left.time - right.time)
  }

  return tracks
}

function getTrack(tracks: KeyframeTracks, property: AnimatableProperty): Keyframe[] {
  return tracks.get(property) ?? []
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function applyEasing(
  progress: number,
  easing: EasingType = 'linear',
  bezier?: BezierHandle,
): number {
  return sampleEasing(progress, easing, bezier)
}

export function getKeyframesForProperty(
  keyframes: Keyframe[],
  property: AnimatableProperty,
): Keyframe[] {
  return keyframes
    .filter((keyframe) => keyframe.property === property)
    .sort((a, b) => a.time - b.time)
}

function sampleSegmentValue(
  track: Keyframe[],
  time: number,
  fallback: number,
  interpolate: (current: Keyframe, next: Keyframe, easedProgress: number) => number,
): number {
  if (track.length === 0) {
    return fallback
  }

  const firstValue = track[0].value
  if (typeof firstValue !== 'number') {
    return fallback
  }

  if (time <= track[0].time) {
    return firstValue
  }

  const lastKeyframe = track[track.length - 1]
  const lastValue = lastKeyframe.value
  if (time >= lastKeyframe.time && typeof lastValue === 'number') {
    return lastValue
  }

  for (let index = 0; index < track.length - 1; index += 1) {
    const current = track[index]
    const next = track[index + 1]

    if (time >= current.time && time <= next.time) {
      const span = next.time - current.time
      if (span === 0 || typeof current.value !== 'number' || typeof next.value !== 'number') {
        return typeof next.value === 'number' ? next.value : fallback
      }

      const progress = (time - current.time) / span
      if (current.easing === 'hold') {
        return time < next.time ? (current.value as number) : (next.value as number)
      }

      const eased = applyEasing(progress, current.easing, current.bezier)
      return interpolate(current, next, eased)
    }
  }

  return fallback
}

export function samplePropertyAtTime(
  keyframes: Keyframe[],
  property: NumericAnimatableProperty,
  time: number,
  fallback: number,
): number {
  const track = getKeyframesForProperty(keyframes, property)
  return sampleNumericTrackAtTime(track, time, fallback)
}

export function sampleNumericTrackAtTime(track: Keyframe[], time: number, fallback: number): number {
  return sampleSegmentValue(track, time, fallback, (current, next, eased) =>
    lerp(current.value as number, next.value as number, eased),
  )
}

function normalizeHex(color: string): string {
  const value = color.trim().replace('#', '')
  if (value.length === 3) {
    return value
      .split('')
      .map((char) => char + char)
      .join('')
  }

  return value.padStart(6, '0').slice(0, 6)
}

export function parseColor(color: string): [number, number, number] {
  const normalized = normalizeHex(color)
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}

export function formatColor([r, g, b]: [number, number, number]): string {
  const toHex = (channel: number) =>
    Math.round(Math.max(0, Math.min(255, channel)))
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function lerpColor(from: string, to: string, progress: number): string {
  const [r1, g1, b1] = parseColor(from)
  const [r2, g2, b2] = parseColor(to)

  return formatColor([
    lerp(r1, r2, progress),
    lerp(g1, g2, progress),
    lerp(b1, b2, progress),
  ])
}

export function sampleColorAtTime(
  keyframes: Keyframe[],
  property: ColorAnimatableProperty,
  time: number,
  fallback: string,
): string {
  const track = getKeyframesForProperty(keyframes, property)
  return sampleColorTrackAtTime(track, time, fallback)
}

function sampleColorTrackAtTime(track: Keyframe[], time: number, fallback: string): string {

  if (track.length === 0) {
    return fallback
  }

  const firstValue = track[0].value
  if (typeof firstValue !== 'string') {
    return fallback
  }

  if (time <= track[0].time) {
    return firstValue
  }

  const lastKeyframe = track[track.length - 1]
  const lastValue = lastKeyframe.value
  if (time >= lastKeyframe.time && typeof lastValue === 'string') {
    return lastValue
  }

  for (let index = 0; index < track.length - 1; index += 1) {
    const current = track[index]
    const next = track[index + 1]

    if (time >= current.time && time <= next.time) {
      const span = next.time - current.time
      if (
        span === 0 ||
        typeof current.value !== 'string' ||
        typeof next.value !== 'string'
      ) {
        return typeof next.value === 'string' ? next.value : fallback
      }

      if (current.easing === 'hold') {
        return current.value
      }

      const progress = (time - current.time) / span
      const eased = applyEasing(progress, current.easing, current.bezier)
      return lerpColor(current.value, next.value, eased)
    }
  }

  return fallback
}

function sampleMatrixAtTime(keyframes: MatrixKeyframe[], time: number): AffineMatrix | null {
  if (keyframes.length === 0) {
    return null
  }

  const first = keyframes[0]!
  if (time <= first.time) {
    return {
      a: first.a,
      b: first.b,
      c: first.c,
      d: first.d,
      e: first.e,
      f: first.f,
    }
  }

  const last = keyframes[keyframes.length - 1]!
  if (time >= last.time) {
    return {
      a: last.a,
      b: last.b,
      c: last.c,
      d: last.d,
      e: last.e,
      f: last.f,
    }
  }

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const current = keyframes[index]!
    const next = keyframes[index + 1]!

    if (time >= current.time && time <= next.time) {
      const span = next.time - current.time
      const progress = span === 0 ? 0 : (time - current.time) / span

      return {
        a: lerp(current.a, next.a, progress),
        b: lerp(current.b, next.b, progress),
        c: lerp(current.c, next.c, progress),
        d: lerp(current.d, next.d, progress),
        e: lerp(current.e, next.e, progress),
        f: lerp(current.f, next.f, progress),
      }
    }
  }

  return {
    a: first.a,
    b: first.b,
    c: first.c,
    d: first.d,
    e: first.e,
    f: first.f,
  }
}

function layerNeedsMatrixSampling(layer: Layer): boolean {
  return (
    layer.shape.type === 'path' &&
    Boolean(layer.shape.localCoords) &&
    (layer.matrixKeyframes?.length ?? 0) > 0
  )
}

export function getAnimatedShape(
  layer: Layer,
  time: number,
  context?: AnimatedShapeContext,
): Shape {
  const hasGroupAnimation = layerHasGroupAnimation(layer, context?.layerGroups)
  if (!layerHasAnimation(layer) && !layerNeedsMatrixSampling(layer) && !hasGroupAnimation) {
    return layer.shape
  }

  const cached = animatedShapeCache.get(layer)
  if (cached && cached.time === time) {
    return applyGroupTransformsToShape(cached.shape, layer, time, context)
  }

  const { shape } = layer
  const sampleTime = Math.max(0, time - layer.delay)
  const tracks = getLayerKeyframeTracks(layer)

  const sampleNumeric = (
    property: NumericAnimatableProperty,
    fallback: number,
  ): number =>
    tracks
      ? sampleNumericTrackAtTime(getTrack(tracks, property), sampleTime, fallback)
      : fallback

  const sampleColor = (
    property: ColorAnimatableProperty,
    fallback: string,
  ): string =>
    tracks ? sampleColorTrackAtTime(getTrack(tracks, property), sampleTime, fallback) : fallback

  const base = {
    ...shape,
    x: sampleNumeric('x', shape.x),
    y: sampleNumeric('y', shape.y),
    rotation: sampleNumeric('rotation', shape.rotation),
    opacity: sampleNumeric('opacity', shape.opacity),
    scaleX: sampleNumeric('scaleX', shape.scaleX),
    scaleY: sampleNumeric('scaleY', shape.scaleY),
    fill: sampleColor('fill', shape.fill),
    stroke: sampleColor('stroke', shape.stroke),
  }

  let result: Shape

  if (shape.type === 'rect') {
    result = {
      ...base,
      type: 'rect',
      width: sampleNumeric('width', shape.width),
      height: sampleNumeric('height', shape.height),
    }
  } else if (shape.type === 'text') {
    result = {
      ...base,
      type: 'text',
      text: shape.text,
      fontFamily: shape.fontFamily,
      fontSize: sampleNumeric('fontSize', shape.fontSize),
    }
  } else if (shape.type === 'path') {
    const matrix =
      shape.localCoords && layer.matrixKeyframes && layer.matrixKeyframes.length > 0
        ? sampleMatrixAtTime(layer.matrixKeyframes, sampleTime)
        : null

    result = {
      ...base,
      type: 'path',
      points: shape.points,
      closed: shape.closed,
      localCoords: shape.localCoords,
      transformMatrix: matrix ?? undefined,
    }
  } else {
    result = {
      ...base,
      type: 'ellipse',
      rx: sampleNumeric('rx', shape.rx),
      ry: sampleNumeric('ry', shape.ry),
    }
  }

  const resultWithGroups = applyGroupTransformsToShape(result, layer, time, context)

  animatedShapeCache.set(layer, { time, shape: result })
  return resultWithGroups
}
