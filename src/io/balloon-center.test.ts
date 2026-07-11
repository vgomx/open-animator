// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { importSvg, parseSvgPathData } from '@/io/svg-import'
import { effectiveMatrixAtTime } from '@/io/svg-smil'
import { applyMatrixToPoint } from '@/io/svg-transform'

describe('balloon center composition', () => {
  it('places balloon artwork in the upper scene where the source SVG puts it', () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const balloonGroup = [...doc.querySelectorAll('g')].find(
      (group) =>
        group.getAttribute('transform') === 'translate(0 -100)' &&
        group.querySelectorAll('path').length === 9,
    )
    expect(balloonGroup).toBeTruthy()

    const sourcePaths = [...balloonGroup!.querySelectorAll('path')]
    const imported = importSvg(balloonSvg)!
    const importedPaths = imported.layers.filter((layer) => layer.shape.type === 'path')

    const matchedLayers = sourcePaths.map((sourcePath) => {
      const { points } = parseSvgPathData(sourcePath.getAttribute('d')!)
      const matrix = effectiveMatrixAtTime(sourcePath, 0)
      const expected = points.map((point) => applyMatrixToPoint(matrix, point.x, point.y))

      return importedPaths.find((layer) => {
        if (layer.shape.type !== 'path' || layer.shape.points.length !== expected.length) {
          return false
        }

        const rendered = getAnimatedShape(layer, 0)
        if (rendered.type !== 'path' || !rendered.transformMatrix) {
          return false
        }

        const world = rendered.points.map((point) =>
          applyMatrixToPoint(rendered.transformMatrix!, point.x, point.y),
        )

        return world.every(
          (point, index) =>
            Math.hypot(point.x - expected[index]!.x, point.y - expected[index]!.y) < 0.5,
        )
      })
    })

    expect(matchedLayers.filter(Boolean).length).toBe(9)

    const centers = matchedLayers
      .filter((layer): layer is NonNullable<typeof layer> => Boolean(layer))
      .map((layer) => getShapeBounds(getAnimatedShape(layer, 0)))

    const avgX =
      centers.reduce((sum, bounds) => sum + bounds.x + bounds.width / 2, 0) / centers.length
    const avgY =
      centers.reduce((sum, bounds) => sum + bounds.y + bounds.height / 2, 0) / centers.length

    expect(avgX).toBeGreaterThan(150)
    expect(avgX).toBeLessThan(500)
    expect(avgY).toBeGreaterThan(50)
    expect(avgY).toBeLessThan(300)
  })
})
