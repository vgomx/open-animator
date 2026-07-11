import { describe, expect, it } from 'vitest'

import { createId } from '@/editor/scene'
import {
  captureLayerSnapshots,
  createAnimationState,
  smartAnimateBetweenStates,
} from '@/editor/smart-animate'
import type { Project } from '@/editor/types'
import { createArtboard, DEFAULT_CANVAS, DEFAULT_PROJECT_FPS, PROJECT_VERSION } from '@/editor/types'

function createTestProject(): Project {
  const artboard = createArtboard({ width: 800, height: 600 })
  return {
    version: PROJECT_VERSION,
    canvas: { ...DEFAULT_CANVAS },
    artboards: [artboard],
    fps: DEFAULT_PROJECT_FPS,
    duration: 3,
    loopIn: 0,
    loopOut: 3,
    guides: [],
    states: [],
    markers: [],
    layers: [
      {
        id: 'layer-1',
        artboardId: artboard.id,
        name: 'Box',
        visible: true,
        locked: false,
        groupId: null,
        delay: 0,
        shape: {
          id: 'shape-1',
          type: 'rect',
          x: 100,
          y: 100,
          rotation: 0,
          width: 120,
          height: 80,
          fill: '#22d3ee',
          stroke: '#155e75',
          strokeWidth: 2,
          opacity: 1,
          scale: 1,
        },
        keyframes: [],
      },
    ],
  }
}

describe('smart animate', () => {
  it('captures layer snapshots at a given time', () => {
    const project = createTestProject()
    const snapshots = captureLayerSnapshots(project, 0)

    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]?.x).toBe(100)
    expect(snapshots[0]?.width).toBe(120)
  })

  it('generates keyframes between two states for matched layers', () => {
    let project = createTestProject()
    const fromState = createAnimationState(project, 0, 'Start')
    project = {
      ...project,
      layers: project.layers.map((layer) => ({
        ...layer,
        shape: { ...layer.shape, x: 300, y: 220, width: 180 },
      })),
    }
    const toState = createAnimationState(project, 2, 'End')

    project = smartAnimateBetweenStates(
      { ...project, states: [fromState, toState] },
      fromState,
      toState,
    )

    const layer = project.layers[0]
    const xKeyframes = layer?.keyframes.filter((keyframe) => keyframe.property === 'x') ?? []
    const widthKeyframes = layer?.keyframes.filter((keyframe) => keyframe.property === 'width') ?? []

    expect(xKeyframes).toHaveLength(2)
    expect(xKeyframes[0]?.value).toBe(100)
    expect(xKeyframes[1]?.value).toBe(300)
    expect(widthKeyframes[1]?.value).toBe(180)
    expect(xKeyframes[0]?.easing).toBe('easeInOut')
  })

  it('matches layers by name when ids differ', () => {
    const fromState = {
      id: createId(),
      name: 'Start',
      time: 0,
      snapshots: [
        {
          layerId: 'layer-a',
          layerName: 'Logo',
          shapeType: 'rect' as const,
          visible: true,
          x: 0,
          y: 0,
          rotation: 0,
          opacity: 1,
          scale: 1,
          fill: '#000000',
          stroke: '#000000',
          strokeWidth: 1,
          width: 100,
          height: 100,
        },
      ],
    }

    const toState = {
      id: createId(),
      name: 'End',
      time: 1,
      snapshots: [
        {
          layerId: 'layer-b',
          layerName: 'Logo',
          shapeType: 'rect' as const,
          visible: true,
          x: 200,
          y: 0,
          rotation: 0,
          opacity: 1,
          scale: 1,
          fill: '#000000',
          stroke: '#000000',
          strokeWidth: 1,
          width: 100,
          height: 100,
        },
      ],
    }

    const project = smartAnimateBetweenStates(
      {
        ...createTestProject(),
        layers: [
          {
            ...createTestProject().layers[0]!,
            id: 'layer-b',
            name: 'Logo',
          },
        ],
        states: [fromState, toState],
      },
      fromState,
      toState,
    )

    const xKeyframes = project.layers[0]?.keyframes.filter((keyframe) => keyframe.property === 'x')
    expect(xKeyframes?.[0]?.value).toBe(0)
    expect(xKeyframes?.[1]?.value).toBe(200)
  })
})
