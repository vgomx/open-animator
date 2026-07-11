// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { getAnimatedShape } from '@/editor/animation'
import { balloonSvg, getBalloonSvgImport } from '@/io/fixtures/balloon-fixture'
import { effectiveMatrixAtTime } from '@/io/svg-smil'

describe('balloon group animation import', () => {
  it('balloon group paths animate via parent group smil in matrix keyframes', () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const balloonGroup = [...doc.querySelectorAll('g')].find(
      (group) =>
        group.getAttribute('transform') === 'translate(0 -100)' &&
        group.querySelectorAll('path').length === 9,
    )!
    const sourcePaths = [...balloonGroup.querySelectorAll('path')]
    const imported = getBalloonSvgImport()

    for (const sourcePath of sourcePaths) {
      const sourceMoves =
        effectiveMatrixAtTime(sourcePath, 0).f !== effectiveMatrixAtTime(sourcePath, 6).f ||
        effectiveMatrixAtTime(sourcePath, 0).e !== effectiveMatrixAtTime(sourcePath, 6).e

      expect(sourceMoves).toBe(true)

      const matchingLayers = imported.layers.filter((l) => {
        if (l.shape.type !== 'path' || !matrixKeyframesHaveMotion(l.matrixKeyframes)) {
          return false
        }
        const at0 = getAnimatedShape(l, 0)
        const at6 = getAnimatedShape(l, 6)
        if (at0.type !== 'path' || at6.type !== 'path' || !at0.transformMatrix || !at6.transformMatrix) {
          return false
        }
        const src0 = effectiveMatrixAtTime(sourcePath, 0)
        const src6 = effectiveMatrixAtTime(sourcePath, 6)
        return (
          Math.abs(at0.transformMatrix.e - src0.e) < 1 &&
          Math.abs(at6.transformMatrix.e - src6.e) < 1
        )
      })

      expect(matchingLayers.length).toBeGreaterThan(0)
      const layer2 = matchingLayers[0]!
      const at0 = getAnimatedShape(layer2, 0)
      const at6 = getAnimatedShape(layer2, 6)
      if (at0.type === 'path' && at6.type === 'path' && at0.transformMatrix && at6.transformMatrix) {
        expect(at0.transformMatrix.f).not.toBeCloseTo(at6.transformMatrix.f, 0)
      }
    }
  })
})
