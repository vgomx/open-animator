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

  it('rotates paths around their visual center', () => {
    const transform = buildShapeTransform({
      id: 'shape-2',
      type: 'path',
      x: 226,
      y: 364,
      rotation: 90,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 36 },
      ],
      closed: false,
      fill: 'none',
      stroke: '#141416',
      strokeWidth: 1.3,
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
    })

    expect(transform).toBe(
      'translate(226 382) rotate(90) scale(1 1) translate(0 -18)',
    )
  })
})
