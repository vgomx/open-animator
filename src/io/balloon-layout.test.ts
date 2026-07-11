// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { importSvg } from '@/io/svg-import'

function overlapsViewport(bounds: { x: number; y: number; width: number; height: number }) {
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height
  return right >= 0 && bottom >= 0 && bounds.x <= 1080 && bounds.y <= 1080
}

describe('balloon layout diagnostics', () => {
  it('places rendered artwork across the 1080x1080 viewport', () => {
    const imported = importSvg(balloonSvg)
    expect(imported).not.toBeNull()

    const pathLayers = imported!.layers.filter((layer) => layer.shape.type === 'path')
    const inViewLayers = pathLayers.filter((layer) =>
      overlapsViewport(getShapeBounds(getAnimatedShape(layer, 0))),
    )

    expect(inViewLayers.length / pathLayers.length).toBeGreaterThan(0.35)
  })
})
