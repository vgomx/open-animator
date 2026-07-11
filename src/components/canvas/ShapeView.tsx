import type { Shape } from '@/editor/types'
import { pathPointsToString } from '@/editor/path-nodes'
import { buildShapeTransform } from '@/editor/transforms'
import { importedMaskId } from '@/io/svg-masks'

type ShapeViewProps = {
  shape: Shape
  maskId?: string
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

export function ShapeView({ shape, maskId }: ShapeViewProps) {
  if (shape.type === 'path' && maskId && shape.transformMatrix) {
    const pathData = pathPointsToString(shape.points, shape.closed)
    if (!pathData) {
      return null
    }

    return (
      <g transform={matrixToTransform(shape.transformMatrix)}>
        <g mask={`url(#${importedMaskId(maskId)})`}>
          <path
            d={pathData}
            fill={shape.fill === 'none' ? 'none' : shape.fill}
            stroke={shape.stroke}
            strokeWidth={shape.strokeWidth}
            opacity={shape.opacity}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      </g>
    )
  }

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
