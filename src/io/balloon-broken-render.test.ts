// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { importSvg, svgImportToProject } from '@/io/svg-import'
import { isStaleSvgImportProject } from '@/io/project'

describe('balloon broken-render simulation', () => {
  it('without matrixKeyframes paths cluster in local coord range not world space', () => {
    const project = svgImportToProject(importSvg(balloonSvg)!)
    const broken = structuredClone(project)
    broken.layers = broken.layers.map((layer) => {
      if (layer.shape.type !== 'path' || !layer.shape.localCoords) {
        return layer
      }
      return { ...layer, matrixKeyframes: undefined }
    })

    const pathLayers = broken.layers.filter((layer) => layer.shape.type === 'path')
    const withMatrix = pathLayers.filter((layer) => {
      const shape = getAnimatedShape(layer, 0)
      return shape.type === 'path' && shape.transformMatrix
    })
    const inTopLeft = pathLayers.filter((layer) => {
      const bounds = getShapeBounds(getAnimatedShape(layer, 0))
      return bounds.x < 500 && bounds.y < 500 && bounds.x + bounds.width > 0
    })

    expect(withMatrix.length).toBe(0)
    expect(inTopLeft.length / pathLayers.length).toBeGreaterThan(0.8)
  })

  it('stale project with display keyframes but no matrixKeyframes is not detected', () => {
    const project = svgImportToProject(importSvg(balloonSvg)!)
    const stale = structuredClone(project)
    stale.layers = stale.layers.map((layer) =>
      layer.shape.type === 'path' && layer.shape.localCoords
        ? { ...layer, matrixKeyframes: undefined }
        : layer,
    )

    expect(isStaleSvgImportProject(stale)).toBe(true)
  })
})
