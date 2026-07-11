// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { createDefaultProject, createLayerFromShape, createPathShape, createRectShape } from '@/editor/scene'
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
    const project = createDefaultProject()
    const projectWithLayer = {
      ...project,
      layers: [
        createLayerFromShape(
          createRectShape(100, 80, 120, 60),
          0,
          project.artboards[0]!.id,
          'Box',
        ),
      ],
    }

    const exported = exportLottie(projectWithLayer) as {
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
    const project = createDefaultProject()
    const layer = createLayerFromShape(
      createRectShape(40, 40, 80, 80),
      0,
      project.artboards[0]!.id,
      'Fade',
    )
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
      ...project,
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

  it('exports path bezier handles in lottie shape data', () => {
    const project = createDefaultProject()
    const path = createPathShape(
      [
        { x: 0, y: 0, handleOut: { x: 40, y: 0 } },
        { x: 100, y: 0, handleIn: { x: 60, y: 0 } },
      ],
      false,
    )
    const layer = createLayerFromShape(path, 0, project.artboards[0]!.id, 'Curve')

    const exported = exportLottie({
      ...project,
      layers: [layer],
    }) as {
      layers: Array<{
        shapes: Array<{
          it: Array<{ ty?: string; ks?: { k?: { o?: number[][]; i?: number[][] } } }>
        }>
      }>
    }

    const pathShape = exported.layers[0]!.shapes[0]!.it.find((item) => item.ty === 'sh')
    const handles = pathShape?.ks?.k
    expect(handles?.o?.[0]).toEqual([40, 0])
    expect(handles?.i?.[1]).toEqual([-40, 0])
  })

  it('exports linear gradient fills when imported svg gradients exist', () => {
    const project = createDefaultProject()
    const layer = createLayerFromShape(
      createRectShape(10, 10, 80, 80),
      0,
      project.artboards[0]!.id,
      'Gradient',
    )
    layer.shape.fill = 'url(#imported-grad-brand)'

    const exported = exportLottie({
      ...project,
      importedSvg: {
        gradients: {
          brand: {
            kind: 'linear',
            id: 'brand',
            x1: 0,
            y1: 0,
            x2: 100,
            y2: 0,
            stops: [
              { offset: 0, color: '#ff0000' },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      },
      layers: [layer],
    }) as {
      layers: Array<{ shapes: Array<{ it: Array<{ ty?: string }> }> }>
    }

    const fill = exported.layers[0]!.shapes[0]!.it.find((item) => item.ty === 'gf')
    expect(fill).toBeTruthy()
  })

  it('round-trips a basic animated rect through import', () => {
    const project = createDefaultProject()
    const layer = createLayerFromShape(
      createRectShape(50, 40, 100, 80),
      0,
      project.artboards[0]!.id,
      'Move',
    )
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
      ...project,
      duration: 1,
      layers: [layer],
    })

    const imported = importLottie(JSON.stringify(exported))
    expect(imported).not.toBeNull()
    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers[0]?.keyframes.some((keyframe) => keyframe.property === 'x')).toBe(true)
  })

  it('imports path layers and rotation keyframes', () => {
    const project = createDefaultProject()
    const layer = createLayerFromShape(
      createPathShape(
        [
          { x: 0, y: 0 },
          { x: 100, y: 50 },
        ],
        false,
      ),
      0,
      project.artboards[0]!.id,
      'Path',
    )
    layer.keyframes = [
      {
        id: 'kf-rot-1',
        time: 0,
        property: 'rotation',
        value: 0,
        easing: 'linear',
      },
      {
        id: 'kf-rot-2',
        time: 1,
        property: 'rotation',
        value: 45,
        easing: 'linear',
      },
    ]

    const exported = exportLottie({
      ...project,
      duration: 1,
      layers: [layer],
    })

    const imported = importLottie(JSON.stringify(exported))
    expect(imported?.layers[0]?.shape.type).toBe('path')
    expect(imported?.layers[0]?.keyframes.some((keyframe) => keyframe.property === 'rotation')).toBe(true)
  })
})