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
          scaleX: 1,
          scaleY: 1,
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

  it('re-emits imported svg filters on export', () => {
    const project = createDefaultProject()
    const artboardId = project.artboards[0]!.id
    const pathLayer = createLayerFromShape(
      createPathShape([
        { x: 10, y: 20 },
        { x: 50, y: 80 },
      ]),
      0,
      artboardId,
    )
    pathLayer.svgFilterId = 'shadow'
    project.layers = [pathLayer]
    project.importedSvg = {
      gradients: {},
      filters: {
        shadow: {
          id: 'shadow',
          markup: '<feDropShadow dx="4" dy="6" stdDeviation="3" />',
        },
      },
    }

    const svg = exportStaticSvg(project)

    expect(svg).toContain('id="imported-filter-shadow"')
    expect(svg).toContain('feDropShadow')
    expect(svg).toContain('filter="url(#imported-filter-shadow)"')
  })

  it('exports animated svg with group keyframes when layerGroups animate', () => {
    const project = createDefaultProject()
    const artboardId = project.artboards[0]!.id
    const groupId = 'group-1'
    project.layers = [
      {
        id: 'layer-1',
        artboardId,
        name: 'Box',
        visible: true,
        locked: false,
        groupId,
        delay: 0,
        shape: {
          id: 'shape-1',
          type: 'rect',
          x: 40,
          y: 40,
          rotation: 0,
          width: 40,
          height: 40,
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 1,
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
        },
        keyframes: [],
      },
    ]
    project.layerGroups = {
      [groupId]: {
        name: 'Group',
        parentGroupId: null,
        keyframes: [
          { id: 'gk-1', time: 0, property: 'y', value: 0 },
          { id: 'gk-2', time: 1, property: 'y', value: 40 },
        ],
      },
    }

    const svg = exportAnimatedSvg(project)
    expect(svg).toContain('@keyframes group-anim-0')
    expect(svg).toContain('translate(0px, 40px)')
    expect(svg).toContain('<g class="group-anim-0">')
  })
})
