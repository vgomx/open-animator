import { sampleNumericTrackAtTime } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import type { Keyframe, Layer, LayerGroupMeta, Shape } from '@/editor/types'

export type AnimatedShapeContext = {
  layerGroups?: Record<string, LayerGroupMeta>
}

function getGroupAncestorChain(
  groupId: string | null,
  layerGroups?: Record<string, LayerGroupMeta>,
): string[] {
  if (!groupId || !layerGroups) {
    return []
  }

  const chain: string[] = []
  let current: string | null = groupId

  while (current && layerGroups[current]) {
    chain.push(current)
    current = layerGroups[current]!.parentGroupId
  }

  return chain.reverse()
}

function sampleGroupNumeric(
  keyframes: Keyframe[],
  property: Keyframe['property'],
  time: number,
  fallback: number,
): number {
  if (keyframes.length === 0) {
    return fallback
  }

  const track = keyframes
    .filter((keyframe) => keyframe.property === property)
    .sort((left, right) => left.time - right.time)

  return sampleNumericTrackAtTime(track, time, fallback)
}

function getShapeCenter(shape: Shape): { x: number; y: number } {
  const bounds = getShapeBounds(shape)
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

function centerToTopLeft(
  center: { x: number; y: number },
  shape: Shape,
): Pick<Shape, 'x' | 'y'> {
  const bounds = getShapeBounds(shape)

  if (shape.type === 'ellipse') {
    return { x: center.x, y: center.y }
  }

  return {
    x: center.x - bounds.width / 2,
    y: center.y - bounds.height / 2,
  }
}

export function applyGroupTransformsToShape(
  shape: Shape,
  layer: Layer,
  time: number,
  context?: AnimatedShapeContext,
): Shape {
  const layerGroups = context?.layerGroups
  if (!layerGroups || !layer.groupId) {
    return shape
  }

  let center = getShapeCenter(shape)
  let rotation = shape.rotation
  let scaleX = shape.scaleX
  let scaleY = shape.scaleY
  let opacity = shape.opacity

  for (const groupId of getGroupAncestorChain(layer.groupId, layerGroups)) {
    const group = layerGroups[groupId]
    const keyframes = group?.keyframes ?? []
    if (keyframes.length === 0) {
      continue
    }

    const translateX = sampleGroupNumeric(keyframes, 'x', time, 0)
    const translateY = sampleGroupNumeric(keyframes, 'y', time, 0)
    const groupRotation = sampleGroupNumeric(keyframes, 'rotation', time, 0)
    const groupScaleX = sampleGroupNumeric(keyframes, 'scaleX', time, 1)
    const groupScaleY = sampleGroupNumeric(keyframes, 'scaleY', time, 1)
    const groupOpacity = sampleGroupNumeric(keyframes, 'opacity', time, 1)

    if (groupRotation !== 0) {
      rotation += groupRotation
    }

    if (translateX !== 0) {
      center = { ...center, x: center.x + translateX }
    }

    if (translateY !== 0) {
      center = { ...center, y: center.y + translateY }
    }

    scaleX *= groupScaleX
    scaleY *= groupScaleY
    opacity *= groupOpacity
  }

  return {
    ...shape,
    ...centerToTopLeft(center, shape),
    rotation,
    scaleX,
    scaleY,
    opacity,
  }
}

export function layerHasGroupAnimation(
  layer: Layer,
  layerGroups?: Record<string, LayerGroupMeta>,
): boolean {
  if (!layerGroups || !layer.groupId) {
    return false
  }

  return getGroupAncestorChain(layer.groupId, layerGroups).some(
    (groupId) => (layerGroups[groupId]?.keyframes?.length ?? 0) > 0,
  )
}
