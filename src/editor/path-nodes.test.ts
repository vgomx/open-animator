import { describe, expect, it } from 'vitest'

import {
  createPathPointWithHandle,
  pathPointsToString,
  applyNodePosition,
} from '@/editor/path-nodes'
import type { PathShape } from '@/editor/types'

describe('path-nodes', () => {
  it('creates symmetric handles from drag distance', () => {
    const point = createPathPointWithHandle({ x: 0, y: 0 }, { x: 40, y: 0 })

    expect(point.handleOut).toEqual({ x: 40, y: 0 })
    expect(point.handleIn).toEqual({ x: -40, y: 0 })
  })

  it('returns a corner point when drag distance is tiny', () => {
    const point = createPathPointWithHandle({ x: 10, y: 10 }, { x: 11, y: 11 })

    expect(point).toEqual({ x: 10, y: 10 })
  })

  it('builds cubic bezier path data', () => {
    const points = [
      createPathPointWithHandle({ x: 0, y: 0 }, { x: 20, y: 0 }),
      createPathPointWithHandle({ x: 100, y: 0 }, { x: 80, y: 0 }),
    ]

    const path = pathPointsToString(points, false)

    expect(path).toContain('M 0 0')
    expect(path).toContain('C 20 0')
    expect(path).toContain('100 0')
  })

  it('moves path anchors and attached handles together', () => {
    const shape: PathShape = {
      id: 'path-1',
      type: 'path',
      x: 0,
      y: 0,
      rotation: 0,
      fill: '#000000',
      stroke: 'none',
      strokeWidth: 0,
      opacity: 1,
      scaleX: 1, scaleY: 1,
      closed: false,
      points: [
        {
          x: 10,
          y: 10,
          handleIn: { x: 0, y: 10 },
          handleOut: { x: 20, y: 10 },
        },
      ],
    }

    const patch = applyNodePosition(shape, { id: 'path-0', x: 10, y: 10, role: 'path', index: 0 }, 30, 40) as Partial<PathShape>

    expect(patch.points?.[0]).toEqual({
      x: 30,
      y: 40,
      handleIn: { x: 20, y: 40 },
      handleOut: { x: 40, y: 40 },
    })
  })
})
