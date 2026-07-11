import { describe, expect, it } from 'vitest'

import { createDefaultProject, createLayerFromShape, createPathShape } from '@/editor/scene'
import { exportAnimatedSvg, exportStaticSvg } from '@/io/svg-export'
import { DEFAULT_EXPORT_OPTIONS } from '@/io/export-options'

describe('svg export', () => {
  it('exports static svg with transparent background option', () => {
    const project = createDefaultProject()
    const svg = exportStaticSvg(project, {
      ...DEFAULT_EXPORT_OPTIONS,
      background: 'transparent',
    })

    expect(svg).not.toContain('fill="#111827"')
  })

  it('exports animated svg with css keyframes when keyframes exist', () => {
    const project = createDefaultProject()
    const artboardId = project.artboards[0]!.id
    project.layers = [
      {
        id: 'layer-1',
        artboardId,
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
          { id: 'kf-1', time: 0, property: 'y', value: 100 },
          { id: 'kf-2', time: 1, property: 'y', value: 200 },
        ],
      },
    ]

    const svg = exportAnimatedSvg(project)
    expect(svg).toContain('@keyframes')
    expect(svg).toContain('animation:')
  })

  it('exports path shapes with svg path data', () => {
    const project = createDefaultProject()
    const pathLayer = createLayerFromShape(
      createPathShape([
        { x: 10, y: 20 },
        { x: 50, y: 80 },
      ]),
      0,
      project.artboards[0]!.id,
    )
    project.layers = [pathLayer]

    const svg = exportStaticSvg(project)

    expect(svg).toContain('<path')
    expect(svg).toContain('M 10 20 L 50 80')
    expect(svg).toContain('stroke-linecap="round"')
  })
})
