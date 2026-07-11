// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { getAnimatedShape } from '@/editor/animation'
import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { deserializeProject, serializeProject } from '@/io/project'
import { importSvg, svgImportToProject } from '@/io/svg-import'

describe('balloon project round-trip', () => {
  it('preserves matrix keyframes through storage serialization', () => {
    const project = svgImportToProject(importSvg(balloonSvg)!)
    const restored = deserializeProject(serializeProject(project))

    const matrixLayers = restored.layers.filter(
      (layer) => (layer.matrixKeyframes?.length ?? 0) > 0,
    )
    const animatedMatrix = restored.layers.filter((layer) =>
      matrixKeyframesHaveMotion(layer.matrixKeyframes),
    )

    expect(matrixLayers.length).toBeGreaterThan(300)
    expect(animatedMatrix.length).toBeGreaterThan(50)

    const layer = animatedMatrix[0]!
    const at0 = getAnimatedShape(layer, 0)
    const at6 = getAnimatedShape(layer, 6)

    expect(at0.type).toBe('path')
    if (at0.type !== 'path' || at6.type !== 'path') {
      return
    }

    expect(at0.transformMatrix).toBeTruthy()
    expect(at6.transformMatrix).toBeTruthy()
    expect(
      Math.abs(at0.transformMatrix!.a - at6.transformMatrix!.a) +
        Math.abs(at0.transformMatrix!.e - at6.transformMatrix!.e),
    ).toBeGreaterThan(0.001)
  })
})
