import { useCallback, useEffect, useRef } from 'react'

import { TimelinePropertyTrack } from '@/components/timeline/TimelinePropertyTrack'
import { getTimelineHandleTarget, TimelineRuler } from '@/components/timeline/TimelineRuler'
import { Button } from '@/components/ui/button'
import type { AnimatableProperty, Keyframe } from '@/editor/types'
import { ANIMATABLE_PROPERTIES } from '@/editor/types'
import {
  collectKeyframeTimes,
  formatTimelineTime,
  snapTimelineTime,
  timeFromClientX,
  timeToPercent,
} from '@/editor/timeline-utils'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'
import { UI_STROKE } from '@/lib/brand-colors'
import { saveProjectToStorage } from '@/io/project'
import { Bookmark, ClipboardPaste, Copy, Flag, Sparkles } from 'lucide-react'

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

type DragMode = 'playhead' | 'loop-in' | 'loop-out' | 'keyframe' | null

type DragState = {
  mode: DragMode
  keyframeId?: string
  keyframeIds?: string[]
  frameSnap: boolean
}

export function Timeline() {
  const duration = useEditorStore((state) => state.project.duration)
  const fps = useEditorStore((state) => state.project.fps)
  const loopIn = useEditorStore((state) => state.project.loopIn)
  const loopOut = useEditorStore((state) => state.project.loopOut)
  const states = useEditorStore((state) => state.project.states)
  const markers = useEditorStore((state) => state.project.markers)
  const layers = useEditorStore((state) => state.project.layers)
  const currentTime = useEditorStore((state) => state.currentTime)
  const snapEnabled = useEditorStore((state) => state.snapEnabled)
  const selectedKeyframeIds = useEditorStore((state) => state.selectedKeyframeIds)
  const timelineSnapTime = useEditorStore((state) => state.timelineSnapTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const moveKeyframesAtAnchor = useEditorStore((state) => state.moveKeyframesAtAnchor)
  const beginHistoryTransaction = useEditorStore((state) => state.beginHistoryTransaction)
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
  const selectedLayer = useEditorStore((state) =>
    state.project.layers.find((layer) => layer.id === state.selectedLayerId),
  )

  const trackRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>({ mode: null, frameSnap: true })

  const orderedStates = [...states].sort((left, right) => left.time - right.time)
  const orderedMarkers = [...markers].sort((left, right) => left.time - right.time)

  const resolveTime = useCallback(
    (clientX: number, frameSnap: boolean, excludeKeyframeIds: string[] = []) => {
      const track = trackRef.current
      if (!track || duration === 0) {
        return 0
      }

      const raw = timeFromClientX(clientX, track.getBoundingClientRect(), duration)
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
  ) => {
    event.stopPropagation()
    beginHistoryTransaction()

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

  const keyframesByProperty = selectedLayer
    ? ANIMATABLE_PROPERTIES.map((property) => ({
        property,
        keyframes: selectedLayer.keyframes.filter((keyframe) => keyframe.property === property),
      }))
    : []

  const headerOffset =
    orderedStates.length > 0 && orderedMarkers.length > 0
      ? 'pt-11'
      : orderedStates.length > 0 || orderedMarkers.length > 0
        ? 'pt-6'
        : ''

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
        <span className="text-xs text-muted-foreground">
          {formatTimelineTime(currentTime, fps)} / {formatTimelineTime(duration, fps)} · loop{' '}
          {formatTimelineTime(loopIn, fps)}–{formatTimelineTime(loopOut, fps)}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
        <div
          ref={trackRef}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/60"
        >
          <TimelineRuler
            duration={duration}
            currentTime={currentTime}
            loopIn={loopIn}
            loopOut={loopOut}
            onPointerDown={startTrackDrag}
          />

          <div
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
            onPointerDown={startTrackDrag}
          >
            <div
              className="pointer-events-none absolute inset-y-0 z-0 rounded-sm bg-primary/10"
              style={{
                left: `${timeToPercent(loopIn, duration)}%`,
                width: `${timeToPercent(loopOut, duration) - timeToPercent(loopIn, duration)}%`,
              }}
            />
            {timelineSnapTime !== null ? (
              <div
                className="pointer-events-none absolute inset-y-0 z-30 w-px bg-sky-500/80"
                style={{ left: `${timeToPercent(timelineSnapTime, duration)}%` }}
              />
            ) : null}

            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary"
              style={{ left: `${timeToPercent(currentTime, duration)}%` }}
            />

            {orderedMarkers.length > 0 ? (
              <div className="pointer-events-none sticky top-0 z-20 h-5 border-b border-border/50 bg-muted/10">
                {orderedMarkers.map((marker) => (
                  <button
                    key={marker.id}
                    type="button"
                    className="pointer-events-auto absolute top-0.5 -translate-x-1/2 rounded px-1 text-[10px] font-medium hover:bg-muted/60"
                    style={{
                      left: `${timeToPercent(marker.time, duration)}%`,
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
              <div
                className={cn(
                  'pointer-events-none sticky z-20 h-6 border-b border-border/50 bg-muted/20',
                  orderedMarkers.length > 0 ? 'top-5' : 'top-0',
                )}
              >
                {orderedStates.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    className="pointer-events-auto absolute top-1 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                    style={{ left: `${timeToPercent(state.time, duration)}%` }}
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

            {!selectedLayer ? (
              <div
                className={cn(
                  'flex h-32 items-center justify-center px-3 text-center text-sm text-muted-foreground',
                  headerOffset,
                )}
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) {
                    clearKeyframeSelection()
                    startTrackDrag(event)
                  }
                }}
              >
                {orderedStates.length < 2 ? (
                  <div className="space-y-1">
                    <p>Add states at different times to capture layout changes.</p>
                    <p className="text-xs">
                      1. Scrub the playhead · 2. Add state · 3. Adjust layers · 4. Smart animate
                    </p>
                  </div>
                ) : (
                  'Select a layer to view and edit keyframes.'
                )}
              </div>
            ) : (
              <div
                className={cn('relative', headerOffset)}
                onPointerDown={(event) => {
                  const handle = getTimelineHandleTarget(event.target)
                  if (handle === 'keyframe') {
                    return
                  }

                  clearKeyframeSelection()
                }}
              >
                {keyframesByProperty.map(({ property, keyframes }) => {
                  if (keyframes.length === 0) {
                    return null
                  }

                  return (
                    <TimelinePropertyTrack
                      key={property}
                      property={property}
                      label={propertyLabels[property]}
                      keyframes={keyframes}
                      duration={duration}
                      selectedKeyframeIds={selectedKeyframeIds}
                      onKeyframePointerDown={onKeyframePointerDown}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
