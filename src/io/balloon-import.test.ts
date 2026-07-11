// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { getShapeBounds } from '@/editor/bounds'
import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { importSvg } from '@/io/svg-import'

function overlapsViewport(bounds: { x: number; y: number; width: number; height: number }) {
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height
  return right >= 0 && bottom >= 0 && bounds.x <= 1080 && bounds.y <= 1080
}

describe('hot air balloon parallax import', () => {
  it('imports gradients, matrix keyframes, and aligned path layers from the user file', () => {
    const imported = importSvg(balloonSvg)

    expect(imported).not.toBeNull()
    expect(imported?.artboard).toEqual({ width: 1080, height: 1080 })
    expect(imported?.layers.length).toBeGreaterThan(350)
    expect(Object.keys(imported?.gradients ?? {}).length).toBeGreaterThan(100)
    expect(imported?.duration).toBeGreaterThan(0)

    const gradientFills = imported!.layers.filter((layer) => layer.shape.fill.startsWith('url(#imported-grad-'))
    expect(gradientFills.length).toBeGreaterThan(50)

    const animatedLayers = imported!.layers.filter((layer) =>
      matrixKeyframesHaveMotion(layer.matrixKeyframes),
    )
    expect(animatedLayers.length).toBeGreaterThan(50)

    const inViewLayers = imported!.layers.filter((layer) =>
      overlapsViewport(getShapeBounds(getAnimatedShape(layer, 0))),
    )
    expect(inViewLayers.length).toBeGreaterThan(120)
  })
})
