import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AnimatedMaskDefs } from '@/components/canvas/AnimatedMaskDefs'
import { FastPreviewBadge } from '@/components/canvas/CanvasPlaybackRenderer'
import { UnifiedPlaybackDriver } from '@/components/canvas/UnifiedPlaybackDriver'
import { WebGlViewportOverlay, type WebGlViewportOverlayHandle } from '@/components/canvas/WebGlViewportOverlay'
import { CanvasRulers } from '@/components/canvas/CanvasRulers'
import { DrawPreview, PenDraftLayer } from '@/components/canvas/DrawPreview'
import { GroupSelectionOverlay } from '@/components/canvas/GroupSelectionOverlay'
import { GuidesLayer } from '@/components/canvas/GuidesLayer'
import { ShapeView } from '@/components/canvas/ShapeView'
import { StageLayer } from '@/components/canvas/StageLayer'
import { SnapLinesLayer } from '@/components/canvas/SnapLinesLayer'
import { ToolPalette } from '@/components/canvas/ToolPalette'
import { CanvasContextMenu } from '@/components/canvas/CanvasContextMenu'
import { EyedropperHint } from '@/components/canvas/EyedropperHint'
import { TextEditOverlay } from '@/components/canvas/TextEditOverlay'
import { isTransparentColor, normalizeHex } from '@/editor/color-utils'
import { getShapeBounds } from '@/editor/bounds'
import { createPathPointWithHandle } from '@/editor/path-nodes'
import { clientToArtboard } from '@/editor/coordinates'
import { sampleColorFromArtboard } from '@/editor/eyedropper'
import { getCanvasChromeInsets, getViewportPoint } from '@/editor/viewport-chrome'
import { getToolDefinition, isDrawTool } from '@/editor/tools'
import { shouldUseCanvasPlayback } from '@/editor/canvas-playback'
import { createViewportController, type ViewportController } from '@/editor/viewport-controller'
import { getArtboardLayers, getProjectFps } from '@/editor/artboard-utils'
import { useActiveArtboard, useEditorStore } from '@/editor/store'
import { UI_STROKE } from '@/lib/brand-colors'
import { isWebGl2Available } from '@/lib/webgl-viewport'
import { cn } from '@/lib/utils'
import { normalizeWheelDelta, wheelZoomFactorFromPixels } from '@/editor/viewport'
import type { Shape } from '@/editor/types'

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
  const transformRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const playbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const webGlOverlayRef = useRef<WebGlViewportOverlayHandle>(null)
  const viewportControllerRef = useRef<ViewportController | null>(null)
  if (!viewportControllerRef.current) {
    viewportControllerRef.current = createViewportController({
      getStoreState: () => {
        const { zoom, panX, panY } = useEditorStore.getState()
        return { zoom, panX, panY }
      },
      setStoreState: (state) => {
        useEditorStore.getState().setViewport(state)
      },
    })
  }
  const viewportController = viewportControllerRef.current
  const [spacePressed, setSpacePressed] = useState(false)
  const [marquee, setMarquee] = useState<{
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)
  const [drawDraft, setDrawDraft] = useState<DrawDraft | null>(null)
  const [penPreview, setPenPreview] = useState<{ x: number; y: number } | null>(null)
  const [penDrag, setPenDrag] = useState<{ anchor: { x: number; y: number } } | null>(null)
  const drawDraftRef = useRef<DrawDraft | null>(null)
  const marqueeRef = useRef(marquee)
  const penDragRef = useRef(penDrag)

  useEffect(() => {
    drawDraftRef.current = drawDraft
  }, [drawDraft])

  useEffect(() => {
    marqueeRef.current = marquee
  }, [marquee])

  useEffect(() => {
    penDragRef.current = penDrag
  }, [penDrag])
  const panDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  )
  const wheelEndFlushTimerRef = useRef<number | null>(null)

  const project = useEditorStore((state) => state.project)
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId)
  const layersPanelWidth = useEditorStore((state) => state.layersPanelWidth)
  const propertiesPanelWidth = useEditorStore((state) => state.propertiesPanelWidth)
  const artboard = useActiveArtboard()
  const visibleLayers = useMemo(
    () => getArtboardLayers(project, activeArtboardId ?? project.artboards[0]?.id ?? ''),
    [activeArtboardId, project],
  )
  const storeCurrentTime = useEditorStore((state) =>
    state.playbackState !== 'playing' ? state.currentTime : null,
  )
  const playbackState = useEditorStore((state) => state.playbackState)
  const canvasPlaybackActive = shouldUseCanvasPlayback(visibleLayers.length, playbackState)
  const displayTimeRef = useRef(useEditorStore.getState().currentTime)
  if (storeCurrentTime !== null) {
    displayTimeRef.current = storeCurrentTime
  }
  const displayTime = displayTimeRef.current
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectedGroupId = useEditorStore((state) => state.selectedGroupId)
  const selectedLayerIdSet = useMemo(() => new Set(selectedLayerIds), [selectedLayerIds])
  const activeTool = useEditorStore((state) => state.activeTool)
  const penDraft = useEditorStore((state) => state.penDraft)
  const showRulers = useEditorStore((state) => state.showRulers)
  const showLayersPanel = useEditorStore((state) => state.showLayersPanel)
  const showPropertiesPanel = useEditorStore((state) => state.showPropertiesPanel)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const onionSkinSettings = useEditorStore((state) => state.onionSkinSettings)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const selectLayers = useEditorStore((state) => state.selectLayers)
  const clearSelection = useEditorStore((state) => state.clearSelection)
  const getAnimatedShape = useEditorStore((state) => state.getAnimatedShape)
  const experimentalWebGlViewport = useEditorStore((state) => state.experimentalWebGlViewport)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const webGlViewportActive =
    canvasPlaybackActive && experimentalWebGlViewport && isWebGl2Available()

  const handlePlaybackFrame = useCallback(() => {
    if (webGlViewportActive) {
      webGlOverlayRef.current?.drawFrame()
    }
  }, [webGlViewportActive])
  const [canvasPreviewReady, setCanvasPreviewReady] = useState(false)

  useEffect(() => {
    if (!canvasPlaybackActive) {
      setCanvasPreviewReady(false)
    }
  }, [canvasPlaybackActive])
  const addPenDraftPoint = useEditorStore((state) => state.addPenDraftPoint)
  const finishPenPath = useEditorStore((state) => state.finishPenPath)
  const cancelPenDraft = useEditorStore((state) => state.cancelPenDraft)
  const createShapeInBounds = useEditorStore((state) => state.createShapeInBounds)
  const createTextAt = useEditorStore((state) => state.createTextAt)
  const eyedropperActive = useEditorStore((state) => state.eyedropperActive)
  const completeEyedropper = useEditorStore((state) => state.completeEyedropper)
  const cancelEyedropper = useEditorStore((state) => state.cancelEyedropper)
  const setEditingTextLayerId = useEditorStore((state) => state.setEditingTextLayerId)
  const editingTextLayerId = useEditorStore((state) => state.editingTextLayerId)

  const { width, height, backgroundColor } = artboard
  const artboardUsesGrid = isTransparentColor(backgroundColor)
  const artboardFill = artboardUsesGrid ? undefined : normalizeHex(backgroundColor)
  const canvasUsesGrid = isTransparentColor(project.canvas.backgroundColor)
  const canvasFill = canvasUsesGrid ? undefined : normalizeHex(project.canvas.backgroundColor)
  const frameStep = 1 / getProjectFps(project)
  const panelChrome = {
    showLayersPanel,
    showPropertiesPanel,
    layersPanelWidth,
    propertiesPanelWidth,
  }
  const toolDef = getToolDefinition(activeTool)
  const isPanning = spacePressed || activeTool === 'hand'
  const allowLayerSelect = activeTool === 'select' || activeTool === 'node'
  const cursor = eyedropperActive
    ? 'crosshair'
    : isPanning
      ? panDragRef.current
        ? 'grabbing'
        : 'grab'
      : toolDef.cursor

  const animatedShapes = useMemo(() => {
    const shapes = new Map<string, Shape>()
    for (const layer of visibleLayers) {
      if (layer.visible) {
        shapes.set(layer.id, getAnimatedShape(layer, displayTime))
      }
    }
    return shapes
  }, [displayTime, getAnimatedShape, visibleLayers])

  const handleLayerSelect = useCallback(
    (layerId: string, options: { additive: boolean }) => {
      selectLayer(layerId, options)
    },
    [selectLayer],
  )

  const handleEditText = useCallback(
    (layerId: string) => {
      setEditingTextLayerId(layerId)
    },
    [setEditingTextLayerId],
  )

  const renderOnionSkin = () => {
    if (!onionSkinEnabled || playbackState === 'playing') {
      return null
    }

    const frames: Array<{ time: number; opacity: number; tint: string }> = []

    for (let index = 1; index <= onionSkinSettings.framesBefore; index += 1) {
      frames.push({
        time: displayTime - index * frameStep,
        opacity: onionSkinSettings.opacityBefore / index,
        tint: onionSkinSettings.tintBefore,
      })
    }

    for (let index = 1; index <= onionSkinSettings.framesAfter; index += 1) {
      frames.push({
        time: displayTime + index * frameStep,
        opacity: onionSkinSettings.opacityAfter / index,
        tint: onionSkinSettings.tintAfter,
      })
    }

    return frames.flatMap((frame) =>
      visibleLayers.map((layer) => {
        if (!layer.visible) {
          return null
        }

        const time = Math.max(0, Math.min(frame.time, project.duration))
        const animatedShape = getAnimatedShape(layer, time)
        const bounds = getShapeBounds(animatedShape)

        return (
          <g key={`${layer.id}-${time}`} pointerEvents="none">
            <g opacity={frame.opacity}>
              <ShapeView shape={animatedShape} />
            </g>
            <rect
              x={bounds.x}
              y={bounds.y}
              width={bounds.width}
              height={bounds.height}
              fill={frame.tint}
              opacity={0.18}
              pointerEvents="none"
            />
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
        setPenDrag(null)
        setEditingTextLayerId(null)
        if (useEditorStore.getState().selectedLayerIds.length > 0) {
          clearSelection()
        }
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
  }, [activeTool, cancelPenDraft, clearSelection, finishPenPath, penDraft, setEditingTextLayerId])

  useEffect(() => {
    viewportController.bindTransformElement(webGlViewportActive ? null : transformRef.current)
    if (webGlViewportActive && transformRef.current) {
      transformRef.current.style.transform = 'none'
    } else {
      viewportController.syncFromStore()
    }
  }, [viewportController, webGlViewportActive])

  useEffect(() => {
    return useEditorStore.subscribe((state, previousState) => {
      if (
        state.zoom === previousState.zoom &&
        state.panX === previousState.panX &&
        state.panY === previousState.panY
      ) {
        return
      }

      viewportController.syncFromStore()
    })
  }, [viewportController])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = panDragRef.current
      if (drag) {
        viewportController.setPan(
          drag.originX + (event.clientX - drag.startX),
          drag.originY + (event.clientY - drag.startY),
        )
      }
    }

    const onPointerUp = () => {
      if (panDragRef.current) {
        viewportController.flushNow()
      }
      panDragRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [viewportController])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      if (event.cancelable !== false) {
        event.preventDefault()
      }

      const shouldZoom = event.ctrlKey || event.altKey
      const { deltaX, deltaY } = normalizeWheelDelta(
        event.deltaX,
        event.deltaY,
        event.deltaMode,
        { shiftKey: event.shiftKey, clampZoomDelta: shouldZoom },
      )

      if (shouldZoom) {
        const viewport = canvasViewportRef.current
        if (!viewport) {
          return
        }

        const point = getViewportPoint(viewport, event.clientX, event.clientY)
        viewportController.zoomAtPoint(
          wheelZoomFactorFromPixels(deltaY),
          point.x,
          point.y,
          point.width,
          point.height,
        )
      } else {
        viewportController.panBy(deltaX, deltaY)
      }

      if (wheelEndFlushTimerRef.current !== null) {
        window.clearTimeout(wheelEndFlushTimerRef.current)
      }
      wheelEndFlushTimerRef.current = window.setTimeout(() => {
        wheelEndFlushTimerRef.current = null
        viewportController.flushNow()
      }, 150)
    }

    container.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => {
      if (wheelEndFlushTimerRef.current !== null) {
        window.clearTimeout(wheelEndFlushTimerRef.current)
        wheelEndFlushTimerRef.current = null
      }
      container.removeEventListener('wheel', onWheel, { capture: true })
    }
  }, [viewportController])

  const finishMarquee = () => {
    const current = marqueeRef.current
    if (!current) {
      return
    }

    const left = Math.min(current.startX, current.currentX)
    const right = Math.max(current.startX, current.currentX)
    const top = Math.min(current.startY, current.currentY)
    const bottom = Math.max(current.startY, current.currentY)

    const hits = visibleLayers
      .filter((layer) => layer.visible)
      .filter((layer) => {
        const bounds = getShapeBounds(getAnimatedShape(layer, displayTime))
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

  const finishDrawDraft = () => {
    const draft = drawDraftRef.current
    if (!draft) {
      return
    }

    const left = Math.min(draft.startX, draft.currentX)
    const top = Math.min(draft.startY, draft.currentY)
    const widthPx = Math.abs(draft.currentX - draft.startX)
    const heightPx = Math.abs(draft.currentY - draft.startY)

    if (widthPx > 4 && heightPx > 4) {
      createShapeInBounds(draft.kind, left, top, widthPx, heightPx)
    }

    setDrawDraft(null)
  }

  const finishPenDrag = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const drag = penDragRef.current
    if (!drag) {
      return
    }

    const point = clientToArtboard(svg, clientX, clientY)
    addPenDraftPoint(createPathPointWithHandle(drag.anchor, point))
    setPenDrag(null)
    setPenPreview(null)
  }

  const beginPan = (event: React.PointerEvent) => {
    event.preventDefault()
    const { panX, panY } = viewportController.getLiveState()
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
      void sampleColorFromArtboard(svg, point.x, point.y, {
        artboardColor: artboardFill ?? 'none',
        workspaceColor: canvasFill ?? 'none',
      }).then((color) => {
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
      const viewport = canvasViewportRef.current
      if (!viewport) {
        return
      }

      const point = getViewportPoint(viewport, event.clientX, event.clientY)
      viewportController.zoomAtPoint(
        event.altKey ? 0.8 : 1.25,
        point.x,
        point.y,
        point.width,
        point.height,
      )
      return
    }

    if (activeTool === 'pen') {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      const first = penDraft?.[0]
      if (first && penDraft && penDraft.length >= 2) {
        const distance = Math.hypot(point.x - first.x, point.y - first.y)
        if (distance < 10) {
          finishPenPath(true)
          return
        }
      }

      setPenDrag({ anchor: point })
      setPenPreview(point)
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
      event.currentTarget.setPointerCapture(event.pointerId)
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
      event.currentTarget.setPointerCapture(event.pointerId)
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
    const svg = event.currentTarget
    const point = clientToArtboard(svg, event.clientX, event.clientY)

    if (drawDraftRef.current) {
      setDrawDraft((current) =>
        current
          ? {
              ...current,
              currentX: point.x,
              currentY: point.y,
            }
          : null,
      )
      return
    }

    if (marqueeRef.current) {
      setMarquee((current) =>
        current
          ? {
              ...current,
              currentX: point.x,
              currentY: point.y,
            }
          : null,
      )
      return
    }

    if (penDragRef.current) {
      setPenPreview(point)
      return
    }

    if (activeTool === 'pen') {
      setPenPreview(point)
      return
    }

    setPenPreview(null)
  }

  const handleArtboardPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (drawDraftRef.current) {
      finishDrawDraft()
      return
    }

    if (marqueeRef.current) {
      finishMarquee()
      return
    }

    if (penDragRef.current) {
      finishPenDrag(event.currentTarget, event.clientX, event.clientY)
    }
  }

  const penPreviewPoint =
    penDrag && penPreview
      ? createPathPointWithHandle(penDrag.anchor, penPreview)
      : penPreview

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

    for (const layer of [...visibleLayers].reverse()) {
      if (!layer.visible) {
        continue
      }

      const bounds = getShapeBounds(getAnimatedShape(layer, displayTime))
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

  const chromeInsets = getCanvasChromeInsets(showRulers, panelChrome)

  return (
    <div
      ref={containerRef}
      data-stage-viewport
      className={cn(
        'editor-shell__canvas absolute inset-0 overflow-hidden overscroll-none',
        canvasUsesGrid && 'canvas-backdrop',
      )}
      style={{
        touchAction: 'none',
        cursor,
        ...(!canvasUsesGrid
          ? { backgroundColor: canvasFill, backgroundImage: 'none' }
          : undefined),
      }}
      onPointerDown={(event) => {
        const isMiddleClick = event.button === 1
        if (!isPanning && !isMiddleClick) {
          return
        }

        beginPan(event)
      }}
    >
      <UnifiedPlaybackDriver
        layers={visibleLayers}
        svgRef={svgRef}
        canvasRef={playbackCanvasRef}
        artboardWidth={width}
        artboardHeight={height}
        useCanvasOutput={canvasPlaybackActive}
        onAfterFrame={webGlViewportActive ? handlePlaybackFrame : undefined}
        onCanvasFrameReady={() => setCanvasPreviewReady(true)}
      />
      <CanvasContextMenu onPrepare={prepareContextMenu}>
        <div ref={canvasAreaRef} className="absolute inset-0 overflow-hidden">
          <div className="flex h-full w-full items-center justify-center">
          <div
            ref={transformRef}
            className="relative ring-1 ring-border/40 [backface-visibility:hidden] [contain:layout_paint] [will-change:transform]"
          >
            {canvasPlaybackActive ? (
              <canvas
                ref={playbackCanvasRef}
                width={width}
                height={height}
                className={cn(
                  'absolute inset-0 z-[1] block',
                  artboardUsesGrid && 'artboard-surface',
                  !canvasPreviewReady && 'opacity-0',
                )}
                aria-hidden
              />
            ) : null}
            <FastPreviewBadge active={canvasPlaybackActive} gpu={webGlViewportActive} />
            <svg
              ref={svgRef}
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className={cn(
                'block',
                artboardUsesGrid && 'artboard-surface',
                canvasPlaybackActive && canvasPreviewReady && 'invisible',
              )}
              onPointerDown={handleArtboardPointerDown}
              onPointerMove={handleArtboardPointerMove}
              onPointerUp={handleArtboardPointerUp}
              onPointerCancel={handleArtboardPointerUp}
              onPointerLeave={() => {
                if (!penDragRef.current) {
                  setPenPreview(null)
                }
              }}
            >
              <AnimatedMaskDefs layers={visibleLayers} />
              <defs>
                <clipPath id="artboard-clip">
                  <rect width={width} height={height} />
                </clipPath>
              </defs>
              {!artboardUsesGrid ? (
                <rect
                  data-eyedropper-ignore
                  width={width}
                  height={height}
                  fill={artboardFill}
                />
              ) : null}
              <GuidesLayer width={width} height={height} />
              <SnapLinesLayer width={width} height={height} />
              <g clipPath="url(#artboard-clip)">
              <g data-eyedropper-ignore>{renderOnionSkin()}</g>
              {visibleLayers.map((layer) => {
                if (!layer.visible) {
                  return null
                }

                const animatedShape = animatedShapes.get(layer.id)
                if (!animatedShape) {
                  return null
                }

                return (
                  <StageLayer
                    key={layer.id}
                    layer={layer}
                    shape={animatedShape}
                    isSelected={selectedLayerIdSet.has(layer.id)}
                    isPrimary={layer.id === selectedLayerId}
                    allowLayerSelect={allowLayerSelect}
                    isPanning={isPanning}
                    activeTool={activeTool}
                    onSelect={handleLayerSelect}
                    onEditText={handleEditText}
                  />
                )
              })}
              {selectedGroupId && activeTool === 'select' ? (
                <GroupSelectionOverlay groupId={selectedGroupId} />
              ) : null}
              </g>
              {penDraft && penDraft.length > 0 ? (
                <g data-eyedropper-ignore>
                  <PenDraftLayer points={penDraft} previewPoint={penPreviewPoint} />
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
                  fill="rgba(242, 84, 45, 0.12)"
                  stroke={UI_STROKE}
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              ) : null}
            </svg>
            {!editingTextLayerId ? null : <TextEditOverlay />}
          </div>
          </div>
          <WebGlViewportOverlay
            ref={webGlOverlayRef}
            active={webGlViewportActive}
            artboardWidth={width}
            artboardHeight={height}
            sourceCanvasRef={playbackCanvasRef}
            viewportController={viewportController}
            containerRef={canvasAreaRef}
            playbackDriven={webGlViewportActive}
          />
        </div>
      </CanvasContextMenu>

      <div
        ref={canvasViewportRef}
        data-canvas-viewport
        className="pointer-events-none absolute bottom-0"
        style={{ left: chromeInsets.left, top: chromeInsets.top, right: chromeInsets.right }}
      />

      <CanvasRulers svgRef={svgRef} canvasViewportRef={canvasViewportRef} />
      <ToolPalette />
      <EyedropperHint />
    </div>
  )
}
