import { getShapeBounds, type ShapeBounds } from '@/editor/bounds'
import type { Guide, Layer, SnapLine } from '@/editor/types'
import type { Shape } from '@/editor/types'

export { shapePatchFromBoundsDelta } from '@/editor/shape-transform'

export const DEFAULT_SNAP_THRESHOLD_PX = 8

export type SnapTarget = SnapLine

export function getArtboardSnapTargets(width: number, height: number): SnapTarget[] {
  return [
    { axis: 'x', position: 0 },
    { axis: 'x', position: width / 2 },
    { axis: 'x', position: width },
    { axis: 'y', position: 0 },
    { axis: 'y', position: height / 2 },
    { axis: 'y', position: height },
  ]
}

export function getGuideSnapTargets(guides: Guide[]): SnapTarget[] {
  return guides.map((guide) => ({
    axis: guide.axis,
    position: guide.position,
  }))
}

export function getLayerSnapTargets(
  layers: Layer[],
  currentTime: number,
  excludeLayerId: string | null,
  getAnimatedShape: (layer: Layer, time: number) => Shape,
): SnapTarget[] {
  const targets: SnapTarget[] = []

  for (const layer of layers) {
    if (!layer.visible || layer.id === excludeLayerId) {
      continue
    }

    const shape = getAnimatedShape(layer, currentTime)
    const bounds = getShapeBounds(shape)
    const centerX = bounds.x + bounds.width / 2
    const centerY = bounds.y + bounds.height / 2

    targets.push(
      { axis: 'x', position: bounds.x },
      { axis: 'x', position: centerX },
      { axis: 'x', position: bounds.x + bounds.width },
      { axis: 'y', position: bounds.y },
      { axis: 'y', position: centerY },
      { axis: 'y', position: bounds.y + bounds.height },
    )
  }

  return targets
}

export function collectSnapTargets(options: {
  artboardWidth: number
  artboardHeight: number
  guides: Guide[]
  layers: Layer[]
  currentTime: number
  excludeLayerId: string | null
  getAnimatedShape: (layer: Layer, time: number) => Shape
}): SnapTarget[] {
  return [
    ...getArtboardSnapTargets(options.artboardWidth, options.artboardHeight),
    ...getGuideSnapTargets(options.guides),
    ...getLayerSnapTargets(
      options.layers,
      options.currentTime,
      options.excludeLayerId,
      options.getAnimatedShape,
    ),
  ]
}

function snapAxis(
  values: number[],
  targets: number[],
  threshold: number,
): { delta: number; line: number | null } {
  let bestDelta = 0
  let bestDistance = threshold + 1
  let bestLine: number | null = null

  for (const value of values) {
    for (const target of targets) {
      const distance = Math.abs(value - target)
      if (distance <= threshold && distance < bestDistance) {
        bestDistance = distance
        bestDelta = target - value
        bestLine = target
      }
    }
  }

  return { delta: bestDelta, line: bestLine }
}

export function snapBounds(
  bounds: ShapeBounds,
  targets: SnapTarget[],
  threshold: number,
): { bounds: ShapeBounds; lines: SnapLine[] } {
  const xTargets = targets.filter((target) => target.axis === 'x').map((target) => target.position)
  const yTargets = targets.filter((target) => target.axis === 'y').map((target) => target.position)

  const xSnap = snapAxis([bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width], xTargets, threshold)
  const ySnap = snapAxis([bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height], yTargets, threshold)

  const lines: SnapLine[] = []
  if (xSnap.line !== null) {
    lines.push({ axis: 'x', position: xSnap.line })
  }
  if (ySnap.line !== null) {
    lines.push({ axis: 'y', position: ySnap.line })
  }

  return {
    bounds: {
      ...bounds,
      x: bounds.x + xSnap.delta,
      y: bounds.y + ySnap.delta,
    },
    lines,
  }
}

export function snapPoint(
  x: number,
  y: number,
  targets: SnapTarget[],
  threshold: number,
): { x: number; y: number; lines: SnapLine[] } {
  const xTargets = targets.filter((target) => target.axis === 'x').map((target) => target.position)
  const yTargets = targets.filter((target) => target.axis === 'y').map((target) => target.position)
  const xSnap = snapAxis([x], xTargets, threshold)
  const ySnap = snapAxis([y], yTargets, threshold)

  const lines: SnapLine[] = []
  if (xSnap.line !== null) {
    lines.push({ axis: 'x', position: xSnap.line })
  }
  if (ySnap.line !== null) {
    lines.push({ axis: 'y', position: ySnap.line })
  }

  return {
    x: x + xSnap.delta,
    y: y + ySnap.delta,
    lines,
  }
}


export function snapThresholdForZoom(zoom: number): number {
  return DEFAULT_SNAP_THRESHOLD_PX / Math.max(zoom, 0.25)
}

export function getTickInterval(zoom: number): number {
  const minPixelGap = 48
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]

  for (const candidate of candidates) {
    if (candidate * zoom >= minPixelGap) {
      return candidate
    }
  }

  return 500
}
