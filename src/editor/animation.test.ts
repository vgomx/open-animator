import { describe, expect, it } from 'vitest'

import { applyEasing, lerpColor, sampleColorAtTime, samplePropertyAtTime } from '@/editor/animation'
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

  it('steps to the next value at the end of a hold segment', () => {
    const keyframes: Keyframe[] = [
      { id: 'a', time: 0, property: 'scaleX', value: 1, easing: 'hold' },
      { id: 'b', time: 0.5, property: 'scaleX', value: 1.2 },
    ]

    expect(samplePropertyAtTime(keyframes, 'scaleX', 0.25, 1)).toBe(1)
    expect(samplePropertyAtTime(keyframes, 'scaleX', 0.5, 1)).toBe(1.2)
  })
})

describe('sampleColorAtTime', () => {
  it('interpolates fill colors between keyframes', () => {
    const keyframes: Keyframe[] = [
      { id: 'a', time: 0, property: 'fill', value: '#000000' },
      { id: 'b', time: 2, property: 'fill', value: '#ffffff' },
    ]

    expect(sampleColorAtTime(keyframes, 'fill', 1, '#000000')).toBe('#808080')
  })
})

describe('lerpColor', () => {
  it('blends two hex colors', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080')
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
