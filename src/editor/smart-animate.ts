import { getAnimatedShape } from '@/editor/animation'
import { createId } from '@/editor/scene'
import type {
  AnimatableProperty,
  AnimationState,
  Keyframe,
  Layer,
  LayerStateSnapshot,
  Project,
  Shape,
} from '@/editor/types'
import { isColorProperty } from '@/editor/types'

const TIME_EPSILON = 0.001

type SnapshotPair = {
  from?: LayerStateSnapshot
  to?: LayerStateSnapshot
}

export function snapshotFromShape(layer: Layer, shape: Shape): LayerStateSnapshot {
  const snapshot: LayerStateSnapshot = {
    layerId: layer.id,
    layerName: layer.name,
    shapeType: shape.type,
    visible: layer.visible,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    opacity: layer.visible ? shape.opacity : 0,
    scaleX: shape.scaleX,
    scaleY: shape.scaleY,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
  }

  if (shape.type === 'rect') {
    snapshot.width = shape.width
    snapshot.height = shape.height
  } else if (shape.type === 'ellipse') {
    snapshot.rx = shape.rx
    snapshot.ry = shape.ry
  } else if (shape.type === 'text') {
    snapshot.text = shape.text
    snapshot.fontSize = shape.fontSize
    snapshot.fontFamily = shape.fontFamily
  }

  return snapshot
}

export function captureLayerSnapshots(project: Project, time: number): LayerStateSnapshot[] {
  return project.layers.map((layer) => {
    const shape = getAnimatedShape(layer, time)
    return snapshotFromShape(layer, shape)
  })
}

function propertiesForSnapshot(snapshot: LayerStateSnapshot): AnimatableProperty[] {
  const shared: AnimatableProperty[] = [
    'x',
    'y',
    'rotation',
    'opacity',
    'scaleX',
    'scaleY',
    'fill',
    'stroke',
  ]

  if (snapshot.shapeType === 'rect') {
    return [...shared, 'width', 'height']
  }

  if (snapshot.shapeType === 'text') {
    return [...shared, 'fontSize']
  }

  return [...shared, 'rx', 'ry']
}

function readSnapshotValue(
  snapshot: LayerStateSnapshot,
  property: AnimatableProperty,
): number | string | undefined {
  if (property === 'width' || property === 'height' || property === 'rx' || property === 'ry') {
    const value = snapshot[property]
    return typeof value === 'number' ? value : undefined
  }

  if (property === 'fontSize') {
    return snapshot.fontSize
  }

  return snapshot[property]
}

function valuesEqual(
  left: number | string | undefined,
  right: number | string | undefined,
): boolean {
  if (left === undefined || right === undefined) {
    return false
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return Math.abs(left - right) < TIME_EPSILON
  }

  return left === right
}

function upsertKeyframe(
  keyframes: Keyframe[],
  time: number,
  property: AnimatableProperty,
  value: number | string,
  easing?: Keyframe['easing'],
): Keyframe[] {
  const existingIndex = keyframes.findIndex(
    (keyframe) =>
      keyframe.property === property && Math.abs(keyframe.time - time) < TIME_EPSILON,
  )

  const nextKeyframes = [...keyframes]

  if (existingIndex >= 0) {
    nextKeyframes[existingIndex] = {
      ...nextKeyframes[existingIndex],
      value,
      easing: easing ?? nextKeyframes[existingIndex].easing,
    }
    return nextKeyframes
  }

  nextKeyframes.push({
    id: createId(),
    time,
    property,
    value,
    easing,
  })

  return nextKeyframes
}

function matchSnapshots(
  fromSnapshots: LayerStateSnapshot[],
  toSnapshots: LayerStateSnapshot[],
): SnapshotPair[] {
  const pairs: SnapshotPair[] = []
  const usedToIds = new Set<string>()
  const usedFromIds = new Set<string>()

  for (const from of fromSnapshots) {
    const to = toSnapshots.find((snapshot) => snapshot.layerId === from.layerId)
    if (to) {
      pairs.push({ from, to })
      usedToIds.add(to.layerId)
      usedFromIds.add(from.layerId)
    }
  }

  for (const from of fromSnapshots) {
    if (usedFromIds.has(from.layerId)) {
      continue
    }

    const to = toSnapshots.find(
      (snapshot) =>
        !usedToIds.has(snapshot.layerId) &&
        snapshot.layerName === from.layerName &&
        snapshot.shapeType === from.shapeType,
    )

    if (to) {
      pairs.push({ from, to })
      usedToIds.add(to.layerId)
      usedFromIds.add(from.layerId)
    }
  }

  for (const from of fromSnapshots) {
    if (!usedFromIds.has(from.layerId)) {
      pairs.push({ from })
    }
  }

  for (const to of toSnapshots) {
    if (!usedToIds.has(to.layerId)) {
      pairs.push({ to })
    }
  }

  return pairs
}

