import { useEditorStore } from '@/editor/store'

type SnapLinesLayerProps = {
  width: number
  height: number
}

export function SnapLinesLayer({ width, height }: SnapLinesLayerProps) {
  const activeSnapLines = useEditorStore((state) => state.activeSnapLines)

  if (activeSnapLines.length === 0) {
    return null
  }

  return (
    <g data-eyedropper-ignore pointerEvents="none">
      {activeSnapLines.map((line, index) =>
        line.axis === 'x' ? (
          <line
            key={`${line.axis}-${line.position}-${index}`}
            x1={line.position}
            y1={0}
            x2={line.position}
            y2={height}
            stroke="#f472b6"
            strokeWidth={1}
          />
        ) : (
          <line
            key={`${line.axis}-${line.position}-${index}`}
            x1={0}
            y1={line.position}
            x2={width}
            y2={line.position}
            stroke="#f472b6"
            strokeWidth={1}
          />
        ),
      )}
    </g>
  )
}
