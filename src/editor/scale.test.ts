import { describe, expect, it } from 'vitest'

import { migrateScaleKeyframes, normalizeShapeScale } from '@/editor/scale'
import { migrateProject } from '@/io/migrate'
import { PROJECT_VERSION, type AnimatableProperty } from '@/editor/types'

describe('scale migration', () => {
  it('normalizes legacy uniform scale onto both axes', () => {
    const shape = normalizeShapeScale({
      id: 'shape-1',
      type: 'rect',
      x: 0,
      y: 0,
      rotation: 0,
      width: 100,
      height: 100,
      fill: '#000000',
      stroke: '#ffffff',
      strokeWidth: 1,
      opacity: 1,
      scale: 1.5,
    } as Parameters<typeof normalizeShapeScale>[0])

    expect(shape.scaleX).toBe(1.5)
    expect(shape.scaleY).toBe(1.5)
    expect('scale' in shape).toBe(false)
  })

  it('splits legacy scale keyframes into scaleX and scaleY', () => {
    const keyframes = migrateScaleKeyframes([
      {
        id: 'kf-1',
        time: 1,
        property: 'scale' as AnimatableProperty,
        value: 0.8,
        easing: 'easeOut',
      },
    ])

    expect(keyframes).toHaveLength(2)
    expect(keyframes.map((keyframe) => keyframe.property).sort()).toEqual(['scaleX', 'scaleY'])
    expect(keyframes.every((keyframe) => keyframe.value === 0.8)).toBe(true)
  })

  it('migrates v11 projects to scaleX and scaleY', () => {
    const migrated = migrateProject({
      version: 11,
      canvas: { backgroundColor: '#ffffff' },
      artboards: [{ id: 'artboard-1', name: 'Artboard', width: 800, height: 600, backgroundColor: '#ffffff' }],
      fps: 30,
      duration: 2,
      loopIn: 0,
      loopOut: 2,
      guides: [],
      states: [],
      markers: [],
      layers: [
        {
          id: 'layer-1',
          artboardId: 'artboard-1',
          name: 'Ball',
          visible: true,
          locked: false,
          groupId: null,
          delay: 0,
          shape: {
            id: 'shape-1',
            type: 'ellipse',
            x: 100,
            y: 100,
            rotation: 0,
            rx: 20,
            ry: 20,
            fill: '#ff0000',
            stroke: '#000000',
            strokeWidth: 1,
            opacity: 1,
            scale: 1,
          },
          keyframes: [
            { id: 'kf-1', time: 0.5, property: 'scale', value: 0.7, easing: 'easeOut' },
          ],
        },
      ],
    } as never)

    expect(migrated.version).toBe(PROJECT_VERSION)
    expect(migrated.layers[0]?.shape).toMatchObject({ scaleX: 1, scaleY: 1 })
    expect(migrated.layers[0]?.keyframes.some((keyframe) => keyframe.property === 'scaleX')).toBe(true)
    expect(migrated.layers[0]?.keyframes.some((keyframe) => keyframe.property === 'scaleY')).toBe(true)
    expect(migrated.layers[0]?.keyframes.some((keyframe) => (keyframe.property as string) === 'scale')).toBe(
      false,
    )
  })
})
