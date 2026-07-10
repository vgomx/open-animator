import type { PathPoint, PathShape, Shape } from '@/editor/types'

export type ShapeNode = {
  id: string
  x: number
  y: number
  role: 'corner' | 'path' | 'anchor' | 'rotation'
  index?: number
}

export function getShapeNodes(shape: Shape): ShapeNode[] {
  if (shape.type === 'path') {
    return shape.points.map((point, index) => ({
      id: `path-${index}`,
      x: point.x,
      y: point.y,
      role: 'path' as const,
      index,
    }))
  }

  if (shape.type === 'rect') {
    const { x, y, width, height } = shape
    return [
      { id: 'nw', x, y, role: 'corner' },
      { id: 'ne', x: x + width, y, role: 'corner' },
      { id: 'se', x: x + width, y: y + height, role: 'corner' },
      { id: 'sw', x, y: y + height, role: 'corner' },
    ]
  }

  if (shape.type === 'ellipse') {
    return [
      { id: 'e', x: shape.x + shape.rx, y: shape.y, role: 'corner' },
      { id: 'w', x: shape.x - shape.rx, y: shape.y, role: 'corner' },
      { id: 'n', x: shape.x, y: shape.y - shape.ry, role: 'corner' },
      { id: 's', x: shape.x, y: shape.y + shape.ry, role: 'corner' },
    ]
  }

  return [{ id: 'anchor', x: shape.x, y: shape.y, role: 'anchor' }]
}

export function applyNodePosition(shape: Shape, node: ShapeNode, x: number, y: number): Partial<Shape> {
  if (shape.type === 'path' && node.index !== undefined) {
    const points = shape.points.map((point, index) =>
      index === node.index ? { x, y } : point,
    )
    return { points }
  }

  if (shape.type === 'rect') {
    const left = shape.x
    const top = shape.y
    const right = shape.x + shape.width
    const bottom = shape.y + shape.height

    switch (node.id) {
      case 'nw':
        return { x, y, width: right - x, height: bottom - y }
      case 'ne':
        return { y, width: x - left, height: bottom - y }
      case 'se':
        return { width: x - left, height: y - top }
      case 'sw':
        return { x, width: right - x, height: y - top }
      default:
        return {}
    }
  }

  if (shape.type === 'ellipse') {
    switch (node.id) {
      case 'e':
        return { rx: Math.max(4, x - shape.x) }
      case 'w':
        return { rx: Math.max(4, shape.x - x), x: (x + shape.x) / 2 }
      case 'n':
        return { ry: Math.max(4, shape.y - y) }
      case 's':
        return { ry: Math.max(4, y - shape.y) }
      default:
        return {}
    }
  }

  if (shape.type === 'text') {
    return { x, y }
  }

  return { x, y }
}

export function deletePathNodes(shape: Shape, indices: number[]): Partial<Shape> | null {
  if (shape.type !== 'path' || indices.length === 0) {
    return null
  }

  const indexSet = new Set(indices)
  const points = shape.points.filter((_, index) => !indexSet.has(index))
  if (points.length < 2) {
    return null
  }

  return { points }
}

export function pathPointsToString(points: PathPoint[], closed: boolean): string {
  if (points.length === 0) {
    return ''
  }

  const [first, ...rest] = points
  const segments = rest.map((point) => `L ${point.x} ${point.y}`).join(' ')
  const close = closed ? ' Z' : ''
  return `M ${first.x} ${first.y} ${segments}${close}`.trim()
}

export function normalizePathShape(shape: PathShape): PathShape {
  if (shape.points.length === 0) {
    return shape
  }

  const xs = shape.points.map((point) => point.x)
  const ys = shape.points.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)

  return {
    ...shape,
    x: minX,
    y: minY,
    points: shape.points.map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    })),
  }
}
