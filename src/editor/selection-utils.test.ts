import { describe, expect, it } from 'vitest'

import { createRectShape } from '@/editor/scene'
import {
  extractShapeStyle,
  getSelectedAnimatedShapes,
  getSharedNumericValue,
  getSharedShapeValue,
} from '@/editor/selection-utils'
import type { Layer } from '@/editor/types'

function createLayer(shape: Layer['shape'], id: string): Layer {
  return {
    id,
    artboardId: 'artboard-test',
    name: id,
    visible: true,
    locked: false,
    groupId: null,
    delay: 0,
    shape,
    keyframes: [],
  }
}

describe('selection-utils', () => {
  it('returns shared values when all shapes match', () => {
    const shapes = [
      createRectShape(0, 0, 40, 40),
      createRectShape(10, 10, 40, 40),
    ]

    expect(getSharedShapeValue(shapes, 'opacity')).toBe(1)
    expect(getSharedNumericValue(shapes, 'opacity')).toEqual({ value: 1, mixed: false })
  })

  it('returns mixed when values differ', () => {
    const first = createRectShape(0, 0, 40, 40)
    const second = { ...createRectShape(10, 10, 40, 40), opacity: 0.5 }

    expect(getSharedShapeValue([first, second], 'opacity')).toBeNull()
    expect(getSharedNumericValue([first, second], 'opacity')).toEqual({ value: 1, mixed: true })
  })

  it('extracts style fields from a shape', () => {
    const shape = createRectShape(0, 0, 40, 40)

    expect(extractShapeStyle(shape)).toEqual({
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
      opacity: shape.opacity,
    })
  })

  it('collects animated shapes for selected layers', () => {
    const layerA = createLayer(createRectShape(0, 0, 40, 40), 'a')
    const layerB = createLayer(createRectShape(20, 20, 40, 40), 'b')

    const selected = getSelectedAnimatedShapes([layerA, layerB], ['b'], 0)

    expect(selected).toHaveLength(1)
    expect(selected[0]?.layer.id).toBe('b')
  })
})
