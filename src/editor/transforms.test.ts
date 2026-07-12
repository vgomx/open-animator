import { describe, expect, it } from 'vitest'

import { buildShapeTransform } from '@/editor/transforms'

describe('buildShapeTransform', () => {
  it('anchors ellipse squash to the bottom contact point', () => {
    const transform = buildShapeTransform({
      id: 'shape-1',
      type: 'ellipse',
      x: 200,
      y: 300,
      rotation: 0,
      rx: 40,
      ry: 40,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 1,
      opacity: 1,
      scaleX: 1.2,
      scaleY: 0.7,
    })

    expect(transform).toBe('translate(200 300) rotate(0) translate(0 40) scale(1.2 0.7) translate(0 -40)')
  })
})
