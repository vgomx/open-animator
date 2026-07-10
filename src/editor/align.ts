import { getShapeBounds, type ShapeBounds } from '@/editor/bounds'
import { shapePatchFromBoundsDelta } from '@/editor/snap'
import type { Shape } from '@/editor/types'

export type LayerAlignment =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom'

export type DistributeAxis = 'horizontal' | 'vertical'

type AlignedItem = {
  id: string
  shape: Shape
}

function unionBounds(boundsList: ShapeBounds[]): ShapeBounds {
  const left = Math.min(...boundsList.map((bounds) => bounds.x))
  const top = Math.min(...boundsList.map((bounds) => bounds.y))
  const right = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width))
  const bottom = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height))

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

function targetBoundsForAlignment(
  bounds: ShapeBounds,
  reference: ShapeBounds,
  alignment: LayerAlignment,
): ShapeBounds {
  switch (alignment) {
    case 'left':
      return { ...bounds, x: reference.x }
    case 'center-h':
      return {
        ...bounds,
        x: reference.x + reference.width / 2 - bounds.width / 2,
      }
    case 'right':
      return { ...bounds, x: reference.x + reference.width - bounds.width }
    case 'top':
      return { ...bounds, y: reference.y }
    case 'center-v':
      return {
        ...bounds,
        y: reference.y + reference.height / 2 - bounds.height / 2,
      }
    case 'bottom':
      return { ...bounds, y: reference.y + reference.height - bounds.height }
  }
}

export function alignSelectionToArtboard(
  items: AlignedItem[],
  artboard: { width: number; height: number },
  alignment: LayerAlignment,
): Map<string, Partial<Shape>> {
  if (items.length === 0) {
    return new Map()
  }

  if (items.length === 1) {
    return new Map([
      [items[0]!.id, alignShapeToArtboard(items[0]!.shape, artboard, alignment)],
    ])
  }

  const boundsList = items.map((item) => getShapeBounds(item.shape))
  const union = unionBounds(boundsList)
  const targetUnion = targetBoundsForAlignment(
    union,
    { x: 0, y: 0, width: artboard.width, height: artboard.height },
    alignment,
  )
  const deltaX = targetUnion.x - union.x
  const deltaY = targetUnion.y - union.y
  const patches = new Map<string, Partial<Shape>>()

  for (const item of items) {
    patches.set(item.id, {
      x: item.shape.x + deltaX,
      y: item.shape.y + deltaY,
    })
  }

  return patches
}

export function alignShapeToArtboard(
  shape: Shape,
  artboard: { width: number; height: number },
  alignment: LayerAlignment,
): Partial<Shape> {
  const bounds = getShapeBounds(shape)
  const reference: ShapeBounds = {
    x: 0,
    y: 0,
    width: artboard.width,
    height: artboard.height,
  }

  return shapePatchFromBoundsDelta(
    shape,
    targetBoundsForAlignment(bounds, reference, alignment),
  )
}

export function alignShapesTogether(
  items: AlignedItem[],
  alignment: LayerAlignment,
): Map<string, Partial<Shape>> {
  if (items.length === 0) {
    return new Map()
  }

  const boundsList = items.map((item) => getShapeBounds(item.shape))
  const reference = unionBounds(boundsList)
  const patches = new Map<string, Partial<Shape>>()

  items.forEach((item, index) => {
    const nextBounds = targetBoundsForAlignment(boundsList[index]!, reference, alignment)
    patches.set(item.id, shapePatchFromBoundsDelta(item.shape, nextBounds))
  })

  return patches
}

export function distributeShapes(
  items: AlignedItem[],
  axis: DistributeAxis,
): Map<string, Partial<Shape>> {
  if (items.length < 3) {
    return new Map()
  }

  const entries = items.map((item) => ({
    id: item.id,
    shape: item.shape,
    bounds: getShapeBounds(item.shape),
  }))

  const sorted = [...entries].sort((left, right) =>
    axis === 'horizontal' ? left.bounds.x - right.bounds.x : left.bounds.y - right.bounds.y,
  )

  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!
  const spanStart = axis === 'horizontal' ? first.bounds.x : first.bounds.y
  const spanEnd =
    axis === 'horizontal'
      ? last.bounds.x + last.bounds.width
      : last.bounds.y + last.bounds.height
  const totalSize = sorted.reduce(
    (sum, entry) =>
      sum + (axis === 'horizontal' ? entry.bounds.width : entry.bounds.height),
    0,
  )
  const gap = (spanEnd - spanStart - totalSize) / (sorted.length - 1)

  const patches = new Map<string, Partial<Shape>>()
  let cursor = spanStart

  sorted.forEach((entry) => {
    const nextBounds =
      axis === 'horizontal'
        ? { ...entry.bounds, x: cursor }
        : { ...entry.bounds, y: cursor }

    patches.set(entry.id, shapePatchFromBoundsDelta(entry.shape, nextBounds))
    cursor += (axis === 'horizontal' ? entry.bounds.width : entry.bounds.height) + gap
  })

  return patches
}
