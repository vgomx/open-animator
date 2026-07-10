import { useEffect, useRef } from 'react'

import {
  applyResize,
  getShapeBounds,
  type ResizeHandle,
  type ShapeBounds,
} from '@/editor/bounds'
import type { Shape } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { saveProjectToStorage } from '@/io/project'

type SelectionOverlayProps = {
  layerId: string
  shape: Shape
}

const handlePositions: Array<{ handle: ResizeHandle; x: number; y: number }> = [
  { handle: 'nw', x: 0, y: 0 },
  { handle: 'ne', x: 1, y: 0 },
  { handle: 'sw', x: 0, y: 1 },
  { handle: 'se', x: 1, y: 1 },
]

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const transformed = point.matrixTransform(svg.getScreenCTM()?.inverse())
  return { x: transformed.x, y: transformed.y }
}

type DragMode = { type: 'move'; startX: number; startY: number; originX: number; originY: number } | {
  type: 'resize'
  handle: ResizeHandle
  anchor: ShapeBounds
}

export function SelectionOverlay({ layerId, shape }: SelectionOverlayProps) {
  const updateShape = useEditorStore((state) => state.updateShape)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragMode | null>(null)

  const bounds = getShapeBounds(shape)
  const padding = 6

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      const svg = svgRef.current
      if (!drag || !svg) {
        return
      }

      const store = useEditorStore.getState()
      const layer = store.project.layers.find((item) => item.id === layerId)
      if (!layer) {
        return
      }

      const currentShape = store.getAnimatedShape(layer, store.currentTime)
      const point = clientToSvg(svg, event.clientX, event.clientY)

      if (drag.type === 'move') {
        const deltaX = point.x - drag.startX
        const deltaY = point.y - drag.startY
        updateShape(
          layerId,
          {
            x: drag.originX + deltaX,
            y: drag.originY + deltaY,
          },
          { skipHistory: true },
        )
        return
      }

      const patch = applyResize(currentShape, drag.handle, point.x, point.y, drag.anchor)
      updateShape(layerId, patch, { skipHistory: true })
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
  }, [layerId, updateShape])

  const beginPointer = (
    event: React.PointerEvent<SVGElement>,
    mode: DragMode,
  ) => {
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
    <g>
      <rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        pointerEvents="none"
      />
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="transparent"
        className="cursor-move"
        onPointerDown={(event) => {
          const target = event.currentTarget as SVGRectElement
          const svg = target.ownerSVGElement
          if (!svg) {
            return
          }
          const point = clientToSvg(svg, event.clientX, event.clientY)
          beginPointer(event, {
            type: 'move',
            startX: point.x,
            startY: point.y,
            originX: shape.x,
            originY: shape.y,
          })
        }}
      />
      {handlePositions.map(({ handle, x, y }) => (
        <circle
          key={handle}
          cx={bounds.x + bounds.width * x}
          cy={bounds.y + bounds.height * y}
          r={5}
          fill="#ffffff"
          stroke="#38bdf8"
          strokeWidth={1.5}
          className="cursor-nwse-resize"
          onPointerDown={(event) => {
            beginPointer(event, {
              type: 'resize',
              handle,
              anchor: bounds,
            })
          }}
        />
      ))}
    </g>
  )
}
