import type { PathPoint, PathShape, Shape } from '@/editor/types'

export type ShapeNode = {
  id: string
  x: number
  y: number
  role: 'corner' | 'path' | 'anchor' | 'rotation' | 'handle-in' | 'handle-out'
  index?: number
}

export function getShapeNodes(shape: Shape): ShapeNode[] {
  if (shape.type === 'path') {
    const nodes: ShapeNode[] = []

    shape.points.forEach((point, index) => {
      nodes.push({
        id: `path-${index}`,
        x: point.x,
        y: point.y,
        role: 'path',
        index,
      })

      if (point.handleIn) {
        nodes.push({
          id: `path-${index}-in`,
          x: point.handleIn.x,
          y: point.handleIn.y,
          role: 'handle-in',
          index,
        })
      }

      if (point.handleOut) {
        nodes.push({
          id: `path-${index}-out`,
          x: point.handleOut.x,
          y: point.handleOut.y,
          role: 'handle-out',
          index,
        })
      }
    })

    return nodes
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

function updatePathPoint(shape: PathShape, index: number, point: PathPoint): Partial<Shape> {
  return {
    points: shape.points.map((current, pointIndex) => (pointIndex === index ? point : current)),
  }
}

export function applyNodePosition(shape: Shape, node: ShapeNode, x: number, y: number): Partial<Shape> {
  if (shape.type === 'path' && node.index !== undefined) {
    const point = shape.points[node.index]
    if (!point) {
      return {}
    }

    if (node.role === 'path') {
      const deltaX = x - point.x
      const deltaY = y - point.y
      return updatePathPoint(shape, node.index, {
        ...point,
        x,
        y,
        handleIn: point.handleIn
          ? { x: point.handleIn.x + deltaX, y: point.handleIn.y + deltaY }
          : point.handleIn,
        handleOut: point.handleOut
          ? { x: point.handleOut.x + deltaX, y: point.handleOut.y + deltaY }
          : point.handleOut,
      })
    }

    if (node.role === 'handle-in') {
      return updatePathPoint(shape, node.index, {
        ...point,
        handleIn: { x, y },
      })
    }

    if (node.role === 'handle-out') {
      return updatePathPoint(shape, node.index, {
        ...point,
        handleOut: { x, y },
      })
    }
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

function segmentTo(
  previous: PathPoint,
  current: PathPoint,
): string {
  if (previous.handleOut && current.handleIn) {
    return `C ${previous.handleOut.x} ${previous.handleOut.y} ${current.handleIn.x} ${current.handleIn.y} ${current.x} ${current.y}`
  }

  if (previous.handleOut) {
    return `Q ${previous.handleOut.x} ${previous.handleOut.y} ${current.x} ${current.y}`
  }

  return `L ${current.x} ${current.y}`
}

export function pathPointsToString(points: PathPoint[], closed: boolean): string {
  if (points.length === 0) {
    return ''
  }

  const [first, ...rest] = points
  const segments = rest.map((point, index) => segmentTo(points[index]!, point)).join(' ')
  const close =
    closed && points.length > 2
      ? ` ${segmentTo(points[points.length - 1]!, first!)} Z`
      : closed
        ? ' Z'
        : ''

  return `M ${first!.x} ${first!.y} ${segments}${close}`.trim()
}

export function createPathPointWithHandle(
  anchor: PathPoint,
  handleOut: { x: number; y: number } | null,
): PathPoint {
  if (!handleOut) {
    return { x: anchor.x, y: anchor.y }
  }

  const distance = Math.hypot(handleOut.x - anchor.x, handleOut.y - anchor.y)
  if (distance < 4) {
    return { x: anchor.x, y: anchor.y }
  }

  return {
    x: anchor.x,
    y: anchor.y,
    handleOut,
    handleIn: {
      x: anchor.x + (anchor.x - handleOut.x),
      y: anchor.y + (anchor.y - handleOut.y),
    },
  }
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
      ...point,
      x: point.x - minX,
      y: point.y - minY,
      handleIn: point.handleIn
        ? { x: point.handleIn.x - minX, y: point.handleIn.y - minY }
        : point.handleIn,
      handleOut: point.handleOut
        ? { x: point.handleOut.x - minX, y: point.handleOut.y - minY }
        : point.handleOut,
    })),
  }
}
