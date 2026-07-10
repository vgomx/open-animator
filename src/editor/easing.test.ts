import { describe, expect, it } from 'vitest'

import { sampleCubicBezier, sampleEasing } from '@/editor/easing'

describe('easing', () => {
  it('returns endpoints for custom cubic-bezier', () => {
    expect(sampleCubicBezier(0.42, 0, 0.58, 1, 0)).toBe(0)
    expect(sampleCubicBezier(0.42, 0, 0.58, 1, 1)).toBe(1)
  })

  it('eases in-out near midpoint for standard curve', () => {
    const midpoint = sampleCubicBezier(0.42, 0, 0.58, 1, 0.5)
    expect(midpoint).toBeGreaterThan(0.4)
    expect(midpoint).toBeLessThan(0.6)
  })

  it('uses custom bezier when easing is custom', () => {
    const value = sampleEasing(0.5, 'custom', [0, 0, 1, 1])
    expect(value).toBeCloseTo(0.5, 1)
  })
})
