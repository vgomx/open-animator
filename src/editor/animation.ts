import type {
  AnimatableProperty,
  ColorAnimatableProperty,
  EasingType,
  Keyframe,
  Layer,
  NumericAnimatableProperty,
  Shape,
} from '@/editor/types'

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function applyEasing(progress: number, easing: EasingType = 'linear'): number {
  const t = Math.max(0, Math.min(1, progress))

  switch (easing) {
    case 'easeIn':
      return t * t
    case 'easeOut':
      return t * (2 - t)
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    case 'spring': {
      const c4 = (2 * Math.PI) / 3
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
    }
    case 'bounce': {
      const n1 = 7.5625
      const d1 = 2.75
      if (t < 1 / d1) {
        return n1 * t * t
      }
      if (t < 2 / d1) {
        const v = t - 1.5 / d1
        return n1 * v * v + 0.75
      }
      if (t < 2.5 / d1) {
        const v = t - 2.25 / d1
        return n1 * v * v + 0.9375
      }
      const v = t - 2.625 / d1
      return n1 * v * v + 0.984375
    }
    case 'elastic': {
      const c5 = (2 * Math.PI) / 4.5
      return t === 0
        ? 0
        : t === 1
          ? 1
          : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c5) + 1
    }
    case 'back': {
      const c1 = 1.70158
      const c3 = c1 + 1
      return c3 * t * t * t - c1 * t * t
    }
    case 'hold':
      return 0
    default:
      return t
  }
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
      const eased = applyEasing(progress, current.easing)
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
      const eased = applyEasing(progress, current.easing)
      return lerpColor(current.value, next.value, eased)
    }
  }

  return fallback
}

export function getAnimatedShape(layer: Layer, time: number): Shape {
  const { shape, keyframes } = layer
  const sampleTime = Math.max(0, time - layer.delay)

  const base = {
    ...shape,
    x: samplePropertyAtTime(keyframes, 'x', sampleTime, shape.x),
    y: samplePropertyAtTime(keyframes, 'y', sampleTime, shape.y),
    rotation: samplePropertyAtTime(keyframes, 'rotation', sampleTime, shape.rotation),
    opacity: samplePropertyAtTime(keyframes, 'opacity', sampleTime, shape.opacity),
    scale: samplePropertyAtTime(keyframes, 'scale', sampleTime, shape.scale),
    fill: sampleColorAtTime(keyframes, 'fill', sampleTime, shape.fill),
    stroke: sampleColorAtTime(keyframes, 'stroke', sampleTime, shape.stroke),
  }

  if (shape.type === 'rect') {
    return {
      ...base,
      type: 'rect',
      width: samplePropertyAtTime(keyframes, 'width', sampleTime, shape.width),
      height: samplePropertyAtTime(keyframes, 'height', sampleTime, shape.height),
    }
  }

  if (shape.type === 'text') {
    return {
      ...base,
      type: 'text',
      text: shape.text,
      fontFamily: shape.fontFamily,
      fontSize: samplePropertyAtTime(keyframes, 'fontSize', sampleTime, shape.fontSize),
    }
  }

  return {
    ...base,
    type: 'ellipse',
    rx: samplePropertyAtTime(keyframes, 'rx', sampleTime, shape.rx),
    ry: samplePropertyAtTime(keyframes, 'ry', sampleTime, shape.ry),
  }
}
