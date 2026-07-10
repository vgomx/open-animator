import { useEffect, useRef } from 'react'

import {
  applyResize,
  getShapeBounds,
  type ResizeHandle,
  type ShapeBounds,
} from '@/editor/bounds'
import { clientToArtboard } from '@/editor/coordinates'
import { translateShape } from '@/editor/shape-transform'
import {
  collectSnapTargets,
  snapBounds,
  snapPoint,
  snapThresholdForZoom,
} from '@/editor/snap'
import type { Shape } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { saveProjectToStorage } from '@/io/project'

type SelectionOverlayProps = {
  layerId: string
  shape: Shape
  interactive?: boolean
}

const handlePositions: Array<{ handle: ResizeHandle; x: number; y: number }> = [
  { handle: 'nw', x: 0, y: 0 },
  { handle: 'ne', x: 1, y: 0 },
  { handle: 'sw', x: 0, y: 1 },
  { handle: 'se', x: 1, y: 1 },
]

type DragMode =
  | {
      type: 'move'
      startX: number
      startY: number
      primaryBoundsOrigin: ShapeBounds
      initialShapes: Map<string, Shape>
    }
  | {
      type: 'resize'
      handle: ResizeHandle
      anchor: ShapeBounds
    }
  | {
      type: 'rotate'
      centerX: number
      centerY: number
      startAngle: number
      originRotation: number
    }

export function SelectionOverlay({ layerId, shape, interactive = true }: SelectionOverlayProps) {
  const updateShape = useEditorStore((state) => state.updateShape)
  const setActiveSnapLines = useEditorStore((state) => state.setActiveSnapLines)
  const locked = useEditorStore(
    (state) => state.project.layers.find((layer) => layer.id === layerId)?.locked ?? false,
  )
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
      const point = clientToArtboard(svg, event.clientX, event.clientY)
      const threshold = store.snapEnabled ? snapThresholdForZoom(store.zoom) : 0
      const targets = store.snapEnabled
        ? collectSnapTargets({
            artboardWidth: store.project.artboard.width,
            artboardHeight: store.project.artboard.height,
            guides: store.project.guides,
            layers: store.project.layers,
            currentTime: store.currentTime,
            excludeLayerId: layerId,
            getAnimatedShape: store.getAnimatedShape,
          })
        : []

      if (drag.type === 'move') {
        const currentBounds = getShapeBounds(currentShape)
        const proposedBounds = {
          ...currentBounds,
          x: drag.primaryBoundsOrigin.x + (point.x - drag.startX),
          y: drag.primaryBoundsOrigin.y + (point.y - drag.startY),
        }
        const snapped = snapBounds(proposedBounds, targets, threshold)
        setActiveSnapLines(snapped.lines)
        const deltaX = snapped.bounds.x - drag.primaryBoundsOrigin.x
        const deltaY = snapped.bounds.y - drag.primaryBoundsOrigin.y

        for (const [selectedId, initialShape] of drag.initialShapes) {
          updateShape(
            selectedId,
            translateShape(initialShape, deltaX, deltaY),
            { skipHistory: true },
          )
        }
        return
      }

      if (drag.type === 'rotate') {
        const angle = Math.atan2(point.y - drag.centerY, point.x - drag.centerX)
        const delta = ((angle - drag.startAngle) * 180) / Math.PI
        updateShape(
          layerId,
          { rotation: drag.originRotation + delta },
          { skipHistory: true },
        )
        return
      }

      const snappedPoint = snapPoint(point.x, point.y, targets, threshold)
      setActiveSnapLines(snappedPoint.lines)
      const patch = applyResize(
        currentShape,
        drag.handle,
        snappedPoint.x,
        snappedPoint.y,
        drag.anchor,
      )
      updateShape(layerId, patch, { skipHistory: true })
    }

    const onPointerUp = () => {
      if (!dragRef.current) {
        return
      }

      dragRef.current = null
      setActiveSnapLines([])
      saveProjectToStorage(useEditorStore.getState().project)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [layerId, setActiveSnapLines, updateShape])

  const beginPointer = (event: React.PointerEvent<SVGElement>, mode: DragMode) => {
    if (locked || !interactive) {
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
    <g>
      <rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        fill="none"
        stroke={locked ? '#f59e0b' : '#38bdf8'}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        pointerEvents="none"
      />
      {locked || !interactive ? null : (
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
          const store = useEditorStore.getState()
          let initialShapes = new Map<string, Shape>()

          if (event.altKey) {
            store.duplicateSelectedLayerInPlace()
            const nextStore = useEditorStore.getState()
            for (const selectedId of nextStore.selectedLayerIds) {
              const selectedLayer = nextStore.project.layers.find((item) => item.id === selectedId)
              if (!selectedLayer || selectedLayer.locked) {
                continue
              }

              initialShapes.set(
                selectedId,
                nextStore.getAnimatedShape(selectedLayer, nextStore.currentTime),
              )
            }
          } else {
            for (const selectedId of store.selectedLayerIds) {
              const selectedLayer = store.project.layers.find((item) => item.id === selectedId)
              if (!selectedLayer || selectedLayer.locked) {
                continue
              }

              initialShapes.set(
                selectedId,
                store.getAnimatedShape(selectedLayer, store.currentTime),
              )
            }
          }

          beginPointer(event, {
            type: 'move',
            startX: point.x,
            startY: point.y,
            primaryBoundsOrigin: bounds,
            initialShapes,
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
      <circle
        cx={bounds.x + bounds.width / 2}
        cy={bounds.y - 24}
        r={5}
        fill="#ffffff"
        stroke="#38bdf8"
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
            originRotation: shape.rotation,
          })
        }}
      />
      <line
        x1={bounds.x + bounds.width / 2}
        y1={bounds.y}
        x2={bounds.x + bounds.width / 2}
        y2={bounds.y - 24}
        stroke="#38bdf8"
        strokeWidth={1}
        pointerEvents="none"
      />
        </>
      )}
    </g>
  )
}
