import { useEffect, useRef } from 'react'

import { Slider } from '@/components/ui/slider'
import type { AnimatableProperty } from '@/editor/types'
import { ANIMATABLE_PROPERTIES } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'
import { saveProjectToStorage } from '@/io/project'

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
}

export function Timeline() {
  const duration = useEditorStore((state) => state.project.duration)
  const currentTime = useEditorStore((state) => state.currentTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const moveKeyframe = useEditorStore((state) => state.moveKeyframe)
  const beginHistoryTransaction = useEditorStore((state) => state.beginHistoryTransaction)
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

  return (
    <footer className="flex h-52 shrink-0 flex-col overflow-hidden border-t border-border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Timeline
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
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
              className="pointer-events-none absolute inset-y-0 z-10 w-px bg-sky-400"
              style={{
                left: `${(currentTime / duration) * 100}%`,
              }}
            />

            {!selectedLayer ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Select a layer to view keyframes.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {keyframesByProperty.map(({ property, keyframes }) => (
                  <div key={property} className="relative h-7">
                    <span className="absolute top-1/2 left-2 z-10 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {propertyLabels[property]}
                    </span>
                    {keyframes.map((keyframe) => (
                      <button
                        key={keyframe.id}
                        type="button"
                        className={cn(
                          'absolute top-1/2 z-20 size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-sky-400 ring-2 ring-sky-400/20 active:cursor-grabbing',
                          property === 'fill' || property === 'stroke'
                            ? 'ring-offset-1 ring-offset-background'
                            : '',
                        )}
                        style={{
                          left: `${(keyframe.time / duration) * 100}%`,
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
