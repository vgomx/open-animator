import type { ImportedGradient } from '@/io/svg-gradients'
import { resolvePaintValue } from '@/io/svg-gradients'

export type SvgClassStyle = {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseDeclaration(property: string, value: string, target: SvgClassStyle): void {
  const normalized = property.trim().toLowerCase()
  const trimmedValue = value.trim()

  if (normalized === 'fill') {
    target.fill = trimmedValue
    return
  }

  if (normalized === 'stroke') {
    target.stroke = trimmedValue
    return
  }

  if (normalized === 'stroke-width') {
    target.strokeWidth = parseNumber(trimmedValue)
    return
  }

  if (normalized === 'opacity' || normalized === 'fill-opacity') {
    target.opacity = parseNumber(trimmedValue, 1)
  }
}

/**
 * Parse simple `.className { ... }` rules from inline `<style>` blocks.
 */
export function parseSvgClassStyles(svg: SVGSVGElement): Record<string, SvgClassStyle> {
  const rules: Record<string, SvgClassStyle> = {}

  for (const styleElement of svg.querySelectorAll('style')) {
    const text = styleElement.textContent ?? ''
    const rulePattern = /\.([a-zA-Z_][\w-]*)\s*\{([^}]*)\}/g
    let match: RegExpExecArray | null

    while ((match = rulePattern.exec(text)) !== null) {
      const className = match[1]!
      const body = match[2]!
      const style = rules[className] ?? {}

      for (const declaration of body.split(';')) {
        const colon = declaration.indexOf(':')
        if (colon < 0) {
          continue
        }

        parseDeclaration(declaration.slice(0, colon), declaration.slice(colon + 1), style)
      }

      rules[className] = style
    }
  }

  return rules
}

export function applyClassStyles(
  element: Element,
  inherited: SvgClassStyle,
  classStyles: Record<string, SvgClassStyle>,
): SvgClassStyle {
  const classAttr = element.getAttribute('class')
  if (!classAttr) {
    return inherited
  }

  let merged = { ...inherited }
  for (const className of classAttr.trim().split(/\s+/)) {
    const rule = classStyles[className]
    if (rule) {
      merged = { ...merged, ...rule }
    }
  }

  return merged
}

export function resolveClassStyle(
  style: SvgClassStyle,
  fallback: { fill: string; stroke: string; strokeWidth: number; opacity: number },
  gradients: Record<string, ImportedGradient>,
): { fill: string; stroke: string; strokeWidth: number; opacity: number } {
  return {
    fill: style.fill
      ? resolvePaintValue(style.fill, fallback.fill, gradients)
      : fallback.fill,
    stroke: style.stroke
      ? resolvePaintValue(style.stroke, fallback.stroke, gradients)
      : fallback.stroke,
    strokeWidth: style.strokeWidth ?? fallback.strokeWidth,
    opacity: style.opacity ?? fallback.opacity,
  }
}
