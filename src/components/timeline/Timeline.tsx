import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TimelineLayerLabel, TimelinePropertyLabel } from '@/components/timeline/TimelineLayerLabel'
import { TimelineLayerTrack } from '@/components/timeline/TimelineLayerTrack'
import { TimelinePropertyTrack } from '@/components/timeline/TimelinePropertyTrack'
import { getTimelineHandleTarget, TimelineRuler } from '@/components/timeline/TimelineRuler'
import { Button } from '@/components/ui/button'
import { getArtboardLayers } from '@/editor/artboard-utils'
import type { AnimatableProperty, Keyframe, Layer } from '@/editor/types'
import { ANIMATABLE_PROPERTIES } from '@/editor/types'
import {
  TIMELINE_LABEL_WIDTH,
  TIMELINE_PX_PER_SECOND,
} from '@/editor/layout-constants'
import {
  collectKeyframeTimes,
  formatTimelineTime,
  getTimelineContentWidth,
  snapTimelineTime,
  timeFromClientX,
  timeToPixel,
} from '@/editor/timeline-utils'
import { useEditorStore } from '@/editor/store'
import { UI_STROKE } from '@/lib/brand-colors'
import { saveProjectToStorage } from '@/io/project'
import { Bookmark, ClipboardPaste, Copy, Flag, Minus, Plus, Sparkles } from 'lucide-react'

const propertyLabels: Record<AnimatableProperty, string> = {
  x: 'X',
  y: 'Y',
  opacity: 'Opacity',
  scale: 'Scale',
  rotation: 'Rotation',
  fill: 'Fill',
  stroke: 'Stroke',
  width: 'Width',
  height: 'Height',
  rx: 'Radius X',
  ry: 'Radius Y',
  fontSize: 'Font size',
}

type TimelineRow =
  | { kind: 'layer'; layer: Layer }
  | { kind: 'property'; layer: Layer; property: AnimatableProperty; label: string }

type DragMode = 'playhead' | 'loop-in' | 'loop-out' | 'keyframe' | null

type DragState = {
  mode: DragMode
  keyframeId?: string
  keyframeIds?: string[]
  frameSnap: boolean
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3]

