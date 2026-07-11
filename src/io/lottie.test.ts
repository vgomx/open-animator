// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { createDefaultProject, createLayerFromShape, createRectShape } from '@/editor/scene'
import { exportLottie, importLottie } from '@/io/lottie'

type LottieProperty = {
  a: number
  k: unknown
}

function expectStaticProperty(property: LottieProperty) {
  expect(property.a).toBe(0)
  expect(Array.isArray(property.k) && property.k[0] && typeof property.k[0] === 'object').toBe(false)
}

describe('lottie export', () => {
  it('exports static transform properties in lottie-compatible form', () => {
    const project = {
      ...createDefaultProject(),
      layers: [createLayerFromShape(createRectShape(100, 80, 120, 60), 0, 'Box')],
    }

    const exported = exportLottie(project) as {
      layers: Array<{ ks: { o: LottieProperty; p: LottieProperty; s: LottieProperty; r: LottieProperty } }>
    }

    const transform = exported.layers[0]!.ks
    expectStaticProperty(transform.o)
    expectStaticProperty(transform.r)
    expectStaticProperty(transform.p)
    expectStaticProperty(transform.s)
    expect(transform.p.k).toEqual([160, 110, 0])
  })

  it('exports animated opacity as an animated lottie track', () => {
    const layer = createLayerFromShape(createRectShape(40, 40, 80, 80), 0, 'Fade')
    layer.keyframes = [
      {
        id: 'kf-1',
        time: 0,
        property: 'opacity',
        value: 1,
        easing: 'linear',
      },
      {
        id: 'kf-2',
        time: 1,
        property: 'opacity',
        value: 0.2,
        easing: 'linear',
      },
    ]

    const exported = exportLottie({
      ...createDefaultProject(),
      duration: 1,
      layers: [layer],
    }) as {
      layers: Array<{ ks: { o: LottieProperty } }>
    }

    const opacity = exported.layers[0]!.ks.o
    expect(opacity.a).toBe(1)
    expect(Array.isArray(opacity.k)).toBe(true)
    expect(opacity.k).toHaveLength(2)
  })

  it('round-trips a basic animated rect through import', () => {
    const layer = createLayerFromShape(createRectShape(50, 40, 100, 80), 0, 'Move')
    layer.keyframes = [
      {
        id: 'kf-1',
        time: 0,
        property: 'x',
        value: 50,
        easing: 'linear',
      },
      {
        id: 'kf-2',
        time: 1,
        property: 'x',
        value: 200,
        easing: 'linear',
      },
    ]

    const exported = exportLottie({
      ...createDefaultProject(),
      duration: 1,
      layers: [layer],
    })

    const imported = importLottie(JSON.stringify(exported))
    expect(imported).not.toBeNull()
    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers[0]?.keyframes.some((keyframe) => keyframe.property === 'x')).toBe(true)
  })
})
