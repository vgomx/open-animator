import { memo } from 'react'

import type { AffineMatrix, Shape } from '@/editor/types'
import { pathPointsToString } from '@/editor/path-nodes'
import { buildShapeTransform } from '@/editor/transforms'

type ShapeViewProps = {
  shape: Shape
}

function matrixToTransform(matrix: {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}): string {
  return `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`
}

function matrixEquals(
  left: AffineMatrix | undefined,
  right: AffineMatrix | undefined,
): boolean {
  if (left === right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  return (
    left.a === right.a &&
    left.b === right.b &&
    left.c === right.c &&
    left.d === right.d &&
    left.e === right.e &&
    left.f === right.f
  )
}

function shapePropsEqual(previous: Shape, next: Shape): boolean {
  if (previous.type !== next.type || previous.id !== next.id) {
    return false
  }

  if (
    previous.x !== next.x ||
    previous.y !== next.y ||
    previous.rotation !== next.rotation ||
    previous.opacity !== next.opacity ||
    previous.scale !== next.scale ||
    previous.fill !== next.fill ||
    previous.stroke !== next.stroke ||
    previous.strokeWidth !== next.strokeWidth
  ) {
    return false
  }

  if (previous.type === 'rect' && next.type === 'rect') {
    return previous.width === next.width && previous.height === next.height
  }

  if (previous.type === 'ellipse' && next.type === 'ellipse') {
    return previous.rx === next.rx && previous.ry === next.ry
  }

  if (previous.type === 'text' && next.type === 'text') {
    return (
      previous.text === next.text &&
      previous.fontSize === next.fontSize &&
      previous.fontFamily === next.fontFamily
    )
  }

  if (previous.type === 'path' && next.type === 'path') {
    return (
      previous.closed === next.closed &&
      previous.localCoords === next.localCoords &&
      previous.points === next.points &&
      matrixEquals(previous.transformMatrix, next.transformMatrix)
    )
  }

  return true
}

function ShapeViewComponent({ shape }: ShapeViewProps) {
  const transform =
    shape.type === 'path' && shape.transformMatrix
      ? matrixToTransform(shape.transformMatrix)
      : buildShapeTransform(shape)
  const sharedProps = {
    transform,
    fill: shape.fill,
    stroke: shape.stroke === 'none' ? undefined : shape.stroke,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
  }

  if (shape.type === 'ellipse') {
    return <ellipse {...sharedProps} rx={shape.rx} ry={shape.ry} />
  }

  if (shape.type === 'text') {
    return (
      <text
        x={shape.x}
        y={shape.y}
        transform={transform}
        fontSize={shape.fontSize}
        fontFamily={shape.fontFamily}
        fill={shape.fill}
        opacity={shape.opacity}
      >
        {shape.text}
      </text>
    )
  }

  if (shape.type === 'path') {
    const pathData = pathPointsToString(shape.points, shape.closed)
    if (!pathData) {
      return null
    }

    return (
      <path
        d={pathData}
        transform={transform}
        fill={shape.fill === 'none' ? 'none' : shape.fill}
        stroke={shape.stroke}
        strokeWidth={shape.strokeWidth}
        opacity={shape.opacity}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    )
  }

  return <rect {...sharedProps} width={shape.width} height={shape.height} />
}

export const ShapeView = memo(ShapeViewComponent, (previous, next) =>
  shapePropsEqual(previous.shape, next.shape),
)
