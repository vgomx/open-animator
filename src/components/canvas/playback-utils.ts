import { getAnimatedShape } from '@/editor/animation'
import { buildShapeTransform } from '@/editor/transforms'
import type { Layer, Shape } from '@/editor/types'

function shapeTransform(shape: Shape): string {
  if (shape.type === 'path' && shape.transformMatrix) {
    const matrix = shape.transformMatrix
    return `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`
  }

  return buildShapeTransform(shape)
}

export function updatePlaybackLayerTransforms(
  svg: SVGSVGElement,
  layers: Layer[],
  time: number,
): void {
  for (const layer of layers) {
    if (!layer.visible) {
      continue
    }

    let element: SVGGraphicsElement | null = null
    try {
      element = svg.querySelector<SVGGraphicsElement>(
        `[data-playback-layer="${CSS.escape(layer.id)}"]`,
      )
    } catch {
      continue
    }

    if (!element) {
      continue
    }

    try {
      const shape = getAnimatedShape(layer, time)
      element.setAttribute('transform', shapeTransform(shape))
    } catch (error) {
      console.error(`Failed to update playback transform for layer ${layer.id}`, error)
    }
  }
}
