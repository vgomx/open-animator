import type { Keyframe, Layer } from '@/editor/types'
import { timeToPixel } from '@/editor/timeline-utils'
import { TIMELINE_ROW_HEIGHT } from '@/editor/layout-constants'
import { cn } from '@/lib/utils'

type TimelineLayerTrackProps = {
  layer: Layer
  duration: number
  contentWidth: number
  selectedKeyframeIds: string[]
  onKeyframePointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    keyframe: Keyframe,
  ) => void
}

export function TimelineLayerTrack({
  layer,
  duration,
  contentWidth,
  selectedKeyframeIds,
  onKeyframePointerDown,
}: TimelineLayerTrackProps) {
  const ordered = [...layer.keyframes].sort((left, right) => left.time - right.time)

  return (
    <div
      className="relative border-b border-border/40"
      style={{ height: TIMELINE_ROW_HEIGHT, width: contentWidth }}
    >
      {ordered.map((keyframe, index) => {
        const next = ordered[index + 1]
        if (!next) {
          return null
        }

        const left = timeToPixel(keyframe.time, duration, contentWidth)
        const width = timeToPixel(next.time, duration, contentWidth) - left

        return (
          <div
            key={`${keyframe.id}-${next.id}`}
            className="pointer-events-none absolute top-1/2 z-0 h-1 -translate-y-1/2 rounded-full bg-primary/15"
            style={{ left, width: Math.max(width, 0) }}
          />
        )
      })}

      {ordered.map((keyframe) => {
        const selected = selectedKeyframeIds.includes(keyframe.id)
        const isColor = keyframe.property === 'fill' || keyframe.property === 'stroke'

        return (
          <button
            key={keyframe.id}
            type="button"
            data-handle="keyframe"
            data-keyframe-id={keyframe.id}
            className={cn(
              'absolute top-1/2 z-20 size-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-background shadow-sm active:cursor-grabbing',
              selected
                ? 'bg-primary ring-2 ring-primary/40'
                : 'bg-primary/90 ring-1 ring-primary/25 hover:ring-2 hover:ring-primary/40',
            )}
            style={{
              left: timeToPixel(keyframe.time, duration, contentWidth),
              backgroundColor: isColor ? String(keyframe.value) : undefined,
            }}
            title={`${keyframe.property} @ ${keyframe.time.toFixed(2)}s`}
            onPointerDown={(event) => onKeyframePointerDown(event, keyframe)}
          />
        )
      })}
    </div>
  )
}
