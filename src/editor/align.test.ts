import { describe, expect, it } from 'vitest'

import {
  alignShapeToArtboard,
  alignShapesTogether,
  distributeShapes,
} from '@/editor/align'
import type { Shape } from '@/editor/types'

const rect: Shape = {
  id: 'shape-1',
  type: 'rect',
  x: 100,
  y: 80,
  rotation: 0,
  width: 100,
  height: 50,
  fill: '#000000',
  stroke: '#000000',
  strokeWidth: 1,
  opacity: 1,
  scaleX: 1, scaleY: 1,
}

describe('align', () => {
  it('aligns a shape to the artboard center', () => {
    const patch = alignShapeToArtboard(rect, { width: 800, height: 600 }, 'center-h')
    expect(patch.x).toBe(350)
  })

  it('aligns visible shapes to a shared left edge', () => {
    const patches = alignShapesTogether(
      [
        { id: 'a', shape: rect },
        {
          id: 'b',
          shape: { ...rect, id: 'shape-2', x: 300, y: 200 },
        },
      ],
      'left',
    )

    expect(patches.get('a')?.x).toBe(100)
    expect(patches.get('b')?.x).toBe(100)
  })

  it('distributes three shapes with equal gaps', () => {
    const patches = distributeShapes(
      [
        { id: 'a', shape: { ...rect, x: 0 } },
        { id: 'b', shape: { ...rect, x: 200 } },
        { id: 'c', shape: { ...rect, x: 500 } },
      ],
      'horizontal',
    )

    expect(patches.get('a')?.x).toBe(0)
    expect(patches.get('b')?.x).toBe(250)
    expect(patches.get('c')?.x).toBe(500)
  })
})
