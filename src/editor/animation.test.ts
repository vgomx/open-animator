import { describe, expect, it } from 'vitest'

import { samplePropertyAtTime } from '@/editor/animation'
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
})
