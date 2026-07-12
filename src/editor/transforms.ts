import type { Shape } from '@/editor/types'
import { getShapeBounds } from '@/editor/bounds'

export function buildShapeTransform(shape: Shape): string {
  const scaleX = shape.scaleX
  const scaleY = shape.scaleY

  if (shape.type === 'text') {
    return `rotate(${shape.rotation} ${shape.x} ${shape.y}) scale(${scaleX} ${scaleY})`
  }

  if (shape.type === 'rect') {
    const width = shape.width
    const height = shape.height
    return `translate(${shape.x + width / 2} ${shape.y + height / 2}) rotate(${shape.rotation}) scale(${scaleX} ${scaleY}) translate(${-width / 2} ${-height / 2})`
  }

  // Rotate around the ellipse center; anchor non-uniform squash to the bottom contact point.
  if (shape.type === 'ellipse') {
    return `translate(${shape.x} ${shape.y}) rotate(${shape.rotation}) translate(0 ${shape.ry}) scale(${scaleX} ${scaleY}) translate(0 ${-shape.ry})`
  }

  // Rotate paths around their visual center so imported wheel spokes stay aligned.
  if (shape.type === 'path') {
    const bounds = getShapeBounds(shape)
    const pivotX = bounds.width / 2
    const pivotY = bounds.height / 2
    return `translate(${shape.x + pivotX} ${shape.y + pivotY}) rotate(${shape.rotation}) scale(${scaleX} ${scaleY}) translate(${-pivotX} ${-pivotY})`
  }

  return ''
}
