import { getShapeBounds, type ShapeBounds } from '@/editor/bounds'
import type { Shape } from '@/editor/types'

export function translateShape(shape: Shape, deltaX: number, deltaY: number): Partial<Shape> {
  if (shape.type === 'path') {
    return {
      points: shape.points.map((point) => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      })),
    }
  }

  return {
    x: shape.x + deltaX,
    y: shape.y + deltaY,
  }
}

export function shapePatchFromBoundsDelta(shape: Shape, bounds: ShapeBounds): Partial<Shape> {
  const currentBounds = getShapeBounds(shape)
  return translateShape(shape, bounds.x - currentBounds.x, bounds.y - currentBounds.y)
}
