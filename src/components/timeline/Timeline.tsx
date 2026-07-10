import { useRef } from 'react'

import { Slider } from '@/components/ui/slider'
import type { AnimatableProperty } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

function formatTime(seconds: number): string {
  return `${seconds.toFixed(2)}s`
}

const propertyLabels: Record<AnimatableProperty, string> = {
  x: 'X',
  y: 'Y',
  opacity: 'Opacity',
  scale: 'Scale',
}

export function Timeline() {
  const duration = useEditorStore((state) => state.project.duration)
  const currentTime = useEditorStore((state) => state.currentTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const selectedLayer = useEditorStore((state) =>
    state.project.layers.find((layer) => layer.id === state.selectedLayerId),
  )
  const trackRef = useRef<HTMLDivElement>(null)

  const scrubToClientX = (clientX: number) => {
    const track = trackRef.current
    if (!track || duration === 0) {
      return
    }

    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setCurrentTime(ratio * duration)
  }

  const keyframesByProperty = selectedLayer
    ? (['x', 'y', 'opacity', 'scale'] as AnimatableProperty[]).map((property) => ({
        property,
        keyframes: selectedLayer.keyframes.filter((keyframe) => keyframe.property === property),
      }))
    : []

  return (
    <footer className="flex h-44 shrink-0 flex-col border-t border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Timeline
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        <Slider
          min={0}
          max={duration}
          step={0.01}
          value={[currentTime]}
          onValueChange={(value) => setCurrentTime(value[0] ?? 0)}
        />

        <div
          ref={trackRef}
          className="relative cursor-pointer rounded-md border border-border bg-background/60"
          onPointerDown={(event) => {
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
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
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
                    <div
                      key={keyframe.id}
                      className={cn(
                        'absolute top-1/2 z-20 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400 ring-2 ring-sky-400/20',
                      )}
                      style={{
                        left: `${(keyframe.time / duration) * 100}%`,
                      }}
                      title={`${keyframe.property} @ ${formatTime(keyframe.time)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
