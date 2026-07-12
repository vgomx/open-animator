import { describe, expect, it } from 'vitest'

import { createDefaultProject } from '@/editor/scene'
import { exportCssKeyframes } from '@/io/css-export'

describe('css export', () => {
  it('exports group keyframe blocks from layerGroups', () => {
    const project = createDefaultProject()
    project.layerGroups = {
      'group-1': {
        name: 'Bob',
        parentGroupId: null,
        cycleDuration: 2,
        keyframes: [
          { id: 'gk-1', time: 0, property: 'y', value: 0 },
          { id: 'gk-2', time: 2, property: 'y', value: 12 },
        ],
      },
    }

    const css = exportCssKeyframes(project)

    expect(css).toContain('@keyframes anim-group-0')
    expect(css).toContain('translate(0px, 12px)')
    expect(css).toContain('animation: anim-group-0 2s linear infinite')
  })
})
