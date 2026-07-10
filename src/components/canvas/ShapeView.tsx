import type { Shape } from '@/editor/types'

type ShapeViewProps = {
  shape: Shape
}

export function ShapeView({ shape }: ShapeViewProps) {
  const transform = `translate(${shape.x} ${shape.y}) scale(${shape.scale})`
  const sharedProps = {
    transform,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity,
  }

  if (shape.type === 'ellipse') {
    return <ellipse {...sharedProps} rx={shape.rx} ry={shape.ry} />
  }

  return <rect {...sharedProps} width={shape.width} height={shape.height} />
}
