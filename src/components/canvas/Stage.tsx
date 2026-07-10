import { useEffect, useRef, useState } from 'react'

import { CanvasRulers, RULER_SIZE } from '@/components/canvas/CanvasRulers'
import { GuidesLayer } from '@/components/canvas/GuidesLayer'
import { SelectionOverlay } from '@/components/canvas/SelectionOverlay'
import { ShapeView } from '@/components/canvas/ShapeView'
import { SnapLinesLayer } from '@/components/canvas/SnapLinesLayer'
import { useEditorStore } from '@/editor/store'
import { wheelZoomFactor } from '@/editor/viewport'

export function Stage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const panDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  )

  const project = useEditorStore((state) => state.project)
  const currentTime = useEditorStore((state) => state.currentTime)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const showRulers = useEditorStore((state) => state.showRulers)
  const setSelectedLayerId = useEditorStore((state) => state.setSelectedLayerId)
  const getAnimatedShape = useEditorStore((state) => state.getAnimatedShape)
  const zoom = useEditorStore((state) => state.zoom)
  const panX = useEditorStore((state) => state.panX)
  const panY = useEditorStore((state) => state.panY)
  const setPan = useEditorStore((state) => state.setPan)
  const panBy = useEditorStore((state) => state.panBy)
  const zoomAtPoint = useEditorStore((state) => state.zoomAtPoint)

  const { width, height } = project.artboard

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        setSpacePressed(true)
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false)
        panDragRef.current = null
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = panDragRef.current
      if (!drag) {
        return
      }

      setPan(drag.originX + (event.clientX - drag.startX), drag.originY + (event.clientY - drag.startY))
    }

    const onPointerUp = () => {
      panDragRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [setPan])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()

      const rect = container.getBoundingClientRect()
      const pointX = event.clientX - rect.left - (showRulers ? RULER_SIZE : 0)
      const pointY = event.clientY - rect.top - (showRulers ? RULER_SIZE : 0)
      const shouldZoom = event.ctrlKey || event.altKey

      if (shouldZoom) {
        zoomAtPoint(
          wheelZoomFactor(event.deltaY),
          pointX,
          pointY,
          showRulers ? rect.width - RULER_SIZE : rect.width,
          showRulers ? rect.height - RULER_SIZE : rect.height,
        )
        return
      }

      panBy(event.deltaX, event.deltaY)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [panBy, showRulers, zoomAtPoint])

  return (
    <div
      ref={containerRef}
      data-stage-viewport
      className={`canvas-backdrop absolute inset-0 overflow-hidden overscroll-none ${spacePressed ? 'cursor-grab' : ''}`}
      style={{
        touchAction: 'none',
        display: 'grid',
        gridTemplateColumns: showRulers ? `${RULER_SIZE}px 1fr` : '1fr',
        gridTemplateRows: showRulers ? `${RULER_SIZE}px 1fr` : '1fr',
      }}
      onPointerDown={(event) => {
        const isMiddleClick = event.button === 1
        if (!spacePressed && !isMiddleClick) {
          return
        }

        event.preventDefault()
        panDragRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: panX,
          originY: panY,
        }
      }}
    >
      <CanvasRulers svgRef={svgRef} canvasAreaRef={canvasAreaRef} />
      <div
        ref={canvasAreaRef}
        className="relative min-h-0 min-w-0 overflow-hidden"
        style={{
          gridColumn: showRulers ? 2 : 1,
          gridRow: showRulers ? 2 : 1,
        }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <div
            className="relative shadow-2xl ring-1 ring-border/40"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <svg
              ref={svgRef}
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="artboard-surface block"
              onClick={() => setSelectedLayerId(null)}
            >
              <GuidesLayer width={width} height={height} />
              <SnapLinesLayer width={width} height={height} />
              {project.layers.map((layer) => {
                if (!layer.visible) {
                  return null
                }

                const animatedShape = getAnimatedShape(layer, currentTime)
                const isSelected = layer.id === selectedLayerId

                return (
                  <g
                    key={layer.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedLayerId(layer.id)
                    }}
                    className="cursor-pointer"
                  >
                    <ShapeView shape={animatedShape} />
                    {isSelected ? (
                      <SelectionOverlay layerId={layer.id} shape={animatedShape} />
                    ) : null}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
