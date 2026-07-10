import { getAnimatedShape } from '@/editor/animation'
import type { Layer, Shape } from '@/editor/types'

export type ShapeStylePatch = Pick<Shape, 'fill' | 'stroke' | 'strokeWidth' | 'opacity'>

export function getSelectedAnimatedShapes(
  layers: Layer[],
  selectedLayerIds: string[],
  currentTime: number,
): Array<{ layer: Layer; shape: Shape }> {
  return selectedLayerIds
    .map((id) => layers.find((layer) => layer.id === id))
    .filter((layer): layer is Layer => Boolean(layer))
    .map((layer) => ({
      layer,
      shape: getAnimatedShape(layer, currentTime),
    }))
}

export function getSharedShapeValue<T extends keyof Shape>(
  shapes: Shape[],
  property: T,
): Shape[T] | null {
  if (shapes.length === 0) {
    return null
  }

  const first = shapes[0]![property]
  return shapes.every((shape) => shape[property] === first) ? first : null
}

export function getSharedNumericValue(
  shapes: Shape[],
  property: string,
): { value: number; mixed: boolean } {
  if (shapes.length === 0) {
    return { value: 0, mixed: false }
  }

  const first = (shapes[0] as Record<string, unknown>)[property]
  const mixed = !shapes.every(
    (shape) => (shape as Record<string, unknown>)[property] === first,
  )

  return {
    value: typeof first === 'number' ? first : 0,
    mixed,
  }
}

export function extractShapeStyle(shape: Shape): ShapeStylePatch {
  return {
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
  }
}
