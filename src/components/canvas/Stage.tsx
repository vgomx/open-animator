import { useEffect, useRef, useState } from 'react'

import { CanvasRulers } from '@/components/canvas/CanvasRulers'
import { getCanvasChromeInsets } from '@/editor/viewport-chrome'
import { DrawPreview, PenDraftLayer } from '@/components/canvas/DrawPreview'
import { GuidesLayer } from '@/components/canvas/GuidesLayer'
import { NodeOverlay } from '@/components/canvas/NodeOverlay'
import { SelectionOverlay } from '@/components/canvas/SelectionOverlay'
import { ShapeView } from '@/components/canvas/ShapeView'
import { SnapLinesLayer } from '@/components/canvas/SnapLinesLayer'
import { ToolPalette } from '@/components/canvas/ToolPalette'
import { CanvasContextMenu } from '@/components/canvas/CanvasContextMenu'
import { EyedropperHint } from '@/components/canvas/EyedropperHint'
import { getShapeBounds } from '@/editor/bounds'
import { clientToArtboard } from '@/editor/coordinates'
import { sampleColorFromArtboard } from '@/editor/eyedropper'
import { getToolDefinition, isDrawTool } from '@/editor/tools'
import { useEditorStore } from '@/editor/store'
import { wheelZoomFactor } from '@/editor/viewport'

type DrawDraft = {
  startX: number
  startY: number
  currentX: number
  currentY: number
  kind: 'rect' | 'ellipse'
}

