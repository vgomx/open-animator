import type { ImportedGradient } from '@/io/svg-gradients'
import { resolvePaintValue } from '@/io/svg-gradients'

export type ImportedMask = {
  id: string
  /** Serialized mask subtree (paths/groups inside the mask). */
  markup: string
}

function resolveMaskId(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  const match = raw.trim().match(/^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/i)
  return match ? match[1]! : null
}

function rewriteMaskElement(element: Element, gradients: Record<string, ImportedGradient>): void {
  const fill = element.getAttribute('fill')
  if (fill) {
    element.setAttribute('fill', resolvePaintValue(fill, fill, gradients))
  }

  const stroke = element.getAttribute('stroke')
  if (stroke) {
    element.setAttribute('stroke', resolvePaintValue(stroke, stroke, gradients))
  }

  for (const child of [...element.children]) {
    rewriteMaskElement(child, gradients)
  }
}

export function parseSvgMasks(
  svg: SVGSVGElement,
  gradients: Record<string, ImportedGradient>,
): Record<string, ImportedMask> {
  const masks: Record<string, ImportedMask> = {}

  for (const mask of svg.querySelectorAll('mask')) {
    const id = mask.getAttribute('id')
    if (!id) {
      continue
    }

    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    for (const child of [...mask.children]) {
      const clone = child.cloneNode(true) as Element
      rewriteMaskElement(clone, gradients)
      container.appendChild(clone)
    }

    masks[id] = {
      id,
      markup: container.innerHTML,
    }
  }

  return masks
}

export function importedMaskId(id: string): string {
  return `imported-mask-${id}`
}

export { resolveMaskId }
