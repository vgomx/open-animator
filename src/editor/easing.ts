import type { BezierHandle, EasingType } from '@/editor/types'

export const DEFAULT_CUSTOM_BEZIER: BezierHandle = [0.42, 0, 0.58, 1]

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function bezierComponent(a: number, b: number, t: number): number {
  const inverse = 1 - t
  return 3 * inverse * inverse * t * a + 3 * inverse * t * t * b + t * t * t
}

export function sampleCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  progress: number,
): number {
  const x = clamp01(progress)
  if (x <= 0) {
    return 0
  }
  if (x >= 1) {
    return 1
  }

  let start = 0
  let end = 1
  let t = x

  for (let index = 0; index < 12; index += 1) {
    const currentX = bezierComponent(x1, x2, t)
    if (Math.abs(currentX - x) < 1e-5) {
      break
    }

    if (currentX < x) {
      start = t
    } else {
      end = t
    }

    t = (start + end) / 2
  }

  return clamp01(bezierComponent(y1, y2, t))
}

export function sampleEasing(
  progress: number,
  easing: EasingType = 'linear',
  bezier?: BezierHandle,
): number {
  if (easing === 'custom' && bezier) {
    const [x1, y1, x2, y2] = bezier
    return sampleCubicBezier(x1, y1, x2, y2, progress)
  }

  return applyPresetEasing(progress, easing)
}

export function applyPresetEasing(progress: number, easing: EasingType = 'linear'): number {
  const t = clamp01(progress)

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
