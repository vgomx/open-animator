import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  TimelineGroupLabel,
  TimelineLayerLabel,
  TimelinePropertyLabel,
} from '@/components/timeline/TimelineLayerLabel'
import { TimelineLayerTrack } from '@/components/timeline/TimelineLayerTrack'
import { TimelinePropertyTrack } from '@/components/timeline/TimelinePropertyTrack'
import { getTimelineHandleTarget, TimelineRuler } from '@/components/timeline/TimelineRuler'
import { Button } from '@/components/ui/button'
import { getArtboardLayers } from '@/editor/artboard-utils'
import { layerHasAnimation } from '@/editor/layer-animation'
import { getGroupDisplayName } from '@/editor/layer-display'
import type { Keyframe } from '@/editor/types'
import {
  buildTimelineRows,
  getAnimatedGroupIds,
  getGroupLayers,
} from '@/editor/timeline-rows'
import {
  TIMELINE_LABEL_WIDTH,
  TIMELINE_PX_PER_SECOND,
  TIMELINE_ROW_HEIGHT,
} from '@/editor/layout-constants'
import {
  collectKeyframeTimes,
  formatTimelineTime,
  getTimelineContentWidth,
  getTimelineTimeLabelWidthCh,
  snapTimelineTime,
  timeFromClientX,
  timeToPixel,
} from '@/editor/timeline-utils'
import { useEditorStore } from '@/editor/store'
import { UI_STROKE } from '@/lib/brand-colors'
import { cn } from '@/lib/utils'
import { saveProjectToStorage } from '@/io/project'
import { Bookmark, ClipboardPaste, Copy, Flag, Minus, Plus, Sparkles } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type DragMode = 'playhead' | 'loop-in' | 'loop-out' | 'keyframe' | null

type DragState = {
  mode: DragMode
  keyframeId?: string
  keyframeIds?: string[]
  frameSnap: boolean
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3]
const TIMELINE_VIRTUALIZE_THRESHOLD = 40
const TIMELINE_ROW_BUFFER = 8

function TimelinePlayhead({
  duration,
  contentWidth,
  headerBandHeight,
  isDragging,
}: {
  duration: number
  contentWidth: number
  headerBandHeight: number
  isDragging?: boolean
}) {
  const playheadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updatePlayhead = (currentTime: number) => {
      if (!playheadRef.current) {
        return
      }

      playheadRef.current.style.left = `${timeToPixel(currentTime, duration, contentWidth)}px`
    }

    updatePlayhead(useEditorStore.getState().currentTime)

    return useEditorStore.subscribe((state, previousState) => {
      if (state.currentTime === previousState.currentTime) {
        return
      }

      updatePlayhead(state.currentTime)
    })
  }, [contentWidth, duration])

  return (
    <div
      ref={playheadRef}
      className={cn(
        'pointer-events-none absolute -translate-x-1/2 bg-primary transition-all duration-150 ease-out',
        isDragging
          ? 'z-30 w-[2px] shadow-[0_0_16px_3px_color-mix(in_srgb,var(--primary)_50%,transparent)]'
          : 'z-10 w-px',
      )}
      style={{
        top: 32 + headerBandHeight,
        bottom: 0,
      }}
    />
  )
}

