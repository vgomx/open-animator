import type { ImportedGradient } from '@/io/svg-gradients'
import { resolvePaintValue } from '@/io/svg-gradients'

export type SvgClassStyle = {
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

export type SvgStyleSheet = {
  classes: Record<string, SvgClassStyle>
  ids: Record<string, SvgClassStyle>
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

function parseRuleBody(body: string, target: SvgClassStyle): void {
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon < 0) {
      continue
    }

    parseDeclaration(declaration.slice(0, colon), declaration.slice(colon + 1), target)
  }
}

/**
 * Parse simple `.className { ... }` and `#elementId { ... }` rules from inline `<style>` blocks.
 */
export function parseSvgStyleSheet(svg: SVGSVGElement): SvgStyleSheet {
  const classes: Record<string, SvgClassStyle> = {}
  const ids: Record<string, SvgClassStyle> = {}

  for (const styleElement of svg.querySelectorAll('style')) {
    const text = styleElement.textContent ?? ''
    const classPattern = /\.([a-zA-Z_][\w-]*)\s*\{([^}]*)\}/g
    const idPattern = /#([a-zA-Z_][\w-]*)\s*\{([^}]*)\}/g

    let match: RegExpExecArray | null
    while ((match = classPattern.exec(text)) !== null) {
      const className = match[1]!
      const style = classes[className] ?? {}
      parseRuleBody(match[2]!, style)
      classes[className] = style
    }

    while ((match = idPattern.exec(text)) !== null) {
      const id = match[1]!
      const style = ids[id] ?? {}
      parseRuleBody(match[2]!, style)
      ids[id] = style
    }
  }

  return { classes, ids }
}

/** @deprecated Use parseSvgStyleSheet — kept for call-site compatibility. */
export function parseSvgClassStyles(svg: SVGSVGElement): Record<string, SvgClassStyle> {
  return parseSvgStyleSheet(svg).classes
}

export function applyElementStyles(
  element: Element,
  inherited: SvgClassStyle,
  styleSheet: SvgStyleSheet,
): SvgClassStyle {
  let merged = { ...inherited }

  const id = element.getAttribute('id')
  if (id && styleSheet.ids[id]) {
    merged = { ...merged, ...styleSheet.ids[id] }
  }

  const classAttr = element.getAttribute('class')
  if (classAttr) {
    for (const className of classAttr.trim().split(/\s+/)) {
      const rule = styleSheet.classes[className]
      if (rule) {
        merged = { ...merged, ...rule }
      }
    }
  }

  return merged
}

/** @deprecated Use applyElementStyles */
export function applyClassStyles(
  element: Element,
  inherited: SvgClassStyle,
  classStyles: Record<string, SvgClassStyle>,
): SvgClassStyle {
  return applyElementStyles(element, inherited, { classes: classStyles, ids: {} })
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
