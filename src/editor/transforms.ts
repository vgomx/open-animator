import type { Shape } from '@/editor/types'

export function buildShapeTransform(shape: Shape): string {
  if (shape.type === 'text') {
    return `rotate(${shape.rotation} ${shape.x} ${shape.y}) scale(${shape.scale})`
  }

  if (shape.type === 'rect') {
    const width = shape.width
    const height = shape.height
    return `translate(${shape.x + width / 2} ${shape.y + height / 2}) rotate(${shape.rotation}) scale(${shape.scale}) translate(${-width / 2} ${-height / 2})`
  }

  // Imported/baked path points already live in world space. Keyframed deltas are
  // decomposed as translate(x,y) → rotate → scale around the origin.
  return `translate(${shape.x} ${shape.y}) rotate(${shape.rotation}) scale(${shape.scale})`
}
