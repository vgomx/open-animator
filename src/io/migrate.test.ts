import { describe, expect, it } from 'vitest'

import { migrateProject } from '@/io/migrate'
import { PROJECT_VERSION } from '@/editor/types'

describe('migrateProject', () => {
  it('migrates v4 projects with locked defaults', () => {
    const migrated = migrateProject({
      version: 4,
      artboard: { width: 800, height: 600 },
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
  })
})
