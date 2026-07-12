import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { PROJECT_TEMPLATES } from '@/lib/templates'

function sampleBounceLayer() {
  const template = PROJECT_TEMPLATES.find((item) => item.id === 'bouncing-ball')
  const layer = template?.project.layers[0]
  if (!layer) {
    throw new Error('Bouncing ball template missing')
  }
  return layer
}

describe('bouncing ball template', () => {
  it('keeps scale neutral during the initial fall', () => {
    const layer = sampleBounceLayer()

    for (const time of [0.1, 0.2, 0.35, 0.47]) {
      const shape = getAnimatedShape(layer, time)
      expect(shape.scaleX).toBeCloseTo(1, 2)
      expect(shape.scaleY).toBeCloseTo(1, 2)
    }
  })

  it('squashes only around floor impacts', () => {
    const layer = sampleBounceLayer()

    const firstImpact = getAnimatedShape(layer, 0.5)
    expect(firstImpact.scaleX).toBeGreaterThan(1.1)
    expect(firstImpact.scaleY).toBeLessThan(0.75)

    const midAir = getAnimatedShape(layer, 0.62)
    expect(midAir.scaleX).toBeCloseTo(1, 2)
    expect(midAir.scaleY).toBeCloseTo(1, 2)
  })

  it('does not overshoot explicit floor keyframes on the y track', () => {
    const layer = sampleBounceLayer()
    const floor = 420

    for (let index = 0; index <= 120; index += 1) {
      const time = index / 60
      const shape = getAnimatedShape(layer, time)
      expect(shape.y).toBeLessThanOrEqual(floor + 0.5)
    }
  })
})
