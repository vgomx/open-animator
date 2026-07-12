import type { Project } from '@/editor/types'
import { createId } from '@/editor/scene'
import {
  SHAPE_FILL_PRIMARY,
  SHAPE_FILL_SECONDARY,
  SHAPE_STROKE_PRIMARY,
  SHAPE_STROKE_SECONDARY,
} from '@/lib/brand-colors'
import { projectDefaults } from '@/lib/project-defaults'
import { trainPerfSampleProject } from '@/lib/templates/train-perf-sample'

export type ProjectTemplate = {
  id: string
  name: string
  description: string
  project: Project
}

function bouncingBallProject(): Project {
  const shapeId = createId()
  const layerId = createId()

  return projectDefaults({
    duration: 2,
    layers: [
      {
        id: layerId,
        name: 'Ball',
        visible: true,
        locked: false,
        shape: {
          id: shapeId,
          type: 'ellipse',
          x: 360,
          y: 120,
          rotation: 0,
          rx: 40,
          ry: 40,
          fill: SHAPE_FILL_PRIMARY,
          stroke: SHAPE_STROKE_PRIMARY,
          strokeWidth: 2,
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
        },
        keyframes: [
          { id: createId(), time: 0, property: 'y', value: 120, easing: 'easeIn' },
          { id: createId(), time: 0.5, property: 'y', value: 420, easing: 'easeOut' },
          { id: createId(), time: 0.68, property: 'y', value: 285, easing: 'easeIn' },
          { id: createId(), time: 0.84, property: 'y', value: 420, easing: 'easeOut' },
          { id: createId(), time: 0.95, property: 'y', value: 365, easing: 'easeIn' },
          { id: createId(), time: 1.05, property: 'y', value: 420, easing: 'easeOut' },
          { id: createId(), time: 1.12, property: 'y', value: 395, easing: 'easeIn' },
          { id: createId(), time: 1.18, property: 'y', value: 420, easing: 'easeInOut' },
          { id: createId(), time: 2, property: 'y', value: 120, easing: 'easeInOut' },
          { id: createId(), time: 0, property: 'scaleX', value: 1, easing: 'hold' },
          { id: createId(), time: 0, property: 'scaleY', value: 1, easing: 'hold' },
          { id: createId(), time: 0.48, property: 'scaleX', value: 1, easing: 'hold' },
          { id: createId(), time: 0.48, property: 'scaleY', value: 1, easing: 'hold' },
          { id: createId(), time: 0.5, property: 'scaleX', value: 1.16, easing: 'easeOut' },
          { id: createId(), time: 0.5, property: 'scaleY', value: 0.68, easing: 'easeOut' },
          { id: createId(), time: 0.58, property: 'scaleX', value: 1, easing: 'easeOut' },
          { id: createId(), time: 0.58, property: 'scaleY', value: 1, easing: 'easeOut' },
          { id: createId(), time: 0.82, property: 'scaleX', value: 1, easing: 'hold' },
          { id: createId(), time: 0.82, property: 'scaleY', value: 1, easing: 'hold' },
          { id: createId(), time: 0.84, property: 'scaleX', value: 1.1, easing: 'easeOut' },
          { id: createId(), time: 0.84, property: 'scaleY', value: 0.76, easing: 'easeOut' },
          { id: createId(), time: 0.9, property: 'scaleX', value: 1, easing: 'easeOut' },
          { id: createId(), time: 0.9, property: 'scaleY', value: 1, easing: 'easeOut' },
          { id: createId(), time: 1.16, property: 'scaleX', value: 1, easing: 'hold' },
          { id: createId(), time: 1.16, property: 'scaleY', value: 1, easing: 'hold' },
          { id: createId(), time: 1.18, property: 'scaleX', value: 1.05, easing: 'easeOut' },
          { id: createId(), time: 1.18, property: 'scaleY', value: 0.88, easing: 'easeOut' },
          { id: createId(), time: 1.24, property: 'scaleX', value: 1, easing: 'easeOut' },
          { id: createId(), time: 1.24, property: 'scaleY', value: 1, easing: 'easeOut' },
        ],
      },
    ],
  })
}

function fadeRevealProject(): Project {
  const rectId = createId()
  const layerId = createId()

  return projectDefaults({
    duration: 3,
    layers: [
      {
        id: layerId,
        name: 'Reveal',
        visible: true,
        locked: false,
        shape: {
          id: rectId,
          type: 'rect',
          x: 250,
          y: 200,
          rotation: 0,
          width: 300,
          height: 200,
          fill: SHAPE_FILL_PRIMARY,
          stroke: SHAPE_STROKE_PRIMARY,
          strokeWidth: 2,
          opacity: 0,
          scaleX: 0.8,
          scaleY: 0.8,
        },
        keyframes: [
          { id: createId(), time: 0, property: 'opacity', value: 0, easing: 'easeIn' },
          { id: createId(), time: 1.2, property: 'opacity', value: 1, easing: 'easeOut' },
          { id: createId(), time: 0, property: 'scaleX', value: 0.8, easing: 'easeInOut' },
          { id: createId(), time: 1.2, property: 'scaleX', value: 1, easing: 'easeInOut' },
          { id: createId(), time: 0, property: 'scaleY', value: 0.8, easing: 'easeInOut' },
          { id: createId(), time: 1.2, property: 'scaleY', value: 1, easing: 'easeInOut' },
          { id: createId(), time: 0, property: 'rotation', value: -8, easing: 'easeInOut' },
          { id: createId(), time: 1.2, property: 'rotation', value: 0, easing: 'easeInOut' },
        ],
      },
    ],
  })
}

function spinnerProject(): Project {
  const layerId = createId()
  const shapeId = createId()

  return projectDefaults({
    duration: 1.5,
    layers: [
      {
        id: layerId,
        name: 'Spinner',
        visible: true,
        locked: false,
        shape: {
          id: shapeId,
          type: 'rect',
          x: 360,
          y: 260,
          rotation: 0,
          width: 80,
          height: 80,
          fill: SHAPE_FILL_SECONDARY,
          stroke: SHAPE_STROKE_SECONDARY,
          strokeWidth: 2,
          opacity: 1,
          scaleX: 1,
          scaleY: 1,
        },
        keyframes: [
          { id: createId(), time: 0, property: 'rotation', value: 0, easing: 'linear' },
          { id: createId(), time: 1.5, property: 'rotation', value: 360, easing: 'linear' },
        ],
      },
    ],
  })
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'bouncing-ball',
    name: 'Bouncing ball',
    description: 'Vertical bounce with squash and elastic rebound.',
    project: bouncingBallProject(),
  },
  {
    id: 'fade-reveal',
    name: 'Fade reveal',
    description: 'Opacity, scale, and rotation intro.',
    project: fadeRevealProject(),
  },
  {
    id: 'spinner',
    name: 'Spinner',
    description: 'Continuous rotation loop.',
    project: spinnerProject(),
  },
  {
    id: 'train-perf-sample',
    name: 'Train parallax (perf sample)',
    description: '72 native layers with 67 animated — use to benchmark playback without SVG import.',
    project: trainPerfSampleProject(),
  },
]
