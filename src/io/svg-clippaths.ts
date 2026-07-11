import type { ImportedGradient } from '@/io/svg-gradients'
import { resolvePaintValue } from '@/io/svg-gradients'
import type { AffineMatrix } from '@/io/svg-transform'
import { formatMatrixAttribute, invertMatrix } from '@/io/svg-transform'
import type { Layer, Shape } from '@/editor/types'
import { resolveMaskId } from '@/io/svg-masks'

export type ImportedClipPath = {
  id: string
  /** Serialized clipPath subtree. */
  markup: string
}

function rewriteClipElement(element: Element, gradients: Record<string, ImportedGradient>): void {
  const fill = element.getAttribute('fill')
  if (fill) {
    element.setAttribute('fill', resolvePaintValue(fill, fill, gradients))
  }

  const stroke = element.getAttribute('stroke')
  if (stroke) {
    element.setAttribute('stroke', resolvePaintValue(stroke, stroke, gradients))
  }

  for (const child of [...element.children]) {
    rewriteClipElement(child, gradients)
  }
}

export function parseSvgClipPaths(
  svg: SVGSVGElement,
  gradients: Record<string, ImportedGradient>,
): Record<string, ImportedClipPath> {
  const clipPaths: Record<string, ImportedClipPath> = {}

  for (const clipPath of svg.querySelectorAll('clipPath')) {
    const id = clipPath.getAttribute('id')
    if (!id) {
      continue
    }

    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    for (const child of [...clipPath.children]) {
      const clone = child.cloneNode(true) as Element
      rewriteClipElement(clone, gradients)
      container.appendChild(clone)
    }

    clipPaths[id] = {
      id,
      markup: container.innerHTML,
    }
  }

  return clipPaths
}

export function importedClipPathId(id: string): string {
  return `imported-clip-${id}`
}

export function createLocalSpaceClipPathInstance(
  clipPaths: Record<string, ImportedClipPath>,
  clipPathId: string,
  layerKey: string,
  referenceMatrix: AffineMatrix,
): string | null {
  const source = clipPaths[clipPathId]
  if (!source) {
    return null
  }

  const inverse = invertMatrix(referenceMatrix)
  if (!inverse) {
    return clipPathId
  }

  const localId = `${clipPathId}__${layerKey}`
  clipPaths[localId] = {
    id: localId,
    markup: `<g transform="${formatMatrixAttribute(inverse)}">${source.markup}</g>`,
  }

  return localId
}

export function resolveLayerClipPathId(
  sourceClipPaths: Record<string, ImportedClipPath>,
  layer: Layer,
  shape: Shape,
): string | null {
  if (!layer.svgClipPathId) {
    return null
  }

  if (shape.type !== 'path' || !shape.transformMatrix) {
    return layer.svgClipPathId
  }

  const runtimeClipPaths = { ...sourceClipPaths }
  return createLocalSpaceClipPathInstance(
    runtimeClipPaths,
    layer.svgClipPathId,
    layer.id,
    shape.transformMatrix,
  )
}

export function buildAnimatedClipPathDefs(
  sourceClipPaths: Record<string, ImportedClipPath>,
  layers: Layer[],
  time: number,
  getShape: (layer: Layer, time: number) => Shape,
): Record<string, ImportedClipPath> {
  const clipPaths = { ...sourceClipPaths }

  for (const layer of layers) {
    if (!layer.svgClipPathId || !layer.visible) {
      continue
    }

    const shape = getShape(layer, time)
    if (shape.type !== 'path' || !shape.transformMatrix) {
      continue
    }

    createLocalSpaceClipPathInstance(clipPaths, layer.svgClipPathId, layer.id, shape.transformMatrix)
  }

  return clipPaths
}

export { resolveMaskId as resolveClipPathId }
