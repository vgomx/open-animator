export type ImportedFilter = {
  id: string
  /** CSS filter string when a basic mapping exists (e.g. blur). */
  cssFilter?: string
}

export function parseSvgFilters(svg: SVGSVGElement): Record<string, ImportedFilter> {
  const filters: Record<string, ImportedFilter> = {}

  for (const filter of svg.querySelectorAll('filter')) {
    const id = filter.getAttribute('id')
    if (!id) {
      continue
    }

    const blur = filter.querySelector('feGaussianBlur')
    if (blur) {
      const stdDeviation = Number.parseFloat(blur.getAttribute('stdDeviation') ?? '0')
      if (Number.isFinite(stdDeviation) && stdDeviation > 0) {
        filters[id] = {
          id,
          cssFilter: `blur(${stdDeviation}px)`,
        }
        continue
      }
    }

    filters[id] = { id }
  }

  return filters
}

export function resolveFilterId(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  const match = raw.trim().match(/^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/i)
  return match ? match[1]! : null
}
