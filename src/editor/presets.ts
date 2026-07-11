import { createId } from '@/editor/scene'
import { getShapeBounds } from '@/editor/bounds'
import { getExportArtboard } from '@/editor/artboard-utils'
import type { Keyframe, Layer, Project, Shape } from '@/editor/types'

export type PresetId =
  | 'bounce'
  | 'fadeIn'
  | 'fadeOut'
  | 'slideInLeft'
  | 'slideInRight'
  | 'slideInTop'
  | 'slideInBottom'
  | 'pulse'
  | 'spin'
  | 'pop'
  | 'shake'
  | 'float'

export type PresetOptions = {
  duration: number
  intensity?: number
}

export type AnimationPreset = {
  id: PresetId
  name: string
  description: string
  icon: string
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  { id: 'bounce', name: 'Bounce', description: 'Vertical bounce with squash', icon: '⬇️' },
  { id: 'fadeIn', name: 'Fade in', description: 'Opacity 0 → 1', icon: '✨' },
  { id: 'fadeOut', name: 'Fade out', description: 'Opacity 1 → 0', icon: '🌫️' },
  { id: 'slideInLeft', name: 'Slide in left', description: 'Enter from the left', icon: '⬅️' },
  { id: 'slideInRight', name: 'Slide in right', description: 'Enter from the right', icon: '➡️' },
  { id: 'slideInTop', name: 'Slide in top', description: 'Enter from above', icon: '⬆️' },
  { id: 'slideInBottom', name: 'Slide in bottom', description: 'Enter from below', icon: '⬇️' },
  { id: 'pulse', name: 'Pulse', description: 'Scale up and back', icon: '💓' },
  { id: 'spin', name: 'Spin', description: 'Full 360° rotation', icon: '🔄' },
  { id: 'pop', name: 'Pop', description: 'Quick scale burst', icon: '💥' },
  { id: 'shake', name: 'Shake', description: 'Horizontal wiggle', icon: '📳' },
  { id: 'float', name: 'Float', description: 'Gentle vertical drift', icon: '🎈' },
]

function kf(
  time: number,
  property: Keyframe['property'],
  value: number | string,
  easing: Keyframe['easing'] = 'easeInOut',
): Keyframe {
  return { id: createId(), time, property, value, easing }
}

function sampleShape(layer: Layer): Shape {
  return layer.shape
}

export function generatePresetKeyframes(
  layer: Layer,
  presetId: PresetId,
  startTime: number,
  project: Project,
  options: PresetOptions,
): Keyframe[] {
  const duration = Math.max(0.1, options.duration)
  const endTime = Math.min(project.duration, startTime + duration)
  const midTime = startTime + duration / 2
  const shape = sampleShape(layer)
  const artboard = getExportArtboard(project)
  const bounds = getShapeBounds(shape)
  const intensity = options.intensity ?? 1

  switch (presetId) {
    case 'bounce': {
      const floor = artboard.height - bounds.height - 40
      return [
        kf(startTime, 'y', shape.y, 'easeOut'),
        kf(midTime, 'y', floor, 'bounce'),
        kf(endTime, 'y', floor - 30 * intensity, 'bounce'),
        kf(endTime, 'scale', shape.scale, 'easeOut'),
        kf(midTime, 'scale', shape.scale * (1 + 0.08 * intensity), 'easeIn'),
      ]
    }
    case 'fadeIn':
      return [
        kf(startTime, 'opacity', 0, 'easeOut'),
        kf(endTime, 'opacity', shape.opacity, 'easeOut'),
      ]
    case 'fadeOut':
      return [
        kf(startTime, 'opacity', shape.opacity, 'easeIn'),
        kf(endTime, 'opacity', 0, 'easeIn'),
      ]
    case 'slideInLeft':
      return [
        kf(startTime, 'x', -bounds.width - 20, 'easeOut'),
        kf(endTime, 'x', shape.x, 'easeOut'),
      ]
    case 'slideInRight':
      return [
        kf(startTime, 'x', artboard.width + 20, 'easeOut'),
        kf(endTime, 'x', shape.x, 'easeOut'),
      ]
    case 'slideInTop':
      return [
        kf(startTime, 'y', -bounds.height - 20, 'easeOut'),
        kf(endTime, 'y', shape.y, 'easeOut'),
      ]
    case 'slideInBottom':
      return [
        kf(startTime, 'y', artboard.height + 20, 'easeOut'),
        kf(endTime, 'y', shape.y, 'easeOut'),
      ]
    case 'pulse':
      return [
        kf(startTime, 'scale', shape.scale, 'easeInOut'),
        kf(midTime, 'scale', shape.scale * (1 + 0.15 * intensity), 'easeInOut'),
        kf(endTime, 'scale', shape.scale, 'easeInOut'),
      ]
    case 'spin':
      return [
        kf(startTime, 'rotation', shape.rotation, 'linear'),
        kf(endTime, 'rotation', shape.rotation + 360 * intensity, 'linear'),
      ]
    case 'pop':
      return [
        kf(startTime, 'scale', shape.scale * 0.6, 'easeOut'),
        kf(startTime + duration * 0.35, 'scale', shape.scale * (1 + 0.2 * intensity), 'easeOut'),
        kf(endTime, 'scale', shape.scale, 'spring'),
      ]
    case 'shake': {
      const amount = 8 * intensity
      const step = duration / 6
      return [
        kf(startTime, 'x', shape.x, 'linear'),
        kf(startTime + step, 'x', shape.x - amount, 'linear'),
        kf(startTime + step * 2, 'x', shape.x + amount, 'linear'),
        kf(startTime + step * 3, 'x', shape.x - amount * 0.7, 'linear'),
        kf(startTime + step * 4, 'x', shape.x + amount * 0.5, 'linear'),
        kf(endTime, 'x', shape.x, 'easeOut'),
      ]
    }
    case 'float':
      return [
        kf(startTime, 'y', shape.y, 'easeInOut'),
        kf(midTime, 'y', shape.y - 24 * intensity, 'easeInOut'),
        kf(endTime, 'y', shape.y, 'easeInOut'),
      ]
    default:
      return []
  }
}

export function mergeKeyframes(layer: Layer, incoming: Keyframe[]): Layer {
  const merged = [...layer.keyframes]

  for (const keyframe of incoming) {
    const existingIndex = merged.findIndex(
      (item) =>
        item.property === keyframe.property && Math.abs(item.time - keyframe.time) < 0.001,
    )

    if (existingIndex >= 0) {
      merged[existingIndex] = { ...keyframe, id: merged[existingIndex].id }
    } else {
      merged.push(keyframe)
    }
  }

  return { ...layer, keyframes: merged }
}

export function applyPresetToLayers(
  layers: Layer[],
  presetId: PresetId,
  startTime: number,
  project: Project,
  options: PresetOptions,
): Layer[] {
  const layerIds = new Set(layers.map((layer) => layer.id))

  return project.layers.map((layer) => {
    if (!layerIds.has(layer.id)) {
      return layer
    }

    const keyframes = generatePresetKeyframes(layer, presetId, startTime, project, options)
    return mergeKeyframes(layer, keyframes)
  })
}

export function staggerLayerKeyframes(layers: Layer[], interval: number): Layer[] {
  const selectedIds = new Set(layers.map((layer) => layer.id))

  return layers.map((layer) => {
    if (!selectedIds.has(layer.id)) {
      return layer
    }

    const index = layers.findIndex((item) => item.id === layer.id)
    const offset = index * interval

    return {
      ...layer,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        time: Math.max(0, keyframe.time + offset),
      })),
    }
  })
}
