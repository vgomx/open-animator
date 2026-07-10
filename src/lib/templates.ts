import type { Project } from '@/editor/types'
import { createId } from '@/editor/scene'
import { projectDefaults } from '@/lib/project-defaults'

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
          fill: '#f97316',
          stroke: '#9a3412',
          strokeWidth: 2,
          opacity: 1,
          scale: 1,
        },
        keyframes: [
          { id: createId(), time: 0, property: 'y', value: 120, easing: 'easeIn' },
          { id: createId(), time: 1, property: 'y', value: 420, easing: 'easeIn' },
          { id: createId(), time: 2, property: 'y', value: 120, easing: 'easeOut' },
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
          fill: '#6366f1',
          stroke: '#312e81',
          strokeWidth: 2,
          opacity: 0,
          scale: 0.8,
        },
        keyframes: [
          { id: createId(), time: 0, property: 'opacity', value: 0, easing: 'easeIn' },
          { id: createId(), time: 1.2, property: 'opacity', value: 1, easing: 'easeOut' },
          { id: createId(), time: 0, property: 'scale', value: 0.8, easing: 'easeInOut' },
          { id: createId(), time: 1.2, property: 'scale', value: 1, easing: 'easeInOut' },
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
          fill: '#22d3ee',
          stroke: '#155e75',
          strokeWidth: 2,
          opacity: 1,
          scale: 1,
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
    description: 'Simple vertical bounce with easing.',
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
]
