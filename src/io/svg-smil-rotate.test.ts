// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { evaluateSmilTransforms } from '@/io/svg-smil'

describe('rotate smil parsing', () => {
  it('samples rotate animateTransform with single-value keyframes', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M 50 50 L 100 50 L 75 100 Z" fill="#000">
          <animateTransform type="rotate" dur="12s" values="0;90;180" />
        </path>
      </svg>
    `
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const path = doc.querySelector('path')!

    const at0 = evaluateSmilTransforms(path, 0)
    const at6 = evaluateSmilTransforms(path, 6)

    expect(at0.a).toBeCloseTo(1, 2)
    expect(at0.b).toBeCloseTo(0, 2)
    expect(at6.a).not.toBeCloseTo(at0.a, 1)
    expect(at6.b).not.toBeCloseTo(at0.b, 1)
  })

  it('samples rotate animateTransform with from/to', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <g>
          <animateTransform type="rotate" dur="4s" from="0 50 50" to="180 50 50" />
          <rect x="40" y="40" width="20" height="20" fill="#f00" />
        </g>
      </svg>
    `
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const group = doc.querySelector('g')!

    const at0 = evaluateSmilTransforms(group, 0)
    const at4 = evaluateSmilTransforms(group, 4)

    expect(at0.a).toBeCloseTo(1, 1)
    expect(at4.a).toBeCloseTo(-1, 1)
  })
})
