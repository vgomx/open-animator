import { useEffect, useRef } from 'react'

import { clientToArtboard } from '@/editor/coordinates'
import { getGroupAnimatedValues } from '@/editor/group-animation'
import { getGroupBounds } from '@/editor/timeline-rows'
import { getArtboardLayers } from '@/editor/artboard-utils'
import { useEditorStore } from '@/editor/store'
import { UI_STROKE } from '@/lib/brand-colors'
import { saveProjectToStorage } from '@/io/project'

type GroupSelectionOverlayProps = {
  groupId: string
  interactive?: boolean
}

type DragMode =
  | {
      type: 'move'
      startX: number
      startY: number
      originX: number
      originY: number
    }
  | {
      type: 'rotate'
      centerX: number
      centerY: number
      startAngle: number
      originRotation: number
    }

export function GroupSelectionOverlay({
  groupId,
  interactive = true,
}: GroupSelectionOverlayProps) {
  const updateGroupTransform = useEditorStore((state) => state.updateGroupTransform)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragMode | null>(null)

  const project = useEditorStore((state) => state.project)
  const currentTime = useEditorStore((state) => state.currentTime)
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId)
  const displayLayers = getArtboardLayers(project, activeArtboardId).filter((layer) => layer.visible)

  const bounds = getGroupBounds(groupId, displayLayers, currentTime, project.layerGroups)
  const values = getGroupAnimatedValues(groupId, project.layerGroups, currentTime)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      const svg = svgRef.current
      if (!drag || !svg) {
        return
      }

      const point = clientToArtboard(svg, event.clientX, event.clientY)

      if (drag.type === 'move') {
        updateGroupTransform(
          groupId,
          {
            x: drag.originX + (point.x - drag.startX),
            y: drag.originY + (point.y - drag.startY),
          },
          { skipHistory: true },
        )
        return
      }

      const angle = Math.atan2(point.y - drag.centerY, point.x - drag.centerX)
      const delta = ((angle - drag.startAngle) * 180) / Math.PI
      updateGroupTransform(
        groupId,
        { rotation: drag.originRotation + delta },
        { skipHistory: true },
      )
    }

    const onPointerUp = () => {
      if (!dragRef.current) {
        return
      }

      dragRef.current = null
      saveProjectToStorage(useEditorStore.getState().project)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [groupId, updateGroupTransform])

  if (!bounds) {
    return null
  }

  const padding = 6

  const beginPointer = (event: React.PointerEvent<SVGElement>, mode: DragMode) => {
    if (!interactive) {
      return
    }

    event.stopPropagation()
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) {
      return
    }

    useEditorStore.getState().beginHistoryTransaction()
    svgRef.current = svg
    dragRef.current = mode
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  return (
    <g data-eyedropper-ignore>
      <rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        fill="none"
        stroke={UI_STROKE}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        pointerEvents="none"
      />
      {interactive ? (
        <>
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            fill="transparent"
            className="cursor-move"
            onPointerDown={(event) => {
              const svg = event.currentTarget.ownerSVGElement
              if (!svg) {
                return
              }

              const point = clientToArtboard(svg, event.clientX, event.clientY)
              beginPointer(event, {
                type: 'move',
                startX: point.x,
                startY: point.y,
                originX: values.x,
                originY: values.y,
              })
            }}
          />
          <circle
            cx={bounds.x + bounds.width / 2}
            cy={bounds.y - 24}
            r={5}
            fill="#ffffff"
            stroke={UI_STROKE}
            strokeWidth={1.5}
            className="cursor-grab"
            onPointerDown={(event) => {
              const svg = event.currentTarget.ownerSVGElement
              if (!svg) {
                return
              }

              const point = clientToArtboard(svg, event.clientX, event.clientY)
              const centerX = bounds.x + bounds.width / 2
              const centerY = bounds.y + bounds.height / 2
              beginPointer(event, {
                type: 'rotate',
                centerX,
                centerY,
                startAngle: Math.atan2(point.y - centerY, point.x - centerX),
                originRotation: values.rotation,
              })
            }}
          />
          <line
            x1={bounds.x + bounds.width / 2}
            y1={bounds.y}
            x2={bounds.x + bounds.width / 2}
            y2={bounds.y - 24}
            stroke={UI_STROKE}
            strokeWidth={1}
            pointerEvents="none"
          />
        </>
      ) : null}
    </g>
  )
}
