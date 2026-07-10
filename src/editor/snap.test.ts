import { describe, expect, it } from 'vitest'

import { snapBounds, snapPoint } from '@/editor/snap'

describe('snap', () => {
  it('snaps bounds to a vertical target', () => {
    const result = snapBounds(
      { x: 102, y: 40, width: 100, height: 80 },
      [{ axis: 'x', position: 200 }],
      8,
    )

    expect(result.bounds.x).toBe(100)
    expect(result.lines).toEqual([{ axis: 'x', position: 200 }])
  })

  it('snaps a point to horizontal and vertical targets', () => {
    const result = snapPoint(
      198,
      302,
      [
        { axis: 'x', position: 200 },
        { axis: 'y', position: 300 },
      ],
      8,
    )

    expect(result.x).toBe(200)
    expect(result.y).toBe(300)
    expect(result.lines).toHaveLength(2)
  })
})
