// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import { getBalloonSvgImport } from '@/io/fixtures/balloon-fixture'

function overlapsViewport(bounds: { x: number; y: number; width: number; height: number }) {
  const right = bounds.x + bounds.width
  const bottom = bounds.y + bounds.height
  return right >= 0 && bottom >= 0 && bounds.x <= 1080 && bounds.y <= 1080
}

describe('balloon layout diagnostics', () => {
  it('places rendered artwork across the 1080x1080 viewport', () => {
    const imported = getBalloonSvgImport()
    expect(imported).not.toBeNull()

    const pathLayers = imported!.layers.filter((layer) => layer.shape.type === 'path')
    const inViewLayers = pathLayers.filter((layer) =>
      overlapsViewport(getShapeBounds(getAnimatedShape(layer, 0))),
    )

    expect(inViewLayers.length / pathLayers.length).toBeGreaterThan(0.35)
  })
})
