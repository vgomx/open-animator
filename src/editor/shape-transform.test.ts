import { describe, expect, it } from 'vitest'

import { createPathShape } from '@/editor/scene'
import { translateShape } from '@/editor/shape-transform'

describe('translateShape', () => {
  it('moves path points instead of x/y', () => {
    const shape = createPathShape([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ])

    expect(translateShape(shape, 5, -3)).toEqual({
      points: [
        { x: 15, y: 17 },
        { x: 35, y: 37 },
      ],
    })
  })
})
