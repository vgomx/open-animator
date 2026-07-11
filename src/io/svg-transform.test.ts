import { describe, expect, it } from 'vitest'

import {
  applyMatrixToPoint,
  invertMatrix,
  multiplyMatrix,
  parseTransformAttribute,
} from '@/io/svg-transform'

describe('svg-transform', () => {
  it('parses matrix transforms used by expressive animator exports', () => {
    const matrix = parseTransformAttribute('matrix(1.0084 0 0 1 44.5 -0.0029)')
    const point = applyMatrixToPoint(matrix, 10, 20)

    expect(point.x).toBeCloseTo(54.584, 3)
    expect(point.y).toBeCloseTo(19.997, 3)
  })

  it('inverts and recomposes simple matrices', () => {
    const matrix = parseTransformAttribute('matrix(2 0 0 3 10 20)')
    const inverse = invertMatrix(matrix)
    expect(inverse).not.toBeNull()
    const restored = multiplyMatrix(matrix, inverse!)
    expect(restored.a).toBeCloseTo(1)
    expect(restored.d).toBeCloseTo(1)
    expect(restored.e).toBeCloseTo(0)
    expect(restored.f).toBeCloseTo(0)
  })
})