function TimelineClock({
  fps,
  duration,
  loopIn,
  loopOut,
}: {
  fps: number
  duration: number
  loopIn: number
  loopOut: number
}) {
  const currentTimeRef = useRef<HTMLSpanElement>(null)
  const timeLabelWidthCh = getTimelineTimeLabelWidthCh(duration, fps)

  const renderTimeText = (seconds: number) => {
    return `${seconds.toFixed(2)}s · f${Math.round(seconds * fps)}`
  }

  useEffect(() => {
    const updateCurrentTime = (currentTime: number) => {
      if (currentTimeRef.current) {
        currentTimeRef.current.textContent = renderTimeText(currentTime)
      }
    }

    updateCurrentTime(useEditorStore.getState().currentTime)

    return useEditorStore.subscribe((state, previousState) => {
      if (state.currentTime === previousState.currentTime) {
        return
      }

      updateCurrentTime(state.currentTime)
    })
  }, [fps])

  const timeLabel = (seconds: number, emphasize = false, current = false) => (
    <span
      className={cn(
        'inline-flex items-baseline justify-end gap-1 tabular-nums',
        emphasize ? 'font-medium text-foreground/90' : 'text-muted-foreground',
      )}
      style={emphasize ? { minWidth: `${timeLabelWidthCh}ch` } : undefined}
    >
      <span ref={current ? currentTimeRef : undefined}>{renderTimeText(seconds)}</span>
    </span>
  )

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums">
      {timeLabel(useEditorStore.getState().currentTime, true, true)}
      <span className="text-muted-foreground/40" aria-hidden>
        /
      </span>
      {timeLabel(duration)}
      <span className="text-muted-foreground/40" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground/70">loop</span>
      <span className="inline-flex items-baseline gap-1">
        <span className="inline-flex items-baseline justify-end gap-1 tabular-nums text-muted-foreground">
          <span>{renderTimeText(loopIn)}</span>
        </span>
        <span className="text-muted-foreground/40" aria-hidden>
          –
        </span>
        <span className="inline-flex items-baseline justify-end gap-1 tabular-nums text-muted-foreground">
          <span>{renderTimeText(loopOut)}</span>
        </span>
      </span>
    </span>
  )
}

