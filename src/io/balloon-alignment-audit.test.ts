// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { getAnimatedShape } from '@/editor/animation'
import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { importSvg, parseSvgPathData, svgImportToProject } from '@/io/svg-import'
import { effectiveMatrixAtTime } from '@/io/svg-smil'
import { applyMatrixToPoint } from '@/io/svg-transform'

describe('balloon import alignment', () => {
  it('imports every visible path at its effective world coordinates', { timeout: 15000 }, () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const sourcePaths = [...doc.querySelectorAll('path')].filter((path) => path.getAttribute('d'))
    const imported = importSvg(balloonSvg)!
    const importedPaths = imported.layers.filter((layer) => layer.shape.type === 'path')

    let matched = 0

    for (const sourcePath of sourcePaths) {
      const { points } = parseSvgPathData(sourcePath.getAttribute('d')!)
      if (points.length === 0) {
        continue
      }

      const matrix = effectiveMatrixAtTime(sourcePath, 0)
      const expected = points.map((point) => applyMatrixToPoint(matrix, point.x, point.y))

      const layer = importedPaths.find((entry) => {
        if (entry.shape.type !== 'path' || entry.shape.points.length !== expected.length) {
          return false
        }

        const rendered = getAnimatedShape(entry, 0)
        if (rendered.type !== 'path') {
          return false
        }

        const world = rendered.points.map((point) =>
          rendered.transformMatrix
            ? applyMatrixToPoint(rendered.transformMatrix, point.x, point.y)
            : point,
        )

        return world.every(
          (point, index) =>
            Math.hypot(point.x - expected[index]!.x, point.y - expected[index]!.y) < 0.5,
        )
      })

      if (layer) {
        matched += 1
      }
    }

    expect(matched).toBe(importedPaths.length)
    expect(matched).toBeGreaterThan(350)
  })
})

describe('balloon matrix animation', () => {
  it('animates imported paths via matrix keyframes during playback', () => {
    const project = svgImportToProject(importSvg(balloonSvg)!)
    const animated = project.layers.filter((layer) =>
      matrixKeyframesHaveMotion(layer.matrixKeyframes),
    )

    expect(animated.length).toBeGreaterThan(50)

    let movedAt6 = 0
    for (const layer of animated) {
      const at0 = getAnimatedShape(layer, 0)
      const at6 = getAnimatedShape(layer, 6)
      if (
        at0.type !== 'path' ||
        at6.type !== 'path' ||
        !at0.transformMatrix ||
        !at6.transformMatrix
      ) {
        continue
      }

      const left = at0.transformMatrix
      const right = at6.transformMatrix
      if (
        Math.abs(left.a - right.a) > 0.001 ||
        Math.abs(left.e - right.e) > 0.5 ||
        Math.abs(left.f - right.f) > 0.5
      ) {
        movedAt6 += 1
      }
    }

    expect(movedAt6).toBeGreaterThan(50)
  })
})
