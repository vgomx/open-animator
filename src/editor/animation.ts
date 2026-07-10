import type { AnimatableProperty, EasingType, Keyframe } from '@/editor/types'

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

export function samplePropertyAtTime(
  keyframes: Keyframe[],
  property: AnimatableProperty,
  time: number,
  fallback: number,
): number {
  const track = getKeyframesForProperty(keyframes, property)

  if (track.length === 0) {
    return fallback
  }

  if (time <= track[0].time) {
    return track[0].value
  }

  const lastKeyframe = track[track.length - 1]
  if (time >= lastKeyframe.time) {
    return lastKeyframe.value
  }

  for (let index = 0; index < track.length - 1; index += 1) {
    const current = track[index]
    const next = track[index + 1]

    if (time >= current.time && time <= next.time) {
      const span = next.time - current.time
      if (span === 0) {
        return next.value
      }

      const progress = (time - current.time) / span
      const eased = applyEasing(progress, current.easing)
      return lerp(current.value, next.value, eased)
    }
  }

  return fallback
}
