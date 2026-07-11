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
            scale: 1,
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
})
