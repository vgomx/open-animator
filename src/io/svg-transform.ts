export type AffineMatrix = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

export const IDENTITY_MATRIX: AffineMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

export function multiplyMatrix(left: AffineMatrix, right: AffineMatrix): AffineMatrix {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

export function applyMatrixToPoint(matrix: AffineMatrix, x: number, y: number): { x: number; y: number } {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  }
}

function parseTransformList(value: string): AffineMatrix {
  let matrix = IDENTITY_MATRIX
  const pattern =
    /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(value)) !== null) {
    const kind = match[1]!
    const args = match[2]!
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part.trim()))
      .filter((part) => Number.isFinite(part))

    let step = IDENTITY_MATRIX

    if (kind === 'matrix' && args.length >= 6) {
      step = { a: args[0]!, b: args[1]!, c: args[2]!, d: args[3]!, e: args[4]!, f: args[5]! }
    } else if (kind === 'translate') {
      step = { a: 1, b: 0, c: 0, d: 1, e: args[0] ?? 0, f: args[1] ?? 0 }
    } else if (kind === 'scale') {
      const scaleX = args[0] ?? 1
      const scaleY = args[1] ?? scaleX
      step = { a: scaleX, b: 0, c: 0, d: scaleY, e: 0, f: 0 }
    } else if (kind === 'rotate') {
      const angle = ((args[0] ?? 0) * Math.PI) / 180
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const cx = args[1] ?? 0
      const cy = args[2] ?? 0
      const rotate = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
      const toOrigin = { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy }
      const back = { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy }
      step = multiplyMatrix(back, multiplyMatrix(rotate, toOrigin))
    }

    matrix = multiplyMatrix(matrix, step)
  }

  return matrix
}

export function parseTransformAttribute(attr: string | null | undefined): AffineMatrix {
  if (!attr) {
    return IDENTITY_MATRIX
  }

  return parseTransformList(attr.trim())
}

export function invertMatrix(matrix: AffineMatrix): AffineMatrix | null {
  const det = matrix.a * matrix.d - matrix.b * matrix.c
  if (Math.abs(det) < 1e-10) {
    return null
  }

  const invDet = 1 / det
  return {
    a: matrix.d * invDet,
    b: -matrix.b * invDet,
    c: -matrix.c * invDet,
    d: matrix.a * invDet,
    e: (matrix.c * matrix.f - matrix.d * matrix.e) * invDet,
    f: (matrix.b * matrix.e - matrix.a * matrix.f) * invDet,
  }
}

export function decomposeMatrix(matrix: AffineMatrix): {
  x: number
  y: number
  rotation: number
  scale: number
} {
  const x = matrix.e
  const y = matrix.f
  const scaleX = Math.hypot(matrix.a, matrix.b)
  const scaleY = Math.hypot(matrix.c, matrix.d)
  const rotation = (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI

  return {
    x,
    y,
    rotation,
    scale: (scaleX + scaleY) / 2,
  }
}
