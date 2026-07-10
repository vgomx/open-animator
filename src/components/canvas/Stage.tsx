import { useEffect, useRef, useState } from 'react'

import { CanvasRulers, RULER_SIZE } from '@/components/canvas/CanvasRulers'
import { GuidesLayer } from '@/components/canvas/GuidesLayer'
import { SelectionOverlay } from '@/components/canvas/SelectionOverlay'
import { ShapeView } from '@/components/canvas/ShapeView'
import { SnapLinesLayer } from '@/components/canvas/SnapLinesLayer'
import { getShapeBounds } from '@/editor/bounds'
import { clientToArtboard } from '@/editor/coordinates'
import { useEditorStore } from '@/editor/store'
import { wheelZoomFactor } from '@/editor/viewport'

export function Stage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [marquee, setMarquee] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const panDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  )

  const project = useEditorStore((state) => state.project)
  const currentTime = useEditorStore((state) => state.currentTime)
  const playbackState = useEditorStore((state) => state.playbackState)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const showRulers = useEditorStore((state) => state.showRulers)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const selectLayers = useEditorStore((state) => state.selectLayers)
  const clearSelection = useEditorStore((state) => state.clearSelection)
  const getAnimatedShape = useEditorStore((state) => state.getAnimatedShape)
  const zoom = useEditorStore((state) => state.zoom)
  const panX = useEditorStore((state) => state.panX)
  const panY = useEditorStore((state) => state.panY)
  const setPan = useEditorStore((state) => state.setPan)
  const panBy = useEditorStore((state) => state.panBy)
  const zoomAtPoint = useEditorStore((state) => state.zoomAtPoint)

  const { width, height } = project.artboard
  const onionOffset = 1 / 30

  const renderOnionSkin = () => {
    if (!onionSkinEnabled || playbackState === 'playing') {
      return null
    }

    const frames = [
      { time: currentTime - onionOffset, opacity: 0.28 },
      { time: currentTime + onionOffset, opacity: 0.18 },
    ]

    return frames.flatMap((frame) =>
      project.layers.map((layer) => {
        if (!layer.visible) {
          return null
        }

        const time = Math.max(0, Math.min(frame.time, project.duration))
        const animatedShape = getAnimatedShape(layer, time)

        return (
          <g key={`${layer.id}-${time}`} opacity={frame.opacity} pointerEvents="none">
            <ShapeView shape={animatedShape} />
          </g>
        )
      }),
    )
  }

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

  useEffect(() => {
    if (!marquee) {
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      const svg = svgRef.current
      if (!svg) {
        return
      }

      const point = clientToArtboard(svg, event.clientX, event.clientY)
      setMarquee((current) =>
        current
          ? {
              ...current,
              currentX: point.x,
              currentY: point.y,
            }
          : null,
      )
    }

    const onPointerUp = () => {
      const svg = svgRef.current
      if (!svg || !marquee) {
        setMarquee(null)
        return
      }

      const left = Math.min(marquee.startX, marquee.currentX)
      const right = Math.max(marquee.startX, marquee.currentX)
      const top = Math.min(marquee.startY, marquee.currentY)
      const bottom = Math.max(marquee.startY, marquee.currentY)

      const hits = project.layers
        .filter((layer) => layer.visible)
        .filter((layer) => {
          const bounds = getShapeBounds(getAnimatedShape(layer, currentTime))
          return bounds.x < right && bounds.x + bounds.width > left && bounds.y < bottom && bounds.y + bounds.height > top
        })
        .map((layer) => layer.id)

      if (hits.length > 0) {
        selectLayers(hits)
      } else {
        clearSelection()
      }

      setMarquee(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [clearSelection, currentTime, getAnimatedShape, marquee, project.layers, selectLayers])

  const marqueeRect = marquee
    ? {
        x: Math.min(marquee.startX, marquee.currentX),
        y: Math.min(marquee.startY, marquee.currentY),
        width: Math.abs(marquee.currentX - marquee.startX),
        height: Math.abs(marquee.currentY - marquee.startY),
      }
    : null

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
              onPointerDown={(event) => {
                if (spacePressed || event.button !== 0) {
                  return
                }

                const point = clientToArtboard(event.currentTarget, event.clientX, event.clientY)
                setMarquee({
                  startX: point.x,
                  startY: point.y,
                  currentX: point.x,
                  currentY: point.y,
                })
              }}
            >
              <GuidesLayer width={width} height={height} />
              <SnapLinesLayer width={width} height={height} />
              {renderOnionSkin()}
              {project.layers.map((layer) => {
                if (!layer.visible) {
                  return null
                }

                const animatedShape = getAnimatedShape(layer, currentTime)
                const isSelected = selectedLayerIds.includes(layer.id)
                const isPrimary = layer.id === selectedLayerId

                return (
                  <g
                    key={layer.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      selectLayer(layer.id, {
                        additive: event.shiftKey || event.metaKey || event.ctrlKey,
                      })
                    }}
                    className="cursor-pointer"
                  >
                    <ShapeView shape={animatedShape} />
                    {isSelected ? (
                      <SelectionOverlay
                        layerId={layer.id}
                        shape={animatedShape}
                        interactive={isPrimary}
                      />
                    ) : null}
                  </g>
                )
              })}
              {marqueeRect ? (
                <rect
                  x={marqueeRect.x}
                  y={marqueeRect.y}
                  width={marqueeRect.width}
                  height={marqueeRect.height}
                  fill="rgba(56,189,248,0.12)"
                  stroke="#38bdf8"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              ) : null}
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
