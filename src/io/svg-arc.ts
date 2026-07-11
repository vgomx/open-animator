/**
 * Convert an SVG elliptical arc to cubic-bezier segments (W3C implementation notes).
 */

type CubicSegment = {
  cp1x: number
  cp1y: number
  cp2x: number
  cp2y: number
  x: number
  y: number
}

export function arcToCubicBeziers(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  xAxisRotation: number,
  largeArcFlag: boolean,
  sweepFlag: boolean,
  x2: number,
  y2: number,
): CubicSegment[] {
  if (rx === 0 || ry === 0) {
    return [{ cp1x: x1, cp1y: y1, cp2x: x2, cp2y: y2, x: x2, y: y2 }]
  }

  const phi = (xAxisRotation * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)

  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const x1p = cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy

  let rxSq = rx * rx
  let rySq = ry * ry
  const x1pSq = x1p * x1p
  const y1pSq = y1p * y1p

  const lambda = x1pSq / rxSq + y1pSq / rySq
  if (lambda > 1) {
    const scale = Math.sqrt(lambda)
    rx *= scale
    ry *= scale
    rxSq = rx * rx
    rySq = ry * ry
  }

  const sign = largeArcFlag === sweepFlag ? -1 : 1
  const numerator = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq
  const denominator = rxSq * y1pSq + rySq * x1pSq
  const coef = denominator === 0 ? 0 : sign * Math.sqrt(Math.max(0, numerator / denominator))

  const cxp = (coef * rx * y1p) / ry
  const cyp = (-coef * ry * x1p) / rx

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

  const vectorAngle = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy
    const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy))
    let angle = Math.acos(Math.max(-1, Math.min(1, dot / (len || 1))))
    if (ux * vy - uy * vx < 0) {
      angle = -angle
    }
    return angle
  }

  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let deltaTheta = vectorAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  )

  if (!sweepFlag && deltaTheta > 0) {
    deltaTheta -= 2 * Math.PI
  } else if (sweepFlag && deltaTheta < 0) {
    deltaTheta += 2 * Math.PI
  }

  const segments = Math.max(1, Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2)))
  const delta = deltaTheta / segments
  const segmentsOut: CubicSegment[] = []

  for (let index = 0; index < segments; index += 1) {
    const theta = theta1 + index * delta
    const nextTheta = theta + delta
    const cosTheta = Math.cos(theta)
    const sinTheta = Math.sin(theta)
    const cosNext = Math.cos(nextTheta)
    const sinNext = Math.sin(nextTheta)

    const e1x = cx + rx * cosPhi * cosTheta - ry * sinPhi * sinTheta
    const e1y = cy + rx * sinPhi * cosTheta + ry * cosPhi * sinTheta
    const e2x = cx + rx * cosPhi * cosNext - ry * sinPhi * sinNext
    const e2y = cy + rx * sinPhi * cosNext + ry * cosPhi * sinNext

    const alpha = (4 / 3) * Math.tan(delta / 4)
    const cp1x = e1x + alpha * (-rx * cosPhi * sinTheta - ry * sinPhi * cosTheta)
    const cp1y = e1y + alpha * (-rx * sinPhi * sinTheta + ry * cosPhi * cosTheta)
    const cp2x = e2x + alpha * (rx * cosPhi * sinNext + ry * sinPhi * cosNext)
    const cp2y = e2y + alpha * (rx * sinPhi * sinNext - ry * cosPhi * cosNext)

    segmentsOut.push({
      cp1x,
      cp1y,
      cp2x,
      cp2y,
      x: e2x,
      y: e2y,
    })
  }

  if (segmentsOut.length > 0) {
    const last = segmentsOut[segmentsOut.length - 1]!
    last.x = x2
    last.y = y2
  }

  return segmentsOut
}
