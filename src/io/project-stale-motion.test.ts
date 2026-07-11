// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { importSvg, svgImportToProject } from '@/io/svg-import'
import { isStaleSvgImportProject } from '@/io/project'

describe('stale single-keyframe matrix cache', () => {
  it('detects balloon-scale projects with matrix keyframes but no motion', () => {
    const fresh = svgImportToProject(importSvg(balloonSvg)!)
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
})
