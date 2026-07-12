import { sampleNumericTrackAtTime } from '@/editor/animation'
import { resolveLoopTime } from '@/editor/animation-cycle'
import { getShapeBounds } from '@/editor/bounds'
import type { AnimatableProperty, Keyframe, Layer, LayerGroupMeta, Shape } from '@/editor/types'

export const GROUP_ANIMATABLE_PROPERTIES = [
  'x',
  'y',
  'rotation',
  'scaleX',
  'scaleY',
  'opacity',
] as const satisfies readonly AnimatableProperty[]

export type GroupAnimatedValues = {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
}

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
  group?: LayerGroupMeta,
): number {
  if (keyframes.length === 0) {
    return fallback
  }

  let sampleTime = time
  if (group?.cycleDuration && group.cycleDuration > 0) {
    const loopTime = resolveLoopTime(time, {
      duration: group.cycleDuration,
      delay: group.cycleDelay,
      direction: group.cycleDirection,
    })
    if (loopTime === null) {
      return fallback
    }
    sampleTime = loopTime
  }

  const track = keyframes
    .filter((keyframe) => keyframe.property === property)
    .sort((left, right) => left.time - right.time)

  return sampleNumericTrackAtTime(track, sampleTime, fallback)
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

    const translateX = sampleGroupNumeric(keyframes, 'x', time, 0, group)
    const translateY = sampleGroupNumeric(keyframes, 'y', time, 0, group)
    const groupRotation = sampleGroupNumeric(keyframes, 'rotation', time, 0, group)
    const groupScaleX = sampleGroupNumeric(keyframes, 'scaleX', time, 1, group)
    const groupScaleY = sampleGroupNumeric(keyframes, 'scaleY', time, 1, group)
    const groupOpacity = sampleGroupNumeric(keyframes, 'opacity', time, 1, group)

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

export function groupHasAnimation(
  groupId: string,
  layerGroups?: Record<string, LayerGroupMeta>,
): boolean {
  return (layerGroups?.[groupId]?.keyframes?.length ?? 0) > 0
}

export function getGroupAnimatedValues(
  groupId: string,
  layerGroups: Record<string, LayerGroupMeta> | undefined,
  time: number,
): GroupAnimatedValues {
  const keyframes = layerGroups?.[groupId]?.keyframes ?? []

  const group = layerGroups?.[groupId]
  return {
    x: sampleGroupNumeric(keyframes, 'x', time, 0, group),
    y: sampleGroupNumeric(keyframes, 'y', time, 0, group),
    rotation: sampleGroupNumeric(keyframes, 'rotation', time, 0, group),
    scaleX: sampleGroupNumeric(keyframes, 'scaleX', time, 1, group),
    scaleY: sampleGroupNumeric(keyframes, 'scaleY', time, 1, group),
    opacity: sampleGroupNumeric(keyframes, 'opacity', time, 1, group),
  }
}

export function getGroupPropertyValue(
  groupId: string,
  property: (typeof GROUP_ANIMATABLE_PROPERTIES)[number],
  layerGroups: Record<string, LayerGroupMeta> | undefined,
  time: number,
): number {
  const defaults: Record<(typeof GROUP_ANIMATABLE_PROPERTIES)[number], number> = {
    x: 0,
    y: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  }

  const keyframes = layerGroups?.[groupId]?.keyframes ?? []
  const group = layerGroups?.[groupId]
  return sampleGroupNumeric(keyframes, property, time, defaults[property], group)
}
