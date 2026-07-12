import { describe, expect, it } from 'vitest'

import {
  inferCycleDurationFromKeyframes,
  resolveLoopTime,
} from '@/editor/animation-cycle'

describe('resolveLoopTime', () => {
  it('returns null before delay elapses', () => {
    expect(resolveLoopTime(0.5, { duration: 2, delay: 1 })).toBeNull()
  })

  it('maps time within one cycle', () => {
    expect(resolveLoopTime(1.5, { duration: 2, delay: 0 })).toBe(1.5)
    expect(resolveLoopTime(2.5, { duration: 2, delay: 0 })).toBe(0.5)
  })

  it('reverses direction on alternate iterations', () => {
    expect(resolveLoopTime(0.5, { duration: 2, direction: 'reverse' })).toBe(1.5)
    expect(resolveLoopTime(2.5, { duration: 2, direction: 'alternate' })).toBe(1.5)
    expect(resolveLoopTime(3.5, { duration: 2, direction: 'alternate' })).toBe(0.5)
  })
})

describe('inferCycleDurationFromKeyframes', () => {
  it('uses max keyframe time when present', () => {
    expect(
      inferCycleDurationFromKeyframes(
        [{ time: 0 }, { time: 1.5 }, { time: 3 }],
        10,
      ),
    ).toBe(3)
  })

  it('falls back when keyframes are empty', () => {
    expect(inferCycleDurationFromKeyframes([], 5)).toBe(5)
    expect(inferCycleDurationFromKeyframes(undefined, 5)).toBe(5)
  })
})
