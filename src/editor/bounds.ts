import type { Shape } from '@/editor/types'

export type ShapeBounds = {
  x: number
  y: number
  width: number
  height: number
}

export function getShapeBounds(shape: Shape): ShapeBounds {
  if (shape.type === 'rect') {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width * shape.scale,
      height: shape.height * shape.scale,
    }
  }

  const width = shape.rx * 2 * shape.scale
  const height = shape.ry * 2 * shape.scale

  return {
    x: shape.x - shape.rx * shape.scale,
    y: shape.y - shape.ry * shape.scale,
    width,
    height,
  }
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

    const scale = shape.scale || 1

    return {
      x: left,
      y: top,
      width: (right - left) / scale,
      height: (bottom - top) / scale,
    }
  }

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

  const scale = shape.scale || 1
  const centerX = (left + right) / 2
  const centerY = (top + bottom) / 2

  return {
    x: centerX,
    y: centerY,
    rx: (right - left) / 2 / scale,
    ry: (bottom - top) / 2 / scale,
  }
}
