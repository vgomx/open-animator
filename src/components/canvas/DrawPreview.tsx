import type { PathPoint } from '@/editor/types'
import { pathPointsToString } from '@/editor/path-nodes'

type PenDraftLayerProps = {
  points: PathPoint[]
  previewPoint?: PathPoint | null
}

export function PenDraftLayer({ points, previewPoint }: PenDraftLayerProps) {
  const draftPoints = previewPoint ? [...points, previewPoint] : points
  const pathData = pathPointsToString(draftPoints, false)

  if (draftPoints.length === 0) {
    return null
  }

  return (
    <g pointerEvents="none">
      {pathData ? (
        <path
          d={pathData}
          fill="none"
          stroke="#a855f7"
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.8}
        />
      ) : null}
      {draftPoints.map((point, index) => (
        <g key={`${point.x}-${point.y}-${index}`}>
          {point.handleIn ? (
            <line
              x1={point.x}
              y1={point.y}
              x2={point.handleIn.x}
              y2={point.handleIn.y}
              stroke="#a855f7"
              strokeWidth={1}
              opacity={0.7}
            />
          ) : null}
          {point.handleOut ? (
            <line
              x1={point.x}
              y1={point.y}
              x2={point.handleOut.x}
              y2={point.handleOut.y}
              stroke="#a855f7"
              strokeWidth={1}
              opacity={0.7}
            />
          ) : null}
          <circle cx={point.x} cy={point.y} r={4} fill="#a855f7" />
          {point.handleOut ? (
            <circle cx={point.handleOut.x} cy={point.handleOut.y} r={3} fill="#c084fc" />
          ) : null}
        </g>
      ))}
    </g>
  )
}

type DrawPreviewProps = {
  x: number
  y: number
  width: number
  height: number
  kind: 'rect' | 'ellipse'
}

export function DrawPreview({ x, y, width, height, kind }: DrawPreviewProps) {
  if (width < 1 && height < 1) {
    return null
  }

  if (kind === 'ellipse') {
    return (
      <ellipse
        cx={x + width / 2}
        cy={y + height / 2}
        rx={Math.max(1, width / 2)}
        ry={Math.max(1, height / 2)}
        fill="rgba(99,102,241,0.15)"
        stroke="#6366f1"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        pointerEvents="none"
      />
    )
  }

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(34,211,238,0.15)"
      stroke="#22d3ee"
      strokeWidth={1.5}
      strokeDasharray="4 3"
      pointerEvents="none"
    />
  )
}