function applySnapshotPairToLayer(
  layer: Layer,
  pair: SnapshotPair,
  fromTime: number,
  toTime: number,
): Layer {
  let keyframes = [...layer.keyframes]

  if (pair.from && pair.to) {
    if (pair.from.shapeType !== pair.to.shapeType) {
      return layer
    }

    const properties = new Set<AnimatableProperty>([
      ...propertiesForSnapshot(pair.from),
      ...propertiesForSnapshot(pair.to),
    ])

    for (const property of properties) {
      const fromValue = readSnapshotValue(pair.from, property)
      const toValue = readSnapshotValue(pair.to, property)

      if (fromValue === undefined || toValue === undefined) {
        continue
      }

      if (!valuesEqual(fromValue, toValue)) {
        keyframes = upsertKeyframe(keyframes, fromTime, property, fromValue, 'easeInOut')
        keyframes = upsertKeyframe(keyframes, toTime, property, toValue)
      } else {
        keyframes = upsertKeyframe(keyframes, fromTime, property, fromValue)
        keyframes = upsertKeyframe(keyframes, toTime, property, toValue)
      }
    }

    return { ...layer, keyframes }
  }

  if (pair.from && !pair.to) {
    const fromOpacity = pair.from.opacity
    keyframes = upsertKeyframe(keyframes, fromTime, 'opacity', fromOpacity, 'easeInOut')
    keyframes = upsertKeyframe(keyframes, toTime, 'opacity', 0)
    return { ...layer, keyframes }
  }

  if (!pair.from && pair.to) {
    const toOpacity = pair.to.opacity
    keyframes = upsertKeyframe(keyframes, fromTime, 'opacity', 0, 'easeInOut')
    keyframes = upsertKeyframe(keyframes, toTime, 'opacity', toOpacity)

    for (const property of propertiesForSnapshot(pair.to)) {
      if (property === 'opacity') {
        continue
      }

      const toValue = readSnapshotValue(pair.to, property)
      if (toValue === undefined) {
        continue
      }

      keyframes = upsertKeyframe(keyframes, toTime, property, toValue)
    }

    return { ...layer, keyframes }
  }

  return layer
}

export function pinLayerKeyframesAtTime(layer: Layer, time: number): Layer {
  const shape = getAnimatedShape(layer, time)
  let keyframes = [...layer.keyframes]

  const snapshot = snapshotFromShape(layer, shape)
  for (const property of propertiesForSnapshot(snapshot)) {
    const value = readSnapshotValue(snapshot, property)
    if (value === undefined) {
      continue
    }

    if (isColorProperty(property)) {
      keyframes = upsertKeyframe(keyframes, time, property, value)
    } else {
      keyframes = upsertKeyframe(keyframes, time, property, value)
    }
  }

  return { ...layer, keyframes }
}

export function smartAnimateBetweenStates(
  project: Project,
  fromState: AnimationState,
  toState: AnimationState,
): Project {
  if (fromState.time >= toState.time) {
    return project
  }

  const pairs = matchSnapshots(fromState.snapshots, toState.snapshots)
  const layers = project.layers.map((layer) => {
    const pair = pairs.find(
      (item) => item.from?.layerId === layer.id || item.to?.layerId === layer.id,
    )

    if (!pair) {
      return layer
    }

    return applySnapshotPairToLayer(layer, pair, fromState.time, toState.time)
  })

  return { ...project, layers }
}

export function smartAnimateAllStates(project: Project): Project {
  const orderedStates = [...project.states].sort((left, right) => left.time - right.time)

  return orderedStates.slice(1).reduce((currentProject, state, index) => {
    const previousState = orderedStates[index]
    return smartAnimateBetweenStates(currentProject, previousState, state)
  }, project)
}

export function createAnimationState(project: Project, time: number, name?: string): AnimationState {
  const snapshots = captureLayerSnapshots(project, time)
  const stateNumber = project.states.length + 1

  return {
    id: createId(),
    name: name ?? `State ${stateNumber}`,
    time,
    snapshots,
  }
}
