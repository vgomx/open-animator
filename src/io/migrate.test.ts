import { describe, expect, it } from 'vitest'

import { migrateProject } from '@/io/migrate'
import { DEFAULT_ARTBOARD, DEFAULT_CANVAS, PROJECT_VERSION } from '@/editor/types'

describe('migrateProject', () => {
  it('migrates v4 projects with locked defaults', () => {
    const migrated = migrateProject({
      version: 4,
      artboard: { ...DEFAULT_ARTBOARD, width: 800, height: 600 },
      duration: 3,
      guides: [],
      layers: [
        {
          id: 'layer-1',
          name: 'Rect',
          visible: true,
          shape: {
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
            scaleX: 1, scaleY: 1,
          },
          keyframes: [],
        },
      ],
    })

    expect(migrated.version).toBe(PROJECT_VERSION)
    expect(migrated.layers[0]?.locked).toBe(false)
    expect(migrated.states).toEqual([])
    expect(migrated.artboards[0]?.width).toBe(800)
    expect(migrated.layers[0]?.artboardId).toBe(migrated.artboards[0]?.id)
  })

  it('migrates v7 projects with artboard defaults', () => {
    const migrated = migrateProject({
      version: 7,
      artboard: { ...DEFAULT_ARTBOARD, width: 640, height: 480 },
      duration: 2,
      loopIn: 0,
      loopOut: 2,
      guides: [],
      states: [],
      markers: [],
      layers: [],
    })

    expect(migrated.version).toBe(PROJECT_VERSION)
    expect(migrated.artboards[0]).toMatchObject({
      name: DEFAULT_ARTBOARD.name,
      width: 640,
      height: 480,
      backgroundColor: DEFAULT_ARTBOARD.backgroundColor,
    })
  })

  it('migrates v8 projects with canvas defaults', () => {
    const migrated = migrateProject({
      version: 8,
      artboard: { ...DEFAULT_ARTBOARD, width: 640, height: 480 },
      duration: 2,
      loopIn: 0,
      loopOut: 2,
      guides: [],
      states: [],
      markers: [],
      layers: [],
    })

    expect(migrated.version).toBe(PROJECT_VERSION)
    expect(migrated.canvas).toEqual(DEFAULT_CANVAS)
    expect(migrated.fps).toBe(30)
  })

  it('migrates v13 projects with cycle duration metadata', () => {
    const migrated = migrateProject({
      version: 13,
      artboard: { ...DEFAULT_ARTBOARD, width: 400, height: 300 },
      duration: 10,
      loopIn: 0,
      loopOut: 10,
      guides: [],
      states: [],
      markers: [],
      layers: [
        {
          id: 'layer-1',
          artboardId: 'artboard-1',
          name: 'Animated',
          visible: true,
          locked: false,
          groupId: null,
          delay: 0,
          shape: {
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
            scaleX: 1,
            scaleY: 1,
          },
          keyframes: [
            { id: 'kf-1', time: 0, property: 'x', value: 0, easing: 'linear' },
            { id: 'kf-2', time: 3, property: 'x', value: 100, easing: 'linear' },
          ],
        },
      ],
      layerGroups: {
        'group-1': {
          name: 'Bob',
          parentGroupId: null,
          keyframes: [
            { id: 'gk-1', time: 0, property: 'y', value: 0, easing: 'linear' },
            { id: 'gk-2', time: 2, property: 'y', value: 8, easing: 'linear' },
          ],
        },
      },
    } as never)

    expect(migrated.version).toBe(PROJECT_VERSION)
    expect(migrated.layers[0]?.cycleDuration).toBe(3)
    expect(migrated.layerGroups?.['group-1']?.cycleDuration).toBe(2)
  })
})
