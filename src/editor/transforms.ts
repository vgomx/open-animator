import type { Shape } from '@/editor/types'

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

  // Imported/baked path points already live in world space. Keyframed deltas are
  // decomposed as translate(x,y) → rotate → scale around the origin.
  return `translate(${shape.x} ${shape.y}) rotate(${shape.rotation}) scale(${scaleX} ${scaleY})`
}
