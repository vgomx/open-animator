// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import {
  effectiveMatrixAtTime,
  evaluateSmilTransforms,
} from '@/io/svg-smil'
import {
  applyMatrixToPoint,
  multiplyMatrix,
  parseTransformAttribute,
} from '@/io/svg-transform'

describe('expressive transform model', () => {
  it('uses smil only when static transform matches smil(0)', () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const balloonGroup = [...doc.querySelectorAll('g')].find(
      (group) =>
        group.getAttribute('transform') === 'translate(0 -100)' &&
        group.querySelectorAll('path').length === 9,
    )!
    const path = balloonGroup.querySelector('path')!
    const nums = path.getAttribute('d')!.match(/-?\d*\.?\d+/g)!.map(Number)

    const world = applyMatrixToPoint(effectiveMatrixAtTime(path, 0), nums[0]!, nums[1]!)
    expect(world.x).toBeGreaterThan(200)
    expect(world.y).toBeGreaterThan(0)
    expect(world.y).toBeLessThan(200)
  })

  it('composes static and smil for matrix paths with independent animation', () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const path = [...doc.querySelectorAll('path')].find((entry) => {
      const smilCount = [...entry.children].filter(
        (child) => child.tagName.toLowerCase() === 'animatetransform',
      ).length
      return smilCount >= 3 && entry.getAttribute('transform')?.includes('matrix(2.3894')
    })!

    const staticMatrix = parseTransformAttribute(path.getAttribute('transform'))
    const smil0 = evaluateSmilTransforms(path, 0)
    const nums = path.getAttribute('d')!.match(/-?\d*\.?\d+/g)!.map(Number)

    const smilOnly = applyMatrixToPoint(smil0, nums[0]!, nums[1]!)
    const pathStaticAndSmil = applyMatrixToPoint(
      multiplyMatrix(staticMatrix, smil0),
      nums[0]!,
      nums[1]!,
    )
    const effective = applyMatrixToPoint(effectiveMatrixAtTime(path, 0), nums[0]!, nums[1]!)

    expect(Math.hypot(smilOnly.x - pathStaticAndSmil.x, smilOnly.y - pathStaticAndSmil.y)).toBeGreaterThan(
      100,
    )
    expect(effective.x).toBeCloseTo(pathStaticAndSmil.x, 0)
    expect(Math.abs(effective.y - pathStaticAndSmil.y)).toBeCloseTo(100, 0)
  })
})
