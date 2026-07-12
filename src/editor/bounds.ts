import type { Shape } from '@/editor/types'
import { applyMatrixToPoint } from '@/io/svg-transform'

export type ShapeBounds = {
  x: number
  y: number
  width: number
  height: number
}

function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.55
}

export function getShapeBounds(shape: Shape): ShapeBounds {
  if (shape.type === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width * shape.scaleX,
      height: shape.height * shape.scaleY,
    }
  }

  if (shape.type === 'text') {
    const width = estimateTextWidth(shape.text, shape.fontSize) * (shape.scaleX || 1)
    const height = shape.fontSize * 1.2 * shape.scaleY
    return {
      x: shape.x,
      y: shape.y - height,
      width,
      height,
    }
  }

  if (shape.type === 'path') {
    if (shape.points.length === 0) {
      return { x: shape.x, y: shape.y, width: 0, height: 0 }
    }

    const points =
      shape.transformMatrix != null
        ? shape.points.map((point) =>
            applyMatrixToPoint(shape.transformMatrix!, point.x, point.y),
          )
        : shape.points

    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys)
    const offsetX = shape.localCoords ? 0 : shape.x
    const offsetY = shape.localCoords ? 0 : shape.y

    return {
      x: minX + offsetX,
      y: minY + offsetY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  if (shape.type === 'ellipse') {
    const width = shape.rx * 2 * shape.scaleX
    const height = shape.ry * 2 * shape.scaleY

    return {
      x: shape.x - shape.rx * shape.scaleX,
      y: shape.y - shape.ry * shape.scaleY,
      width,
      height,
    }
  }

  return { x: 0, y: 0, width: 0, height: 0 }
}

export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export function applyResize(
  shape: Shape,
  handle: ResizeHandle,
  pointerX: number,
  pointerY: number,
  anchor: ShapeBounds,
): Partial<Shape> {
  const minSize = 16

  if (shape.type === 'text') {
    const scaleY = shape.scaleY || 1
    let left = anchor.x
    let top = anchor.y
    let right = anchor.x + anchor.width
    let bottom = anchor.y + anchor.height

    if (handle.includes('w')) {
      left = Math.min(pointerX, right - minSize)
    }
    if (handle.includes('e')) {
      right = Math.max(pointerX, left + minSize)
    }
    if (handle.includes('n')) {
      top = Math.min(pointerY, bottom - minSize)
    }
    if (handle.includes('s')) {
      bottom = Math.max(pointerY, top + minSize)
    }

    const nextHeight = bottom - top
    const fontSize = Math.max(12, nextHeight / 1.2 / scaleY)

    return {
      x: left,
      y: bottom,
      fontSize,
    }
  }

  if (shape.type === 'rect') {
    let left = anchor.x
    let top = anchor.y
    let right = anchor.x + anchor.width
    let bottom = anchor.y + anchor.height

    if (handle.includes('w')) {
      left = Math.min(pointerX, right - minSize)
    }
    if (handle.includes('e')) {
      right = Math.max(pointerX, left + minSize)
    }
    if (handle.includes('n')) {
      top = Math.min(pointerY, bottom - minSize)
    }
    if (handle.includes('s')) {
      bottom = Math.max(pointerY, top + minSize)
    }

    const scaleX = shape.scaleX || 1
    const scaleY = shape.scaleY || 1

    return {
      x: left,
      y: top,
      width: (right - left) / scaleX,
      height: (bottom - top) / scaleY,
    }
  }

  if (shape.type === 'ellipse') {
    let left = anchor.x
    let top = anchor.y
    let right = anchor.x + anchor.width
    let bottom = anchor.y + anchor.height

    if (handle.includes('w')) {
      left = Math.min(pointerX, right - minSize)
    }
    if (handle.includes('e')) {
      right = Math.max(pointerX, left + minSize)
    }
    if (handle.includes('n')) {
      top = Math.min(pointerY, bottom - minSize)
    }
    if (handle.includes('s')) {
      bottom = Math.max(pointerY, top + minSize)
    }

    const scaleX = shape.scaleX || 1
    const scaleY = shape.scaleY || 1
    const centerX = (left + right) / 2
    const centerY = (top + bottom) / 2

    return {
      x: centerX,
      y: centerY,
      rx: (right - left) / 2 / scaleX,
      ry: (bottom - top) / 2 / scaleY,
    }
  }

  return {}
}
