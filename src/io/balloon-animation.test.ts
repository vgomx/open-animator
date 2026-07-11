// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { layerHasAnimation, matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { getAnimatedShape } from '@/editor/animation'
import { getBalloonProject } from '@/io/fixtures/balloon-fixture'

describe('balloon animation import', () => {
  it('imports 12s timeline with matrix motion on play', () => {
    const project = getBalloonProject()
    const animated = project.layers.filter((layer) => matrixKeyframesHaveMotion(layer.matrixKeyframes))
    const timelineVisible = project.layers.filter(layerHasAnimation)

    let visibleMotion = 0
    for (const layer of animated) {
      const at0 = getAnimatedShape(layer, 0)
      const at6 = getAnimatedShape(layer, 6)
      if (at0.type !== 'path' || at6.type !== 'path' || !at0.transformMatrix || !at6.transformMatrix) {
        continue
      }

      const left = at0.transformMatrix
      const right = at6.transformMatrix
      if (
        Math.abs(left.a - right.a) > 0.001 ||
        Math.abs(left.e - right.e) > 0.5 ||
        Math.abs(left.f - right.f) > 0.5
      ) {
        visibleMotion += 1
      }
    }

    expect(project.duration).toBe(12)
    expect(project.loopOut).toBe(12)
    expect(animated.length).toBeGreaterThan(50)
    expect(timelineVisible.length).toBeGreaterThan(50)
    expect(
      timelineVisible.filter((layer) => layer.keyframes.length > 0).length,
    ).toBeGreaterThan(50)
    expect(visibleMotion).toBeGreaterThan(50)
  })
})
