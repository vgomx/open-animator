// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { collectTransformKeyframesForNode, effectiveMatrixAtTime } from '@/io/svg-smil'
import { IDENTITY_MATRIX } from '@/io/svg-transform'

describe('svg animateMotion', () => {
  it('samples motion along a path into transform keyframes', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="20" height="20" fill="#000">
          <animateMotion dur="2s" path="M 0 0 L 100 0" />
        </rect>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const rect = document.querySelector('rect')
    expect(rect).not.toBeNull()

    const atEnd = effectiveMatrixAtTime(rect!, 2)
    expect(atEnd.e).toBeCloseTo(100, 0)
    expect(atEnd.f).toBeCloseTo(0, 0)

    const keyframes = collectTransformKeyframesForNode(rect!, IDENTITY_MATRIX)
    const xKeyframes = keyframes.keyframes.filter((keyframe) => keyframe.property === 'x')
    expect(xKeyframes.some((keyframe) => Number(keyframe.value) > 90)).toBe(true)
    expect(keyframes.duration).toBe(2)
  })

  it('follows mpath references to path defs', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
          <path id="motion-path" d="M 0 0 L 0 80" />
        </defs>
        <circle cx="0" cy="0" r="8" fill="#000">
          <animateMotion dur="2s">
            <mpath xlink:href="#motion-path" />
          </animateMotion>
        </circle>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const circle = document.querySelector('circle')
    expect(circle).not.toBeNull()

    const atEnd = effectiveMatrixAtTime(circle!, 2)
    expect(atEnd.e).toBeCloseTo(0, 0)
    expect(atEnd.f).toBeCloseTo(80, 0)
  })

  it('returns identity when mpath reference is missing', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <rect x="10" y="10" width="20" height="20" fill="#000">
          <animateMotion dur="2s">
            <mpath xlink:href="#missing-path" />
          </animateMotion>
        </rect>
      </svg>
    `

    const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
    const rect = document.querySelector('rect')
    expect(rect).not.toBeNull()

    const atMid = effectiveMatrixAtTime(rect!, 1)
    expect(atMid.e).toBeCloseTo(0, 0)
    expect(atMid.f).toBeCloseTo(0, 0)
  })
})
