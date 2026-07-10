import { useEffect, useRef } from 'react'

import { clientToArtboard } from '@/editor/coordinates'
import type { Guide } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { UI_PATH_STROKE } from '@/lib/brand-colors'
import { saveProjectToStorage } from '@/io/project'

type GuidesLayerProps = {
  width: number
  height: number
}

function GuideLine({
  guide,
  width,
  height,
}: {
  guide: Guide
  width: number
  height: number
}) {
  const updateGuide = useEditorStore((state) => state.updateGuide)
  const removeGuide = useEditorStore((state) => state.removeGuide)
  const beginHistoryTransaction = useEditorStore((state) => state.beginHistoryTransaction)
  const dragRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const svg = dragRef.current
      if (!svg) {
        return
      }

      const point = clientToArtboard(svg, event.clientX, event.clientY)
      updateGuide(guide.id, guide.axis === 'x' ? point.x : point.y, { skipHistory: true })
    }

    const onPointerUp = () => {
      if (!dragRef.current) {
        return
      }

      dragRef.current = null
      const store = useEditorStore.getState()
      const current = store.project.guides.find((item) => item.id === guide.id)
      if (!current) {
        return
      }

      const limit = guide.axis === 'x' ? width : height
      if (current.position < -20 || current.position > limit + 20) {
        removeGuide(guide.id)
      } else {
        saveProjectToStorage(store.project)
      }
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [guide.axis, guide.id, height, removeGuide, updateGuide, width])

  const isVertical = guide.axis === 'x'

  return (
    <g className="pointer-events-auto">
      {isVertical ? (
        <>
          <line
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={height}
            stroke={UI_PATH_STROKE}
            strokeWidth={1}
            pointerEvents="none"
          />
          <rect
            x={guide.position - 4}
            y={0}
            width={8}
            height={height}
            fill="transparent"
            className="cursor-col-resize"
            onPointerDown={(event) => {
              event.stopPropagation()
              beginHistoryTransaction()
              const svg = event.currentTarget.ownerSVGElement
              if (!svg) {
                return
              }
              dragRef.current = svg
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
          />
        </>
      ) : (
        <>
          <line
            x1={0}
            y1={guide.position}
            x2={width}
            y2={guide.position}
            stroke={UI_PATH_STROKE}
            strokeWidth={1}
            pointerEvents="none"
          />
          <rect
            x={0}
            y={guide.position - 4}
            width={width}
            height={8}
            fill="transparent"
            className="cursor-row-resize"
            onPointerDown={(event) => {
              event.stopPropagation()
              beginHistoryTransaction()
              const svg = event.currentTarget.ownerSVGElement
              if (!svg) {
                return
              }
              dragRef.current = svg
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
          />
        </>
      )}
    </g>
  )
}

export function GuidesLayer({ width, height }: GuidesLayerProps) {
  const guides = useEditorStore((state) => state.project.guides)
  const guideDraft = useEditorStore((state) => state.guideDraft)

  return (
    <g data-eyedropper-ignore>
      {guides.map((guide) => (
        <GuideLine key={guide.id} guide={guide} width={width} height={height} />
      ))}
      {guideDraft ? (
        guideDraft.axis === 'x' ? (
          <line
            x1={guideDraft.position}
            y1={0}
            x2={guideDraft.position}
            y2={height}
            stroke={UI_PATH_STROKE}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.8}
            pointerEvents="none"
          />
        ) : (
          <line
            x1={0}
            y1={guideDraft.position}
            x2={width}
            y2={guideDraft.position}
            stroke={UI_PATH_STROKE}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.8}
            pointerEvents="none"
          />
        )
      ) : null}
    </g>
  )
}
