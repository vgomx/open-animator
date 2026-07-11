// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { effectiveMatrixAtTime } from '@/io/svg-smil'

describe('balloon animateMotion paths', () => {
  it('evaluates motion without hanging', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <g>
          <animateMotion dur="12000ms" path="m901.3977 323.6842l-1130 0" additive="sum" />
          <path d="M0 0 L10 0" />
        </g>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const path = document.querySelector('path')!

    const start = performance.now()
    const atZero = effectiveMatrixAtTime(path, 0)
    const atSix = effectiveMatrixAtTime(path, 6)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(1000)
    expect(atZero.e).toBe(0)
    expect(atSix.e).not.toBe(atZero.e)
  })

  it('evaluates quadratic motion paths from balloon svg', () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg">
        <g>
          <animateMotion dur="12s" path="m1205.5429 489.627q-676.8562 185.2649 -1339.5689 -52.9447" />
          <path d="M0 0 L10 0" />
        </g>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const path = document.querySelector('path')!

    const start = performance.now()
    effectiveMatrixAtTime(path, 6)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
