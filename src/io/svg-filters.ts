export type ImportedFilter = {
  id: string
  /** Serialized filter primitive chain for SVG re-export. */
  markup: string
  /** CSS filter string when a basic mapping exists (e.g. blur, drop-shadow). */
  cssFilter?: string
  /** True when the SVG filter chain includes unsupported primitives. */
  partial?: boolean
}

function parseNumber(value: string | null | undefined, fallback = 0): number {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseOpacityFromColorMatrix(values: string): number | null {
  const parts = values
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value))

  if (parts.length !== 20) {
    return null
  }

  const isAlphaOnlyMatrix =
    parts[0] === 1 &&
    parts[1] === 0 &&
    parts[2] === 0 &&
    parts[3] === 0 &&
    parts[4] === 0 &&
    parts[5] === 0 &&
    parts[6] === 1 &&
    parts[7] === 0 &&
    parts[8] === 0 &&
    parts[9] === 0 &&
    parts[10] === 0 &&
    parts[11] === 0 &&
    parts[12] === 1 &&
    parts[13] === 0 &&
    parts[14] === 0 &&
    parts[15] === 0 &&
    parts[16] === 0 &&
    parts[17] === 0

  if (!isAlphaOnlyMatrix) {
    return null
  }

  return Math.max(0, Math.min(1, parts[18]! + parts[19]!))
}

function buildCssFilterFromChain(filter: Element): { cssFilter?: string; partial: boolean } {
  const parts: string[] = []
  let partial = false
  let pendingOffset: { dx: number; dy: number } | null = null

  for (const child of [...filter.children]) {
    const tag = child.tagName.toLowerCase()

    if (tag === 'fegaussianblur') {
      const stdDeviation = parseNumber(child.getAttribute('stdDeviation'))
      if (stdDeviation > 0) {
        if (pendingOffset) {
          parts.push(
            `drop-shadow(${pendingOffset.dx}px ${pendingOffset.dy}px ${stdDeviation}px rgba(0,0,0,0.35))`,
          )
          pendingOffset = null
        } else {
          parts.push(`blur(${stdDeviation}px)`)
        }
      }
      continue
    }

    if (tag === 'fedropshadow') {
      const dx = parseNumber(child.getAttribute('dx'))
      const dy = parseNumber(child.getAttribute('dy'))
      const stdDeviation = parseNumber(child.getAttribute('stdDeviation'))
      const color = child.getAttribute('flood-color') ?? 'rgba(0,0,0,0.35)'
      parts.push(`drop-shadow(${dx}px ${dy}px ${stdDeviation}px ${color})`)
      continue
    }

    if (tag === 'feoffset') {
      pendingOffset = {
        dx: parseNumber(child.getAttribute('dx')),
        dy: parseNumber(child.getAttribute('dy')),
      }
      continue
    }

    if (tag === 'fecolormatrix') {
      const type = (child.getAttribute('type') ?? 'matrix').toLowerCase()
      if (type === 'matrix') {
        const opacity = parseOpacityFromColorMatrix(child.getAttribute('values') ?? '')
        if (opacity !== null && opacity < 1) {
          parts.push(`opacity(${opacity})`)
          continue
        }
      }
      partial = true
      continue
    }

    if (tag === 'feblend' || tag === 'fecomposite' || tag === 'femerge' || tag === 'feflood') {
      continue
    }

    partial = true
  }

  if (pendingOffset) {
    partial = true
  }

  return {
    cssFilter: parts.length > 0 ? parts.join(' ') : undefined,
    partial,
  }
}

export function parseSvgFilters(svg: SVGSVGElement): Record<string, ImportedFilter> {
  const filters: Record<string, ImportedFilter> = {}

  for (const filter of svg.querySelectorAll('filter')) {
    const id = filter.getAttribute('id')
    if (!id) {
      continue
    }

    const mapped = buildCssFilterFromChain(filter)
    filters[id] = {
      id,
      markup: filter.innerHTML,
      ...(mapped.cssFilter ? { cssFilter: mapped.cssFilter } : {}),
      ...(mapped.partial ? { partial: true } : {}),
    }
  }

  return filters
}

export function importedFilterId(id: string): string {
  return `imported-filter-${id}`
}

export function resolveFilterId(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  const match = raw.trim().match(/^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/i)
  return match ? match[1]! : null
}
