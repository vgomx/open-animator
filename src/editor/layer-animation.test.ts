import { describe, expect, it } from 'vitest'

import {
  attachMatrixDisplayKeyframes,
  layerHasAnimation,
  matrixKeyframesToDisplayKeyframes,
} from '@/editor/layer-animation'
import { createLayerFromShape, createPathShape } from '@/editor/scene'

describe('layer-animation', () => {
  it('detects matrix-only animation', () => {
    const layer = createLayerFromShape(
      createPathShape([{ x: 0, y: 0 }]),
      0,
      '',
      'path-1',
    )
    layer.matrixKeyframes = [
      { time: 0, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      { time: 2, a: 1.1, b: 0, c: 0, d: 1.1, e: 10, f: 5 },
    ]

    expect(layerHasAnimation(layer)).toBe(true)
    expect(layer.keyframes.length).toBe(0)
  })

  it('creates display keyframes from matrix samples', () => {
    const display = matrixKeyframesToDisplayKeyframes([
      { time: 0, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      { time: 2, a: 1.1, b: 0, c: 0, d: 1.1, e: 10, f: 5 },
    ])

    expect(display.some((keyframe) => keyframe.property === 'scaleX' && keyframe.time === 2)).toBe(
      true,
    )
    expect(display.some((keyframe) => keyframe.property === 'scaleY' && keyframe.time === 2)).toBe(
      true,
    )
    expect(display.some((keyframe) => keyframe.property === 'x' && keyframe.time === 2)).toBe(true)
    expect(display.some((keyframe) => keyframe.property === 'y' && keyframe.time === 2)).toBe(true)
  })

  it('creates no display keyframes when matrix samples are identical', () => {
    const display = matrixKeyframesToDisplayKeyframes([
      { time: 0, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      { time: 12, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    ])

    expect(display).toHaveLength(0)
  })

  it('attaches display keyframes during import-style layer preparation', () => {
    const layer = createLayerFromShape(
      createPathShape([{ x: 0, y: 0 }]),
      0,
      '',
      'path-1',
    )
    layer.matrixKeyframes = [
      { time: 0, a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      { time: 2, a: 1.1, b: 0, c: 0, d: 1.1, e: 10, f: 5 },
    ]

    const prepared = attachMatrixDisplayKeyframes(layer)

    expect(prepared.keyframes.length).toBeGreaterThan(0)
    expect(prepared.matrixKeyframes?.length).toBe(2)
  })
})
