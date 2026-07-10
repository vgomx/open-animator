import { describe, expect, it } from 'vitest'

import { applyEasing, samplePropertyAtTime } from '@/editor/animation'
import type { Keyframe } from '@/editor/types'

describe('samplePropertyAtTime', () => {
  it('interpolates linearly between keyframes', () => {
    const keyframes: Keyframe[] = [
      { id: 'a', time: 0, property: 'opacity', value: 0 },
      { id: 'b', time: 2, property: 'opacity', value: 1 },
    ]

    expect(samplePropertyAtTime(keyframes, 'opacity', 0, 1)).toBe(0)
    expect(samplePropertyAtTime(keyframes, 'opacity', 1, 1)).toBe(0.5)
    expect(samplePropertyAtTime(keyframes, 'opacity', 2, 1)).toBe(1)
  })

  it('returns fallback when no keyframes exist', () => {
    expect(samplePropertyAtTime([], 'x', 1, 42)).toBe(42)
  })

  it('applies easeIn easing on the outgoing keyframe segment', () => {
    const keyframes: Keyframe[] = [
      { id: 'a', time: 0, property: 'opacity', value: 0, easing: 'easeIn' },
      { id: 'b', time: 2, property: 'opacity', value: 1 },
    ]

    expect(samplePropertyAtTime(keyframes, 'opacity', 1, 1)).toBe(0.25)
  })

  it('applies easeOut easing on the outgoing keyframe segment', () => {
    const keyframes: Keyframe[] = [
      { id: 'a', time: 0, property: 'opacity', value: 0, easing: 'easeOut' },
      { id: 'b', time: 2, property: 'opacity', value: 1 },
    ]

    expect(samplePropertyAtTime(keyframes, 'opacity', 1, 1)).toBe(0.75)
  })
})

describe('applyEasing', () => {
  it('returns linear progress by default', () => {
    expect(applyEasing(0.5)).toBe(0.5)
  })

  it('clamps progress to 0-1', () => {
    expect(applyEasing(-1, 'easeIn')).toBe(0)
    expect(applyEasing(2, 'easeIn')).toBe(1)
  })
})