export function Stage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const canvasViewportRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [marquee, setMarquee] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const [drawDraft, setDrawDraft] = useState<DrawDraft | null>(null)
  const [penPreview, setPenPreview] = useState<{ x: number; y: number } | null>(null)
  const panDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  )

  const project = useEditorStore((state) => state.project)
  const currentTime = useEditorStore((state) => state.currentTime)
  const playbackState = useEditorStore((state) => state.playbackState)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const activeTool = useEditorStore((state) => state.activeTool)
  const penDraft = useEditorStore((state) => state.penDraft)
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
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const addPenDraftPoint = useEditorStore((state) => state.addPenDraftPoint)
  const finishPenPath = useEditorStore((state) => state.finishPenPath)
  const cancelPenDraft = useEditorStore((state) => state.cancelPenDraft)
  const createShapeInBounds = useEditorStore((state) => state.createShapeInBounds)
  const createTextAt = useEditorStore((state) => state.createTextAt)
  const eyedropperActive = useEditorStore((state) => state.eyedropperActive)
  const completeEyedropper = useEditorStore((state) => state.completeEyedropper)
  const cancelEyedropper = useEditorStore((state) => state.cancelEyedropper)

  const { width, height } = project.artboard
  const onionOffset = 1 / 30
  const toolDef = getToolDefinition(activeTool)
  const isPanning = spacePressed || activeTool === 'hand'
  const cursor = eyedropperActive
    ? 'crosshair'
    : isPanning
      ? panDragRef.current
        ? 'grabbing'
        : 'grab'
      : toolDef.cursor

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

      if (event.key === 'Escape') {
        cancelPenDraft()
        setDrawDraft(null)
        setMarquee(null)
      }

      if (event.key === 'Enter' && activeTool === 'pen' && penDraft && penDraft.length >= 2) {
        finishPenPath(false)
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
  }, [activeTool, cancelPenDraft, finishPenPath, penDraft])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = panDragRef.current
      if (drag) {
        setPan(drag.originX + (event.clientX - drag.startX), drag.originY + (event.clientY - drag.startY))
      }
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
      const { left: chromeLeft, top: chromeTop } = getCanvasChromeInsets(showRulers)
      const pointX = event.clientX - rect.left - chromeLeft
      const pointY = event.clientY - rect.top - chromeTop
      const shouldZoom = event.ctrlKey || event.altKey

      if (shouldZoom) {
        zoomAtPoint(
          wheelZoomFactor(event.deltaY),
          pointX,
          pointY,
          rect.width - chromeLeft,
          rect.height - chromeTop,
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

  useEffect(() => {
    if (!drawDraft) {
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      const svg = svgRef.current
      if (!svg) {
        return
      }

      const point = clientToArtboard(svg, event.clientX, event.clientY)
      setDrawDraft((current) =>
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
      if (!drawDraft) {
        return
      }

      const left = Math.min(drawDraft.startX, drawDraft.currentX)
      const top = Math.min(drawDraft.startY, drawDraft.currentY)
      const widthPx = Math.abs(drawDraft.currentX - drawDraft.startX)
      const heightPx = Math.abs(drawDraft.currentY - drawDraft.startY)

      if (widthPx > 4 && heightPx > 4) {
        createShapeInBounds(drawDraft.kind, left, top, widthPx, heightPx)
      }

      setDrawDraft(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [createShapeInBounds, drawDraft])

  const beginPan = (event: React.PointerEvent) => {
    event.preventDefault()
    panDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: panX,
      originY: panY,
    }
  }

  const handleArtboardPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return
    }

    const svg = event.currentTarget
    const point = clientToArtboard(svg, event.clientX, event.clientY)

    if (eyedropperActive) {
      event.preventDefault()
      event.stopPropagation()
      void sampleColorFromArtboard(svg, point.x, point.y).then((color) => {
        if (color) {
          completeEyedropper(color)
          return
        }

        cancelEyedropper()
      })
      return
    }

    if (isPanning) {
      beginPan(event)
      return
    }

    if (activeTool === 'zoom') {
      event.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      const { left: chromeLeft, top: chromeTop } = getCanvasChromeInsets(showRulers)
      const pointX = event.clientX - rect.left - chromeLeft
      const pointY = event.clientY - rect.top - chromeTop
      zoomAtPoint(
        event.altKey ? 0.8 : 1.25,
        pointX,
        pointY,
        rect.width - chromeLeft,
        rect.height - chromeTop,
      )
      return
    }

    if (activeTool === 'pen') {
      event.preventDefault()
      const first = penDraft?.[0]
      if (first && penDraft && penDraft.length >= 2) {
        const distance = Math.hypot(point.x - first.x, point.y - first.y)
        if (distance < 10) {
          finishPenPath(true)
          return
        }
      }

      addPenDraftPoint(point)
      return
    }

    if (activeTool === 'text') {
      event.preventDefault()
      createTextAt(point.x, point.y)
      setActiveTool('select')
      return
    }

    if (isDrawTool(activeTool)) {
      event.preventDefault()
      setDrawDraft({
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
        kind: activeTool,
      })
      return
    }

    if (activeTool === 'select') {
      setMarquee({
        startX: point.x,
        startY: point.y,
        currentX: point.x,
        currentY: point.y,
      })
      return
    }

    if (activeTool === 'node') {
      clearSelection()
    }
  }

  const handleArtboardPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool !== 'pen') {
      setPenPreview(null)
      return
    }

    const point = clientToArtboard(event.currentTarget, event.clientX, event.clientY)
    setPenPreview(point)
  }

  const marqueeRect = marquee
    ? {
        x: Math.min(marquee.startX, marquee.currentX),
        y: Math.min(marquee.startY, marquee.currentY),
        width: Math.abs(marquee.currentX - marquee.startX),
        height: Math.abs(marquee.currentY - marquee.startY),
      }
    : null

  const drawPreview = drawDraft
    ? {
        x: Math.min(drawDraft.startX, drawDraft.currentX),
        y: Math.min(drawDraft.startY, drawDraft.currentY),
        width: Math.abs(drawDraft.currentX - drawDraft.startX),
        height: Math.abs(drawDraft.currentY - drawDraft.startY),
        kind: drawDraft.kind,
      }
    : null

  const prepareContextMenu = (event: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg) {
      return
    }

    const point = clientToArtboard(svg, event.clientX, event.clientY)
    const additive = event.shiftKey || event.metaKey || event.ctrlKey

    for (const layer of [...project.layers].reverse()) {
      if (!layer.visible) {
        continue
      }

      const bounds = getShapeBounds(getAnimatedShape(layer, currentTime))
      const hit =
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height

      if (hit) {
        selectLayer(layer.id, { additive })
        return
      }
    }

    if (!additive) {
      clearSelection()
    }
  }

  const chromeInsets = getCanvasChromeInsets(showRulers)

  return (
    <div
      ref={containerRef}
      data-stage-viewport
      className="canvas-backdrop absolute inset-0 overflow-hidden overscroll-none"
      style={{
        touchAction: 'none',
        cursor,
      }}
      onPointerDown={(event) => {
        const isMiddleClick = event.button === 1
        if (!isPanning && !isMiddleClick) {
          return
        }

        beginPan(event)
      }}
    >
      <CanvasContextMenu onPrepare={prepareContextMenu}>
        <div ref={canvasAreaRef} className="absolute inset-0 overflow-hidden">
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
              onPointerDown={handleArtboardPointerDown}
              onPointerMove={handleArtboardPointerMove}
              onPointerLeave={() => setPenPreview(null)}
            >
              <GuidesLayer width={width} height={height} />
              <SnapLinesLayer width={width} height={height} />
              <g data-eyedropper-ignore>{renderOnionSkin()}</g>
              {project.layers.map((layer) => {
                if (!layer.visible) {
                  return null
                }

                const animatedShape = getAnimatedShape(layer, currentTime)
                const isSelected = selectedLayerIds.includes(layer.id)
                const isPrimary = layer.id === selectedLayerId
                const allowLayerSelect = activeTool === 'select' || activeTool === 'node'

                return (
                  <g
                    key={layer.id}
                    onPointerDown={(event) => {
                      if (!allowLayerSelect || isPanning) {
                        return
                      }

                      event.stopPropagation()
                      selectLayer(layer.id, {
                        additive: event.shiftKey || event.metaKey || event.ctrlKey,
                      })
                    }}
                    className={allowLayerSelect ? 'cursor-pointer' : undefined}
                    style={{ pointerEvents: allowLayerSelect ? 'auto' : 'none' }}
                  >
                    <ShapeView shape={animatedShape} />
                    <g data-eyedropper-ignore>
                      {isSelected && activeTool === 'select' ? (
                        <SelectionOverlay
                          layerId={layer.id}
                          shape={animatedShape}
                          interactive={isPrimary}
                        />
                      ) : null}
                      {isSelected && activeTool === 'node' && isPrimary ? (
                        <NodeOverlay layerId={layer.id} shape={animatedShape} />
                      ) : null}
                    </g>
                  </g>
                )
              })}
              {penDraft && penDraft.length > 0 ? (
                <g data-eyedropper-ignore>
                  <PenDraftLayer points={penDraft} previewPoint={penPreview} />
                </g>
              ) : null}
              {drawPreview ? (
                <g data-eyedropper-ignore>
                  <DrawPreview
                    x={drawPreview.x}
                    y={drawPreview.y}
                    width={drawPreview.width}
                    height={drawPreview.height}
                    kind={drawPreview.kind}
                  />
                </g>
              ) : null}
              {marqueeRect && activeTool === 'select' ? (
                <rect
                  data-eyedropper-ignore
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
      </CanvasContextMenu>

      <div
        ref={canvasViewportRef}
        className="pointer-events-none absolute right-0 bottom-0"
        style={{ left: chromeInsets.left, top: chromeInsets.top }}
      />

      <CanvasRulers svgRef={svgRef} canvasViewportRef={canvasViewportRef} />
      <ToolPalette />
      <EyedropperHint />
    </div>
  )
}
