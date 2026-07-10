import { useEffect, useRef } from 'react'

import { clientToArtboard } from '@/editor/coordinates'
import { applyNodePosition, getShapeNodes, type ShapeNode } from '@/editor/path-nodes'
import type { Shape } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { saveProjectToStorage } from '@/io/project'
import { cn } from '@/lib/utils'

type NodeOverlayProps = {
  layerId: string
  shape: Shape
}

export function NodeOverlay({ layerId, shape }: NodeOverlayProps) {
  const updateShape = useEditorStore((state) => state.updateShape)
  const selectedNodeIndices = useEditorStore((state) => state.selectedNodeIndices)
  const selectNodes = useEditorStore((state) => state.selectNodes)
  const locked = useEditorStore(
    (state) => state.project.layers.find((layer) => layer.id === layerId)?.locked ?? false,
  )
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ node: ShapeNode; startX: number; startY: number } | null>(null)

  const nodes = getShapeNodes(shape)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      const svg = svgRef.current
      if (!drag || !svg || locked) {
        return
      }

      const point = clientToArtboard(svg, event.clientX, event.clientY)
      updateShape(layerId, applyNodePosition(shape, drag.node, point.x, point.y), {
        skipHistory: true,
      })
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
  }, [layerId, locked, shape, updateShape])

  const beginDrag = (event: React.PointerEvent<SVGElement>, node: ShapeNode) => {
    if (locked) {
      return
    }

    event.stopPropagation()
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) {
      return
    }

    useEditorStore.getState().beginHistoryTransaction()
    svgRef.current = svg
    const point = clientToArtboard(svg, event.clientX, event.clientY)
    dragRef.current = { node, startX: point.x, startY: point.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  return (
    <g>
      {shape.type === 'path' && shape.points.length > 1 ? (
        <polyline
          points={shape.points.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke="#a855f7"
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={0.6}
          pointerEvents="none"
        />
      ) : null}
      {nodes.map((node) => {
        const isSelected =
          node.index !== undefined ? selectedNodeIndices.includes(node.index) : false

        return (
          <rect
            key={node.id}
            x={node.x - 4}
            y={node.y - 4}
            width={8}
            height={8}
            className={cn('cursor-pointer', isSelected ? 'fill-primary' : 'fill-white')}
            stroke={isSelected ? '#38bdf8' : '#a855f7'}
            strokeWidth={1.5}
            onPointerDown={(event) => {
              if (node.index !== undefined) {
                selectNodes([node.index], {
                  additive: event.shiftKey || event.metaKey || event.ctrlKey,
                })
              }
              beginDrag(event, node)
            }}
          />
        )
      })}
    </g>
  )
}
