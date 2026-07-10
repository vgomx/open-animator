import { describe, expect, it } from 'vitest'

import { createLayer } from '@/editor/scene'
import { createDefaultProject } from '@/editor/scene'
import { generatePresetKeyframes } from '@/editor/presets'
import { applyEasing } from '@/editor/animation'

describe('presets', () => {
  it('generates fade-in keyframes', () => {
    const project = createDefaultProject()
    const layer = createLayer('rect', 0)
    const keyframes = generatePresetKeyframes(layer, 'fadeIn', 0, project, { duration: 1 })

    expect(keyframes.some((keyframe) => keyframe.property === 'opacity')).toBe(true)
  })
})

describe('easing', () => {
  it('applies bounce easing in range', () => {
    const value = applyEasing(0.5, 'bounce')
    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(1.5)
  })

  it('hold easing stays at start', () => {
    expect(applyEasing(0.8, 'hold')).toBe(0)
  })
})
