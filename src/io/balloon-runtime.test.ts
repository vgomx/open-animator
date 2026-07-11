// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { balloonSvg, getBalloonSvgImport } from '@/io/fixtures/balloon-fixture'
import { parseSvgPathData } from '@/io/svg-import'
import { effectiveMatrixAtTime } from '@/io/svg-smil'
import { applyMatrixToPoint } from '@/io/svg-transform'

describe('balloon runtime animation', () => {
  it('renders imported paths with matrix transforms at t=0 and t=3', () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const sourcePaths = [...doc.querySelectorAll('path')].filter((path) => path.getAttribute('d'))
    const imported = getBalloonSvgImport()
    const importedPaths = imported.layers.filter((layer) => layer.shape.type === 'path')

    let matchedAt0 = 0
    let matchedAt3 = 0
    let checkedAt3 = 0

    for (const sourcePath of sourcePaths) {
      const { points } = parseSvgPathData(sourcePath.getAttribute('d')!)
      if (points.length < 2) {
        continue
      }

      const matrix0 = effectiveMatrixAtTime(sourcePath, 0)
      const expectedKey = points
        .map((point) => {
          const mapped = applyMatrixToPoint(matrix0, point.x, point.y)
          return `${mapped.x.toFixed(2)},${mapped.y.toFixed(2)}`
        })
        .join('|')

      const layer = importedPaths.find((entry) => {
        if (entry.shape.type !== 'path' || !entry.shape.localCoords) {
          return false
        }

        const rendered0 = getAnimatedShape(entry, 0)
        if (rendered0.type !== 'path' || !rendered0.transformMatrix) {
          return false
        }

        const world = rendered0.points.map((point) =>
          applyMatrixToPoint(rendered0.transformMatrix!, point.x, point.y),
        )
        const key = world
          .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
          .join('|')
        return key === expectedKey
      })

      if (!layer || layer.shape.type !== 'path') {
        continue
      }

      const firstPoint = points[0]!
      const expected0 = applyMatrixToPoint(matrix0, firstPoint.x, firstPoint.y)
      const expected3 = applyMatrixToPoint(effectiveMatrixAtTime(sourcePath, 3), firstPoint.x, firstPoint.y)

      const shape0 = getAnimatedShape(layer, 0)
      const shape3 = getAnimatedShape(layer, 3)
      if (shape0.type !== 'path' || shape3.type !== 'path') {
        continue
      }

      expect(shape0.transformMatrix).toBeTruthy()
      expect(shape3.transformMatrix).toBeTruthy()

      const rendered0 = applyMatrixToPoint(
        shape0.transformMatrix!,
        layer.shape.points[0]!.x,
        layer.shape.points[0]!.y,
      )
      const rendered3 = applyMatrixToPoint(
        shape3.transformMatrix!,
        layer.shape.points[0]!.x,
        layer.shape.points[0]!.y,
      )

      if (Math.hypot(rendered0.x - expected0.x, rendered0.y - expected0.y) < 2) {
        matchedAt0 += 1
      }

      if (matrixKeyframesHaveMotion(layer.matrixKeyframes)) {
        checkedAt3 += 1
        if (Math.hypot(rendered3.x - expected3.x, rendered3.y - expected3.y) < 8) {
          matchedAt3 += 1
        }
      }
    }

    expect(matchedAt0).toBeGreaterThan(300)
    expect(checkedAt3).toBeGreaterThan(50)
    expect(matchedAt3 / checkedAt3).toBeGreaterThan(0.8)
  })
})
