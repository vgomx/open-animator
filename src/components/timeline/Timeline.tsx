import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { AnimatableProperty } from '@/editor/types'
import { ANIMATABLE_PROPERTIES } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'
import { UI_STROKE } from '@/lib/brand-colors'
import { saveProjectToStorage } from '@/io/project'
import { Bookmark, Flag, Sparkles } from 'lucide-react'

function formatTime(seconds: number): string {
  return `${seconds.toFixed(2)}s`
}

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

export function Timeline() {
  const duration = useEditorStore((state) => state.project.duration)
  const loopIn = useEditorStore((state) => state.project.loopIn)
  const loopOut = useEditorStore((state) => state.project.loopOut)
  const states = useEditorStore((state) => state.project.states)
  const markers = useEditorStore((state) => state.project.markers)
  const currentTime = useEditorStore((state) => state.currentTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const moveKeyframe = useEditorStore((state) => state.moveKeyframe)
  const beginHistoryTransaction = useEditorStore((state) => state.beginHistoryTransaction)
  const addAnimationStateAtCurrentTime = useEditorStore((state) => state.addAnimationStateAtCurrentTime)
  const removeAnimationState = useEditorStore((state) => state.removeAnimationState)
  const smartAnimateAll = useEditorStore((state) => state.smartAnimateAll)
  const addMarkerAtCurrentTime = useEditorStore((state) => state.addMarkerAtCurrentTime)
  const removeMarker = useEditorStore((state) => state.removeMarker)
  const setLoopRegion = useEditorStore((state) => state.setLoopRegion)
  const selectedLayer = useEditorStore((state) =>
    state.project.layers.find((layer) => layer.id === state.selectedLayerId),
  )
  const trackRef = useRef<HTMLDivElement>(null)
  const dragKeyframeRef = useRef<string | null>(null)

  const timeFromClientX = (clientX: number): number => {
    const track = trackRef.current
    if (!track || duration === 0) {
      return 0
    }

    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * duration
  }

  const scrubToClientX = (clientX: number) => {
    setCurrentTime(timeFromClientX(clientX))
  }

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const keyframeId = dragKeyframeRef.current
      if (!keyframeId) {
        return
      }

      moveKeyframe(keyframeId, timeFromClientX(event.clientX), { skipHistory: true })
    }

    const onPointerUp = () => {
      if (!dragKeyframeRef.current) {
        return
      }

      dragKeyframeRef.current = null
      saveProjectToStorage(useEditorStore.getState().project)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [duration, moveKeyframe])

  const keyframesByProperty = selectedLayer
    ? ANIMATABLE_PROPERTIES.map((property) => ({
        property,
        keyframes: selectedLayer.keyframes.filter((keyframe) => keyframe.property === property),
      }))
    : []

  const orderedStates = [...states].sort((left, right) => left.time - right.time)
  const orderedMarkers = [...markers].sort((left, right) => left.time - right.time)
  const loopLeft = duration === 0 ? 0 : (loopIn / duration) * 100
  const loopWidth = duration === 0 ? 100 : ((loopOut - loopIn) / duration) * 100

  return (
    <footer className="flex h-56 shrink-0 flex-col overflow-hidden border-t border-border bg-card">
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
          <Button variant="ghost" size="sm" onClick={() => setLoopRegion(currentTime, loopOut)}>
            Loop in
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setLoopRegion(loopIn, currentTime)}>
            Loop out
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)} · loop {formatTime(loopIn)}–
          {formatTime(loopOut)}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3">
        <Slider
          className="shrink-0"
          min={0}
          max={duration}
          step={0.01}
          value={[currentTime]}
          onValueChange={(value) => setCurrentTime(value[0] ?? 0)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            ref={trackRef}
            className="relative min-h-full cursor-pointer rounded-md border border-border bg-background/60"
            onPointerDown={(event) => {
              if (dragKeyframeRef.current) {
                return
              }

              scrubToClientX(event.clientX)
            }}
          >
            <div
              className="pointer-events-none absolute inset-y-0 z-0 rounded-md bg-primary/10"
              style={{ left: `${loopLeft}%`, width: `${loopWidth}%` }}
            />

            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary"
              style={{
                left: `${duration === 0 ? 0 : (currentTime / duration) * 100}%`,
              }}
            />

            {orderedMarkers.length > 0 ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-5 border-b border-border/50 bg-muted/10">
                {orderedMarkers.map((marker) => (
                  <button
                    key={marker.id}
                    type="button"
                    className="pointer-events-auto absolute top-0.5 -translate-x-1/2 rounded px-1 text-[10px] font-medium"
                    style={{
                      left: `${duration === 0 ? 0 : (marker.time / duration) * 100}%`,
                      color: marker.color ?? UI_STROKE,
                    }}
                    title={`${marker.name} @ ${formatTime(marker.time)}`}
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
                  'pointer-events-none absolute inset-x-0 z-20 h-6 border-b border-border/50 bg-muted/20',
                  orderedMarkers.length > 0 ? 'top-5' : 'top-0',
                )}
              >
                {orderedStates.map((state) => (
                  <button
                    key={state.id}
                    type="button"
                    className="pointer-events-auto absolute top-1 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted"
                    style={{
                      left: `${duration === 0 ? 0 : (state.time / duration) * 100}%`,
                    }}
                    title={`${state.name} @ ${formatTime(state.time)}`}
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
                  (orderedStates.length > 0 || orderedMarkers.length > 0) && 'pt-10',
                )}
              >
                {orderedStates.length < 2
                  ? 'Add states at different times, adjust layers, then run Smart animate.'
                  : 'Select a layer to view keyframes.'}
              </div>
            ) : (
              <div
                className={cn(
                  'divide-y divide-border/60',
                  orderedStates.length > 0 && orderedMarkers.length > 0
                    ? 'pt-11'
                    : orderedStates.length > 0 || orderedMarkers.length > 0
                      ? 'pt-6'
                      : '',
                )}
              >
                {keyframesByProperty.map(({ property, keyframes }) => {
                  if (keyframes.length === 0) {
                    return null
                  }

                  return (
                    <div key={property} className="relative h-7">
                      <span className="absolute top-1/2 left-2 z-10 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {propertyLabels[property]}
                      </span>
                      {keyframes.map((keyframe) => (
                        <button
                          key={keyframe.id}
                          type="button"
                          className={cn(
                            'absolute top-1/2 z-20 size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-primary ring-2 ring-primary/20 active:cursor-grabbing',
                            property === 'fill' || property === 'stroke'
                              ? 'ring-offset-1 ring-offset-background'
                              : '',
                          )}
                          style={{
                            left: `${duration === 0 ? 0 : (keyframe.time / duration) * 100}%`,
                            backgroundColor:
                              property === 'fill' || property === 'stroke'
                                ? String(keyframe.value)
                                : undefined,
                          }}
                          title={`${keyframe.property} @ ${formatTime(keyframe.time)}`}
                          onPointerDown={(event) => {
                            event.stopPropagation()
                            beginHistoryTransaction()
                            dragKeyframeRef.current = keyframe.id
                            event.currentTarget.setPointerCapture(event.pointerId)
                          }}
                        />
                      ))}
                    </div>
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
