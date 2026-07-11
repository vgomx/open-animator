import type { AnimatableProperty, Keyframe } from '@/editor/types'
import { timeToPercent } from '@/editor/timeline-utils'
import { cn } from '@/lib/utils'

type TimelinePropertyTrackProps = {
  property: AnimatableProperty
  label: string
  keyframes: Keyframe[]
  duration: number
  selectedKeyframeIds: string[]
  onKeyframePointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    keyframe: Keyframe,
  ) => void
}

export function TimelinePropertyTrack({
  property,
  label,
  keyframes,
  duration,
  selectedKeyframeIds,
  onKeyframePointerDown,
}: TimelinePropertyTrackProps) {
  const ordered = [...keyframes].sort((left, right) => left.time - right.time)

  return (
    <div className="relative h-8 border-b border-border/40 last:border-b-0">
      <span className="absolute top-1/2 left-2 z-10 -translate-y-1/2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>

      {ordered.map((keyframe, index) => {
        const next = ordered[index + 1]
        if (!next) {
          return null
        }

        const left = timeToPercent(keyframe.time, duration)
        const width = timeToPercent(next.time, duration) - left

        return (
          <div
            key={`${keyframe.id}-${next.id}`}
            className="pointer-events-none absolute top-1/2 z-0 h-1.5 -translate-y-1/2 rounded-full bg-primary/20"
            style={{ left: `${left}%`, width: `${Math.max(width, 0)}%` }}
            title={`${keyframe.property} segment`}
          />
        )
      })}

      {ordered.map((keyframe) => {
        const selected = selectedKeyframeIds.includes(keyframe.id)
        const isColor = property === 'fill' || property === 'stroke'

        return (
          <button
            key={keyframe.id}
            type="button"
            data-handle="keyframe"
            data-keyframe-id={keyframe.id}
            className={cn(
              'absolute top-1/2 z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-background shadow-sm active:cursor-grabbing',
              selected
                ? 'bg-primary ring-2 ring-primary/40'
                : 'bg-primary/90 ring-1 ring-primary/25 hover:ring-2 hover:ring-primary/40',
              isColor && 'ring-offset-1 ring-offset-background',
            )}
            style={{
              left: `${timeToPercent(keyframe.time, duration)}%`,
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
