// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getBalloonProject } from '@/io/fixtures/balloon-fixture'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { isStaleSvgImportProject } from '@/io/project'

describe('stale single-keyframe matrix cache', () => {
  it('detects balloon-scale projects with matrix keyframes but no motion', () => {
    const fresh = getBalloonProject()
    expect(isStaleSvgImportProject(fresh)).toBe(false)

    const stale = structuredClone(fresh)
    stale.layers = stale.layers.map((layer) => {
      if (layer.shape.type !== 'path' || !layer.shape.localCoords) {
        return layer
      }

      const first = layer.matrixKeyframes?.[0]
      return {
        ...layer,
        matrixKeyframes: first ? [first] : [],
      }
    })

    const motionCount = stale.layers.filter((l) =>
      matrixKeyframesHaveMotion(l.matrixKeyframes),
    ).length
    expect(motionCount).toBe(0)
    expect(isStaleSvgImportProject(stale)).toBe(true)
  })

  it('detects decoy multi-keyframe matrix data with no motion', () => {
    const fresh = getBalloonProject()
    expect(isStaleSvgImportProject(fresh)).toBe(false)

    const stale = structuredClone(fresh)
    stale.layers = stale.layers.map((layer) => {
      if (layer.shape.type !== 'path' || !layer.matrixKeyframes?.[0]) {
        return layer
      }

      const first = layer.matrixKeyframes[0]
      return {
        ...layer,
        matrixKeyframes: Array.from({ length: 13 }, (_, index) => ({
          ...first,
          time: index,
        })),
      }
    })

    expect(isStaleSvgImportProject(stale)).toBe(true)
  })
})
