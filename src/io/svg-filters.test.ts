// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { parseSvgFilters } from '@/io/svg-filters'

describe('svg filters', () => {
  it('maps feDropShadow to css drop-shadow', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow">
            <feDropShadow dx="4" dy="6" stdDeviation="3" flood-color="#000000" flood-opacity="0.4" />
          </filter>
        </defs>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const filters = parseSvgFilters(document.documentElement as unknown as SVGSVGElement)

    expect(filters.shadow?.cssFilter).toContain('drop-shadow(4px 6px 3px')
  })

  it('combines feOffset and feGaussianBlur into drop-shadow', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="soft-shadow">
            <feOffset dx="2" dy="4" />
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const filters = parseSvgFilters(document.documentElement as unknown as SVGSVGElement)

    expect(filters['soft-shadow']?.cssFilter).toBe('drop-shadow(2px 4px 5px rgba(0,0,0,0.35))')
  })

  it('maps alpha feColorMatrix to css opacity filter', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="fade">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" />
          </filter>
        </defs>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const filters = parseSvgFilters(document.documentElement as unknown as SVGSVGElement)

    expect(filters.fade?.cssFilter).toBe('opacity(0.5)')
  })

  it('preserves filter markup for svg re-export', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow">
            <feDropShadow dx="4" dy="6" stdDeviation="3" />
          </filter>
        </defs>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const filters = parseSvgFilters(document.documentElement as unknown as SVGSVGElement)

    expect(filters.shadow?.markup).toContain('feDropShadow')
  })
})
