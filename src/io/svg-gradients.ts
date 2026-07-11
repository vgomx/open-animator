import { parseSvgColor } from '@/io/svg-colors'

export type ImportedGradientStop = {
  offset: number
  color: string
}

export type ImportedLinearGradient = {
  kind: 'linear'
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  stops: ImportedGradientStop[]
}

export type ImportedRadialGradient = {
  kind: 'radial'
  id: string
  cx: number
  cy: number
  r: number
  stops: ImportedGradientStop[]
}

export type ImportedGradient = ImportedLinearGradient | ImportedRadialGradient

function parseNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseStop(element: Element): ImportedGradientStop {
  const offsetRaw = element.getAttribute('offset') ?? '0'
  const offset = offsetRaw.endsWith('%')
    ? Number.parseFloat(offsetRaw) / 100
    : Number.parseFloat(offsetRaw)

  const color =
    element.getAttribute('stop-color') ??
    element.getAttribute('stopColor') ??
    '#000000'

  return {
    offset: Number.isFinite(offset) ? offset : 0,
    color: parseSvgColor(color, '#000000'),
  }
}

export function parseSvgGradients(svg: SVGSVGElement): Record<string, ImportedGradient> {
  const gradients: Record<string, ImportedGradient> = {}

  for (const element of svg.querySelectorAll('linearGradient, radialGradient')) {
    const id = element.getAttribute('id')
    if (!id) {
      continue
    }

    const stops = [...element.querySelectorAll('stop')].map(parseStop)
    if (stops.length === 0) {
      continue
    }

    if (element.tagName.toLowerCase() === 'lineargradient') {
      gradients[id] = {
        kind: 'linear',
        id,
        x1: parseNumber(element.getAttribute('x1')),
        y1: parseNumber(element.getAttribute('y1')),
        x2: parseNumber(element.getAttribute('x2'), 1),
        y2: parseNumber(element.getAttribute('y2')),
        stops,
      }
      continue
    }

    gradients[id] = {
      kind: 'radial',
      id,
      cx: parseNumber(element.getAttribute('cx'), 0.5),
      cy: parseNumber(element.getAttribute('cy'), 0.5),
      r: parseNumber(element.getAttribute('r'), 0.5),
      stops,
    }
  }

  return gradients
}

export function importedGradientId(id: string): string {
  return `imported-grad-${id}`
}

export function resolvePaintValue(
  raw: string | null | undefined,
  fallback: string,
  gradients: Record<string, ImportedGradient>,
): string {
  if (!raw) {
    return fallback
  }

  const trimmed = raw.trim()
  const urlMatch = trimmed.match(/^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/i)
  if (urlMatch && gradients[urlMatch[1]!]) {
    return `url(#${importedGradientId(urlMatch[1]!)})`
  }

  return parseSvgColor(trimmed, fallback)
}
