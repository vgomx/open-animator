// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { importSvg } from '@/io/svg-import'
import { effectiveMatrixAtTime } from '@/io/svg-smil'
import { applyMatrixToPoint } from '@/io/svg-transform'

describe('svg smil import', () => {
  it('imports scale keyframes from animateTransform value tracks', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(40 40)">
          <animateTransform type="scale" dur="2s" values="1 1;2 2;1 1" />
          <rect x="0" y="0" width="20" height="20" fill="#ff0000" />
        </g>
      </svg>
    `

    const imported = importSvg(svg)
    const layer = imported?.layers[0]

    expect(layer?.keyframes.some((keyframe) => keyframe.property === 'scale')).toBe(true)
    expect(imported?.duration).toBe(2)
  })

  it('imports standard smil translate on top of a static group transform', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(20 30)">
          <animateTransform type="translate" dur="2s" from="0 0" to="40 0" />
          <rect x="0" y="0" width="20" height="20" fill="#00ff00" />
        </g>
      </svg>
    `

    const imported = importSvg(svg)
    const layer = imported?.layers[0]

    expect(layer?.keyframes.some((keyframe) => keyframe.property === 'x')).toBe(true)
    expect(imported?.duration).toBe(2)
    expect(layer?.shape.x).toBeCloseTo(20, 0)
  })

  it('does not double-apply static transform and expressive constant smil offsets', () => {
    const svg = `
      <svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(0 -100)">
          <animateTransform type="translate" dur="12s" from="395 412" to="395 412" />
          <animateTransform type="scale" dur="12s" values="1 1;1.2 1.2;1 1" />
          <animateTransform type="translate" dur="12s" from="-395 -512" to="-395 -512" />
          <path d="M 100 100 L 200 100 L 150 200 Z" fill="#000" />
        </g>
      </svg>
    `

    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const path = doc.querySelector('path')!
    const point = applyMatrixToPoint(effectiveMatrixAtTime(path, 0), 100, 100)

    expect(point.y).toBeCloseTo(0, 0)
    expect(point.x).toBeCloseTo(100, 0)
  })

  it('imports rotate animateTransform value tracks into path matrix keyframes', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M 50 50 L 100 50 L 75 100 Z" fill="#000">
          <animateTransform type="rotate" dur="4s" values="0;180;360" />
        </path>
      </svg>
    `

    const imported = importSvg(svg)
    const layer = imported?.layers[0]

    expect(layer?.matrixKeyframes?.length).toBeGreaterThan(1)
    expect(imported?.duration).toBe(4)
  })
})
