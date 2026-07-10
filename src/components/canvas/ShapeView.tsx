import type { Shape } from '@/editor/types'
import { pathPointsToString } from '@/editor/path-nodes'
import { buildShapeTransform } from '@/editor/transforms'

type ShapeViewProps = {
  shape: Shape
}

export function ShapeView({ shape }: ShapeViewProps) {
  const transform = buildShapeTransform(shape)
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