export function Timeline({ className }: { className?: string }) {
  const project = useEditorStore((state) => state.project)
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId)
  const duration = project.duration
  const fps = project.fps
  const loopIn = project.loopIn
  const loopOut = project.loopOut
  const states = project.states
  const markers = project.markers
  const layers = project.layers
  const layerGroups = project.layerGroups
  const collapsedGroupIds = useEditorStore((state) => state.collapsedGroupIds)
  const selectedKeyframeIds = useEditorStore((state) => state.selectedKeyframeIds)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const selectedGroupId = useEditorStore((state) => state.selectedGroupId)
  const timelineSnapTime = useEditorStore((state) => state.timelineSnapTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const moveKeyframesAtAnchor = useEditorStore((state) => state.moveKeyframesAtAnchor)
  const beginHistoryTransaction = useEditorStore((state) => state.beginHistoryTransaction)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const selectGroup = useEditorStore((state) => state.selectGroup)
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
  const snapEnabled = useEditorStore((state) => state.snapEnabled)

  const artboardLayers = useMemo(
    () => getArtboardLayers(project, activeArtboardId ?? project.artboards[0]?.id ?? ''),
    [activeArtboardId, project],
  )

  const selectedLayer = artboardLayers.find((layer) => layer.id === selectedLayerId) ?? null

  const [timelineZoom, setTimelineZoom] = useState(1)
  const [expandedLayerIds, setExpandedLayerIds] = useState<string[]>([])
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([])
  const didAutoExpandAnimatedRef = useRef(false)
  const labelsScrollRef = useRef<HTMLDivElement>(null)
  const tracksScrollRef = useRef<HTMLDivElement>(null)
  const tracksViewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>({ mode: null, frameSnap: true })
  const [isPlayheadDragging, setIsPlayheadDragging] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [tracksScrollTop, setTracksScrollTop] = useState(0)
  const [tracksViewportHeight, setTracksViewportHeight] = useState(0)

  const orderedStates = [...states].sort((left, right) => left.time - right.time)
  const orderedMarkers = [...markers].sort((left, right) => left.time - right.time)

  const contentWidth = getTimelineContentWidth(
    duration,
    viewportWidth,
    TIMELINE_PX_PER_SECOND,
    timelineZoom,
  )

  const rows = useMemo(
    () =>
      buildTimelineRows({
        displayLayers: artboardLayers,
        layerGroups,
        collapsedGroupIds,
        expandedLayerIds,
        expandedGroupIds,
      }),
    [artboardLayers, collapsedGroupIds, expandedGroupIds, expandedLayerIds, layerGroups],
  )

  const shouldVirtualizeRows = rows.length > TIMELINE_VIRTUALIZE_THRESHOLD

  const visibleRowWindow = useMemo(() => {
    if (!shouldVirtualizeRows) {
      return {
        start: 0,
        end: rows.length,
        topSpacer: 0,
        bottomSpacer: 0,
      }
    }

    const start = Math.max(
      0,
      Math.floor(tracksScrollTop / TIMELINE_ROW_HEIGHT) - TIMELINE_ROW_BUFFER,
    )
    const visibleCount =
      Math.ceil(tracksViewportHeight / TIMELINE_ROW_HEIGHT) + TIMELINE_ROW_BUFFER * 2
    const end = Math.min(rows.length, start + visibleCount)

    return {
      start,
      end,
      topSpacer: start * TIMELINE_ROW_HEIGHT,
      bottomSpacer: Math.max(0, (rows.length - end) * TIMELINE_ROW_HEIGHT),
    }
  }, [rows.length, shouldVirtualizeRows, tracksScrollTop, tracksViewportHeight])

  const visibleRows = useMemo(
    () => rows.slice(visibleRowWindow.start, visibleRowWindow.end),
    [rows, visibleRowWindow.end, visibleRowWindow.start],
  )

  useEffect(() => {
    if (artboardLayers.length === 0) {
      didAutoExpandAnimatedRef.current = false
      return
    }

    if (didAutoExpandAnimatedRef.current) {
      return
    }

    const animatedLayerIds = artboardLayers
      .filter(layerHasAnimation)
      .map((layer) => layer.id)
    const animatedGroupIds = getAnimatedGroupIds(artboardLayers, layerGroups)

    if (animatedLayerIds.length === 0 && animatedGroupIds.length === 0) {
      return
    }

    const autoExpandLimit =
      artboardLayers.length > 120 ? 0 : artboardLayers.length > 60 ? 6 : 24

    if (autoExpandLimit === 0) {
      didAutoExpandAnimatedRef.current = true
      return
    }

    setExpandedLayerIds((current) => [
      ...new Set([...current, ...animatedLayerIds.slice(0, autoExpandLimit)]),
    ])
    setExpandedGroupIds((current) => [
      ...new Set([...current, ...animatedGroupIds.slice(0, autoExpandLimit)]),
    ])
    didAutoExpandAnimatedRef.current = true
  }, [artboardLayers, layerGroups])

  useEffect(() => {
    if (!selectedLayerId) {
      return
    }

    setExpandedLayerIds((current) =>
      current.includes(selectedLayerId) ? current : [...current, selectedLayerId],
    )
  }, [selectedLayerId])

  useEffect(() => {
    if (!selectedGroupId) {
      return
    }

    setExpandedGroupIds((current) =>
      current.includes(selectedGroupId) ? current : [...current, selectedGroupId],
    )
  }, [selectedGroupId])

  useEffect(() => {
    const node = tracksViewportRef.current
    if (!node) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const width = entry?.contentRect.width ?? 0
      const height = entry?.contentRect.height ?? 0
      setViewportWidth(width)
      setTracksViewportHeight(height)
    })

    observer.observe(node)
    setViewportWidth(node.clientWidth)
    setTracksViewportHeight(node.clientHeight)

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
      const playheadTime = useEditorStore.getState().currentTime
      const snapped = snapTimelineTime(raw, {
        duration,
        fps,
        snapEnabled,
        frameSnap,
        markers: orderedMarkers,
        states: orderedStates,
        keyframeTimes: collectKeyframeTimes(layers, excludeKeyframeIds, layerGroups),
        playheadTime,
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
      duration,
      fps,
      layers,
      layerGroups,
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
      setIsPlayheadDragging(false)
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
    setIsPlayheadDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
    setCurrentTime(resolveTime(event.clientX, !event.shiftKey))
  }

  const onKeyframePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    keyframe: Keyframe,
    target: { kind: 'layer'; layerId: string } | { kind: 'group'; groupId: string },
  ) => {
    event.stopPropagation()
    beginHistoryTransaction()

    if (target.kind === 'group') {
      if (selectedGroupId !== target.groupId) {
        selectGroup(target.groupId)
      }
    } else if (selectedLayerId !== target.layerId) {
      selectLayer(target.layerId)
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

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
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
    <footer
      className={cn(
        'flex h-60 shrink-0 flex-col overflow-hidden border-t border-border bg-card',
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Timeline
          </span>
          <Button variant="outline" size="sm" onClick={addAnimationStateAtCurrentTime}>
            <Flag />
            Add state
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                disabled={orderedStates.length < 2}
                onClick={smartAnimateAll}
              >
                <Sparkles />
                Smart animate
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              Generate keyframes between timeline states. Scrub, add states, adjust layers, then run
              Smart animate to interpolate motion.
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={addMarkerAtCurrentTime}>
                <Bookmark />
                Add marker
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Drop a named marker at the playhead. Click to jump; right-click to remove.
            </TooltipContent>
          </Tooltip>
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
          <TimelineClock fps={fps} duration={duration} loopIn={loopIn} loopOut={loopOut} />
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
                const scrollTop = event.currentTarget.scrollTop
                setTracksScrollTop(scrollTop)
                if (tracksScrollRef.current) {
                  tracksScrollRef.current.scrollTop = scrollTop
                }
              }}
            >
              {artboardLayers.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No layers on this artboard.
                </div>
              ) : (
                <>
                  {visibleRowWindow.topSpacer > 0 ? (
                    <div style={{ height: visibleRowWindow.topSpacer }} aria-hidden />
                  ) : null}
                  {visibleRows.map((row) => {
                    if (row.kind === 'group') {
                      const groupLayers = getGroupLayers(row.groupId, artboardLayers, layerGroups)
                      const groupKeyframes = layerGroups?.[row.groupId]?.keyframes ?? []
                      return (
                        <TimelineGroupLabel
                          key={`label-group-${row.groupId}`}
                          label={getGroupDisplayName(groupLayers, row.groupId, layerGroups)}
                          depth={row.depth}
                          isSelected={selectedGroupId === row.groupId}
                          isExpanded={expandedGroupIds.includes(row.groupId)}
                          hasKeyframes={groupKeyframes.length > 0}
                          onSelect={() => selectGroup(row.groupId)}
                          onToggleExpand={() => toggleGroupExpanded(row.groupId)}
                        />
                      )
                    }

                    if (row.kind === 'groupProperty') {
                      return (
                        <TimelinePropertyLabel
                          key={`label-group-${row.groupId}-${row.property}`}
                          label={row.label}
                          depth={row.depth}
                        />
                      )
                    }

                    if (row.kind === 'layer') {
                      return (
                        <TimelineLayerLabel
                          key={`label-${row.layer.id}`}
                          layer={row.layer}
                          depth={row.depth}
                          isSelected={selectedLayerId === row.layer.id}
                          isExpanded={expandedLayerIds.includes(row.layer.id)}
                          onSelect={(layerId, additive) => selectLayer(layerId, { additive })}
                          onToggleExpand={() => toggleLayerExpanded(row.layer.id)}
                        />
                      )
                    }

                    return (
                      <TimelinePropertyLabel
                        key={`label-${row.layer.id}-${row.property}`}
                        label={row.label}
                        depth={row.depth}
                      />
                    )
                  })}
                  {visibleRowWindow.bottomSpacer > 0 ? (
                    <div style={{ height: visibleRowWindow.bottomSpacer }} aria-hidden />
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div ref={tracksViewportRef} className="relative min-h-0 min-w-0 flex-1">
            <div
              ref={tracksScrollRef}
              className="absolute inset-0 overflow-auto overscroll-contain"
              onScroll={(event) => {
                const scrollTop = event.currentTarget.scrollTop
                syncLabelsScroll(scrollTop)
                setTracksScrollTop(scrollTop)
              }}
              onPointerDown={(event) => {
                const handle = getTimelineHandleTarget(event.target)
                if (handle !== 'keyframe') {
                  clearKeyframeSelection()
                }
              }}
            >
              <div className="relative" style={{ width: contentWidth, minHeight: '100%' }}>
                <div
                  className={cn(
                    'sticky top-0 z-30 bg-background/95 backdrop-blur-sm',
                    isPlayheadDragging && 'z-50 overflow-visible',
                  )}
                >
                  <TimelineRuler
                    duration={duration}
                    contentWidth={contentWidth}
                    fps={fps}
                    loopIn={loopIn}
                    loopOut={loopOut}
                    isPlayheadDragging={isPlayheadDragging}
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

                <TimelinePlayhead
                  duration={duration}
                  contentWidth={contentWidth}
                  headerBandHeight={headerBandHeight}
                  isDragging={isPlayheadDragging}
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
                    <>
                      {visibleRowWindow.topSpacer > 0 ? (
                        <div style={{ height: visibleRowWindow.topSpacer }} aria-hidden />
                      ) : null}
                      {visibleRows.map((row) => {
                        if (row.kind === 'group') {
                          const groupKeyframes = layerGroups?.[row.groupId]?.keyframes ?? []
                          return (
                            <TimelineLayerTrack
                              key={`track-group-${row.groupId}`}
                              keyframes={groupKeyframes}
                              duration={duration}
                              contentWidth={contentWidth}
                              selectedKeyframeIds={selectedKeyframeIds}
                              onKeyframePointerDown={(event, keyframe) =>
                                onKeyframePointerDown(event, keyframe, {
                                  kind: 'group',
                                  groupId: row.groupId,
                                })
                              }
                            />
                          )
                        }

                        if (row.kind === 'groupProperty') {
                          const groupKeyframes =
                            layerGroups?.[row.groupId]?.keyframes?.filter(
                              (keyframe) => keyframe.property === row.property,
                            ) ?? []
                          return (
                            <TimelinePropertyTrack
                              key={`track-group-${row.groupId}-${row.property}`}
                              property={row.property}
                              keyframes={groupKeyframes}
                              duration={duration}
                              contentWidth={contentWidth}
                              selectedKeyframeIds={selectedKeyframeIds}
                              onKeyframePointerDown={(event, keyframe) =>
                                onKeyframePointerDown(event, keyframe, {
                                  kind: 'group',
                                  groupId: row.groupId,
                                })
                              }
                            />
                          )
                        }

                        if (row.kind === 'layer') {
                          return (
                            <TimelineLayerTrack
                              key={`track-${row.layer.id}`}
                              keyframes={row.layer.keyframes}
                              duration={duration}
                              contentWidth={contentWidth}
                              selectedKeyframeIds={selectedKeyframeIds}
                              onKeyframePointerDown={(event, keyframe) =>
                                onKeyframePointerDown(event, keyframe, {
                                  kind: 'layer',
                                  layerId: row.layer.id,
                                })
                              }
                            />
                          )
                        }

                        return (
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
                              onKeyframePointerDown(event, keyframe, {
                                kind: 'layer',
                                layerId: row.layer.id,
                              })
                            }
                          />
                        )
                      })}
                      {visibleRowWindow.bottomSpacer > 0 ? (
                        <div style={{ height: visibleRowWindow.bottomSpacer }} aria-hidden />
                      ) : null}
                    </>
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