export function Timeline() {
  const project = useEditorStore((state) => state.project)
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId)
  const duration = project.duration
  const fps = project.fps
  const loopIn = project.loopIn
  const loopOut = project.loopOut
  const states = project.states
  const markers = project.markers
  const layers = project.layers
  const currentTime = useEditorStore((state) => state.currentTime)
  const snapEnabled = useEditorStore((state) => state.snapEnabled)
  const selectedKeyframeIds = useEditorStore((state) => state.selectedKeyframeIds)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const timelineSnapTime = useEditorStore((state) => state.timelineSnapTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const moveKeyframesAtAnchor = useEditorStore((state) => state.moveKeyframesAtAnchor)
  const beginHistoryTransaction = useEditorStore((state) => state.beginHistoryTransaction)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const selectKeyframe = useEditorStore((state) => state.selectKeyframe)
  const clearKeyframeSelection = useEditorStore((state) => state.clearKeyframeSelection)
  const setTimelineSnapTime = useEditorStore((state) => state.setTimelineSnapTime)
  const addAnimationStateAtCurrentTime = useEditorStore((state) => state.addAnimationStateAtCurrentTime)
  const removeAnimationState = useEditorStore((state) => state.removeAnimationState)
  const smartAnimateAll = useEditorStore((state) => state.smartAnimateAll)
  const addMarkerAtCurrentTime = useEditorStore((state) => state.addMarkerAtCurrentTime)
  const removeMarker = useEditorStore((state) => state.removeMarker)
  const setLoopRegion = useEditorStore((state) => state.setLoopRegion)
  const copyKeyframesAtCurrentTime = useEditorStore((state) => state.copyKeyframesAtCurrentTime)
  const pasteKeyframesAtCurrentTime = useEditorStore((state) => state.pasteKeyframesAtCurrentTime)
  const keyframeClipboard = useEditorStore((state) => state.keyframeClipboard)

  const artboardLayers = useMemo(
    () =>
      [...getArtboardLayers(project, activeArtboardId ?? project.artboards[0]?.id ?? '')].reverse(),
    [activeArtboardId, project],
  )

  const selectedLayer = artboardLayers.find((layer) => layer.id === selectedLayerId) ?? null

  const [timelineZoom, setTimelineZoom] = useState(1)
  const [expandedLayerIds, setExpandedLayerIds] = useState<string[]>([])
  const labelsScrollRef = useRef<HTMLDivElement>(null)
  const tracksScrollRef = useRef<HTMLDivElement>(null)
  const tracksViewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>({ mode: null, frameSnap: true })
  const [viewportWidth, setViewportWidth] = useState(0)

  const orderedStates = [...states].sort((left, right) => left.time - right.time)
  const orderedMarkers = [...markers].sort((left, right) => left.time - right.time)

  const contentWidth = getTimelineContentWidth(
    duration,
    viewportWidth,
    TIMELINE_PX_PER_SECOND,
    timelineZoom,
  )

  const rows = useMemo(() => {
    const result: TimelineRow[] = []

    for (const layer of artboardLayers) {
      result.push({ kind: 'layer', layer })

      if (!expandedLayerIds.includes(layer.id)) {
        continue
      }

      for (const property of ANIMATABLE_PROPERTIES) {
        const keyframes = layer.keyframes.filter((keyframe) => keyframe.property === property)
        if (keyframes.length === 0) {
          continue
        }

        result.push({
          kind: 'property',
          layer,
          property,
          label: propertyLabels[property],
        })
      }
    }

    return result
  }, [artboardLayers, expandedLayerIds])

  useEffect(() => {
    if (!selectedLayerId) {
      return
    }

    setExpandedLayerIds((current) =>
      current.includes(selectedLayerId) ? current : [...current, selectedLayerId],
    )
  }, [selectedLayerId])

  useEffect(() => {
    const node = tracksViewportRef.current
    if (!node) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setViewportWidth(width)
    })

    observer.observe(node)
    setViewportWidth(node.clientWidth)

    return () => observer.disconnect()
  }, [])

  const resolveTime = useCallback(
    (clientX: number, frameSnap: boolean, excludeKeyframeIds: string[] = []) => {
      const track = tracksScrollRef.current
      if (!track || duration === 0) {
        return 0
      }

      const rect = track.getBoundingClientRect()
      const raw = timeFromClientX(clientX, rect, duration, {
        scrollLeft: track.scrollLeft,
        contentWidth,
      })
      const snapped = snapTimelineTime(raw, {
        duration,
        fps,
        snapEnabled,
        frameSnap,
        markers: orderedMarkers,
        states: orderedStates,
        keyframeTimes: collectKeyframeTimes(layers, excludeKeyframeIds),
        playheadTime: currentTime,
      })

      if (snapEnabled && frameSnap && Math.abs(snapped - raw) > 0.0001) {
        setTimelineSnapTime(snapped)
      } else {
        setTimelineSnapTime(null)
      }

      return snapped
    },
    [
      contentWidth,
      currentTime,
      duration,
      fps,
      layers,
      orderedMarkers,
      orderedStates,
      setTimelineSnapTime,
      snapEnabled,
    ],
  )

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag.mode) {
        return
      }

      const time = resolveTime(
        event.clientX,
        drag.frameSnap,
        drag.mode === 'keyframe' ? drag.keyframeIds ?? [] : [],
      )

      if (drag.mode === 'playhead') {
        setCurrentTime(time)
        return
      }

      if (drag.mode === 'loop-in') {
        setLoopRegion(time, loopOut, { skipHistory: true })
        return
      }

      if (drag.mode === 'loop-out') {
        setLoopRegion(loopIn, time, { skipHistory: true })
        return
      }

      if (drag.mode === 'keyframe' && drag.keyframeId && drag.keyframeIds) {
        moveKeyframesAtAnchor(drag.keyframeId, time, drag.keyframeIds, { skipHistory: true })
      }
    }

    const onPointerUp = () => {
      if (!dragRef.current.mode) {
        return
      }

      dragRef.current = { mode: null, frameSnap: true }
      setTimelineSnapTime(null)
      saveProjectToStorage(useEditorStore.getState().project)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [
    loopIn,
    loopOut,
    moveKeyframesAtAnchor,
    resolveTime,
    setCurrentTime,
    setLoopRegion,
    setTimelineSnapTime,
  ])

  const syncLabelsScroll = (scrollTop: number) => {
    if (labelsScrollRef.current && labelsScrollRef.current.scrollTop !== scrollTop) {
      labelsScrollRef.current.scrollTop = scrollTop
    }
  }

  const startTrackDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = getTimelineHandleTarget(event.target)
    if (handle === 'keyframe') {
      return
    }

    if (handle === 'loop-in' || handle === 'loop-out') {
      event.preventDefault()
      beginHistoryTransaction()
      dragRef.current = {
        mode: handle,
        frameSnap: !event.shiftKey,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      resolveTime(event.clientX, !event.shiftKey)
      return
    }

    event.preventDefault()
    beginHistoryTransaction()
    dragRef.current = {
      mode: 'playhead',
      frameSnap: !event.shiftKey,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setCurrentTime(resolveTime(event.clientX, !event.shiftKey))
  }

  const onKeyframePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    keyframe: Keyframe,
    layerId: string,
  ) => {
    event.stopPropagation()
    beginHistoryTransaction()

    if (selectedLayerId !== layerId) {
      selectLayer(layerId)
    }

    let nextSelection = selectedKeyframeIds
    if (event.shiftKey) {
      selectKeyframe(keyframe.id, { additive: true })
      nextSelection = useEditorStore.getState().selectedKeyframeIds
    } else if (!selectedKeyframeIds.includes(keyframe.id)) {
      selectKeyframe(keyframe.id)
      nextSelection = [keyframe.id]
    }

    dragRef.current = {
      mode: 'keyframe',
      keyframeId: keyframe.id,
      keyframeIds: nextSelection,
      frameSnap: !event.shiftKey,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const toggleLayerExpanded = (layerId: string) => {
    setExpandedLayerIds((current) =>
      current.includes(layerId)
        ? current.filter((id) => id !== layerId)
        : [...current, layerId],
    )
  }

  const stepZoom = (direction: -1 | 1) => {
    const index = ZOOM_STEPS.findIndex((step) => step >= timelineZoom - 0.001)
    const currentIndex = index === -1 ? ZOOM_STEPS.length - 1 : index
    const nextIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, currentIndex + direction))
    setTimelineZoom(ZOOM_STEPS[nextIndex] ?? 1)
  }

  const headerBandHeight =
    (orderedMarkers.length > 0 ? 20 : 0) + (orderedStates.length > 0 ? 24 : 0)

  return (
    <footer className="flex h-60 shrink-0 flex-col overflow-hidden border-t border-border bg-card">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Timeline
          </span>
          <Button variant="outline" size="sm" onClick={addAnimationStateAtCurrentTime}>
            <Flag />
            Add state
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={orderedStates.length < 2}
            onClick={smartAnimateAll}
          >
            <Sparkles />
            Smart animate
          </Button>
          <Button variant="outline" size="sm" onClick={addMarkerAtCurrentTime}>
            <Bookmark />
            Add marker
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedLayer}
            onClick={() => copyKeyframesAtCurrentTime()}
          >
            <Copy />
            Copy keys
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedLayer || keyframeClipboard.length === 0}
            onClick={() => pasteKeyframesAtCurrentTime()}
          >
            <ClipboardPaste />
            Paste keys
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out timeline"
              disabled={timelineZoom <= ZOOM_STEPS[0]!}
              onClick={() => stepZoom(-1)}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-10 text-center text-[10px] tabular-nums text-muted-foreground">
              {Math.round(timelineZoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in timeline"
              disabled={timelineZoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]!}
              onClick={() => stepZoom(1)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatTimelineTime(currentTime, fps)} / {formatTimelineTime(duration, fps)} · loop{' '}
            {formatTimelineTime(loopIn, fps)}–{formatTimelineTime(loopOut, fps)}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden px-3 py-2">
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-background/60">
          <div
            className="flex shrink-0 flex-col border-r border-border/70 bg-card/90"
            style={{ width: TIMELINE_LABEL_WIDTH }}
          >
            <div className="h-8 shrink-0 border-b border-border/70 bg-muted/30 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span className="flex h-full items-center">Layers</span>
            </div>
            {headerBandHeight > 0 ? (
              <div className="shrink-0 border-b border-border/50 bg-muted/10" style={{ height: headerBandHeight }} />
            ) : null}
            <div
              ref={labelsScrollRef}
              className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
              onScroll={(event) => {
                if (tracksScrollRef.current) {
                  tracksScrollRef.current.scrollTop = event.currentTarget.scrollTop
                }
              }}
            >
              {artboardLayers.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No layers on this artboard.
                </div>
              ) : (
                rows.map((row) =>
                  row.kind === 'layer' ? (
                    <TimelineLayerLabel
                      key={`label-${row.layer.id}`}
                      layer={row.layer}
                      isSelected={selectedLayerId === row.layer.id}
                      isExpanded={expandedLayerIds.includes(row.layer.id)}
                      onSelect={(layerId, additive) => selectLayer(layerId, { additive })}
                      onToggleExpand={() => toggleLayerExpanded(row.layer.id)}
                    />
                  ) : (
                    <TimelinePropertyLabel
                      key={`label-${row.layer.id}-${row.property}`}
                      label={row.label}
                    />
                  ),
                )
              )}
            </div>
          </div>

          <div ref={tracksViewportRef} className="relative min-h-0 min-w-0 flex-1">
            <div
              ref={tracksScrollRef}
              className="absolute inset-0 overflow-auto overscroll-contain"
              onScroll={(event) => syncLabelsScroll(event.currentTarget.scrollTop)}
              onPointerDown={(event) => {
                const handle = getTimelineHandleTarget(event.target)
                if (handle !== 'keyframe') {
                  clearKeyframeSelection()
                }
              }}
            >
              <div className="relative" style={{ width: contentWidth, minHeight: '100%' }}>
                <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm">
                  <TimelineRuler
                    duration={duration}
                    contentWidth={contentWidth}
                    fps={fps}
                    currentTime={currentTime}
                    loopIn={loopIn}
                    loopOut={loopOut}
                    onPointerDown={startTrackDrag}
                  />

                  {orderedMarkers.length > 0 ? (
                    <div className="relative h-5 border-b border-border/50 bg-muted/10">
                      {orderedMarkers.map((marker) => (
                        <button
                          key={marker.id}
                          type="button"
                          className="absolute top-0.5 -translate-x-1/2 rounded px-1 text-[10px] font-medium hover:bg-muted/60"
                          style={{
                            left: timeToPixel(marker.time, duration, contentWidth),
                            color: marker.color ?? UI_STROKE,
                          }}
                          title={`${marker.name} @ ${formatTimelineTime(marker.time, fps)}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            setCurrentTime(marker.time)
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            removeMarker(marker.id)
                          }}
                        >
                          ◆ {marker.name}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {orderedStates.length > 0 ? (
                    <div className="relative h-6 border-b border-border/50 bg-muted/20">
                      {orderedStates.map((state) => (
                        <button
                          key={state.id}
                          type="button"
                          className="absolute top-1 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                          style={{ left: timeToPixel(state.time, duration, contentWidth) }}
                          title={`${state.name} @ ${formatTimelineTime(state.time, fps)}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            setCurrentTime(state.time)
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            removeAnimationState(state.id)
                          }}
                        >
                          {state.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div
                  className="pointer-events-none absolute z-0 rounded-sm bg-primary/10"
                  style={{
                    top: 32 + headerBandHeight,
                    bottom: 0,
                    left: timeToPixel(loopIn, duration, contentWidth),
                    width:
                      timeToPixel(loopOut, duration, contentWidth) -
                      timeToPixel(loopIn, duration, contentWidth),
                  }}
                />

                {timelineSnapTime !== null ? (
                  <div
                    className="pointer-events-none absolute z-30 w-px bg-sky-500/80"
                    style={{
                      top: 32 + headerBandHeight,
                      bottom: 0,
                      left: timeToPixel(timelineSnapTime, duration, contentWidth),
                    }}
                  />
                ) : null}

                <div
                  className="pointer-events-none absolute z-10 w-px bg-primary"
                  style={{
                    top: 32 + headerBandHeight,
                    bottom: 0,
                    left: timeToPixel(currentTime, duration, contentWidth),
                  }}
                />

                <div style={{ paddingTop: headerBandHeight }} onPointerDown={startTrackDrag}>
                  {artboardLayers.length === 0 ? (
                    <div className="flex h-32 items-center justify-center px-3 text-center text-sm text-muted-foreground">
                      {orderedStates.length < 2 ? (
                        <div className="space-y-1">
                          <p>Add states at different times to capture layout changes.</p>
                          <p className="text-xs">
                            1. Scrub the playhead · 2. Add state · 3. Adjust layers · 4. Smart animate
                          </p>
                        </div>
                      ) : (
                        'Add layers to this artboard to animate them.'
                      )}
                    </div>
                  ) : (
                    rows.map((row) =>
                      row.kind === 'layer' ? (
                        <TimelineLayerTrack
                          key={`track-${row.layer.id}`}
                          layer={row.layer}
                          duration={duration}
                          contentWidth={contentWidth}
                          selectedKeyframeIds={selectedKeyframeIds}
                          onKeyframePointerDown={(event, keyframe) =>
                            onKeyframePointerDown(event, keyframe, row.layer.id)
                          }
                        />
                      ) : (
                        <TimelinePropertyTrack
                          key={`track-${row.layer.id}-${row.property}`}
                          property={row.property}
                          keyframes={row.layer.keyframes.filter(
                            (keyframe) => keyframe.property === row.property,
                          )}
                          duration={duration}
                          contentWidth={contentWidth}
                          selectedKeyframeIds={selectedKeyframeIds}
                          onKeyframePointerDown={(event, keyframe) =>
                            onKeyframePointerDown(event, keyframe, row.layer.id)
                          }
                        />
                      ),
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
