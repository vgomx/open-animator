import { Slider } from '@/components/ui/slider'
import { useEditorStore } from '@/editor/store'

function formatTime(seconds: number): string {
  return `${seconds.toFixed(2)}s`
}

export function Timeline() {
  const duration = useEditorStore((state) => state.project.duration)
  const currentTime = useEditorStore((state) => state.currentTime)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const selectedLayer = useEditorStore((state) =>
    state.project.layers.find((layer) => layer.id === state.selectedLayerId),
  )

  return (
    <footer className="flex h-40 shrink-0 flex-col border-t border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Timeline
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="space-y-4 px-4 py-3">
        <Slider
          min={0}
          max={duration}
          step={0.01}
          value={[currentTime]}
          onValueChange={(value) => setCurrentTime(value[0] ?? 0)}
        />

        <div className="relative h-16 rounded-md border border-border bg-background/60">
          <div
            className="absolute inset-y-0 w-px bg-sky-400"
            style={{
              left: `${(currentTime / duration) * 100}%`,
            }}
          />
          {selectedLayer?.keyframes.map((keyframe) => (
            <div
              key={keyframe.id}
              className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400"
              style={{
                left: `${(keyframe.time / duration) * 100}%`,
              }}
              title={`${keyframe.property} @ ${formatTime(keyframe.time)}`}
            />
          ))}
          {!selectedLayer ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a layer to view keyframes.
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
