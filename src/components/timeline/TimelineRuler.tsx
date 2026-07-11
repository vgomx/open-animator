import { useMemo } from 'react'

import {
  formatTimelineTime,
  getRulerTicks,
  timeToPixel,
} from '@/editor/timeline-utils'
import { cn } from '@/lib/utils'

type TimelineRulerProps = {
  duration: number
  contentWidth: number
  fps: number
  currentTime: number
  loopIn: number
  loopOut: number
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}

export function TimelineRuler({
  duration,
  contentWidth,
  fps,
  currentTime,
  loopIn,
  loopOut,
  onPointerDown,
}: TimelineRulerProps) {
  const ticks = useMemo(() => getRulerTicks(duration), [duration])
  const playheadLeft = timeToPixel(currentTime, duration, contentWidth)
  const loopLeft = timeToPixel(loopIn, duration, contentWidth)
  const loopWidth = timeToPixel(loopOut, duration, contentWidth) - loopLeft

  return (
    <div
      className="relative h-8 shrink-0 cursor-pointer border-b border-border/70 bg-muted/30 select-none"
      style={{ width: contentWidth }}
      onPointerDown={onPointerDown}
    >
      {ticks.map((tick) => (
        <div
          key={tick}
          className="pointer-events-none absolute top-0 flex h-full flex-col justify-end"
          style={{ left: timeToPixel(tick, duration, contentWidth) }}
        >
          <span className="mb-0.5 -translate-x-1/2 px-1 text-[9px] tabular-nums text-muted-foreground">
            {tick.toFixed(tick < 1 ? 2 : 1)}s
          </span>
          <div className="h-2 w-px bg-border/80" />
        </div>
      ))}

      <div
        className="pointer-events-none absolute inset-y-1 rounded-sm bg-primary/10"
        style={{ left: loopLeft, width: loopWidth }}
      />

      <div
        className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary"
        style={{ left: playheadLeft }}
      >
        <div className="absolute -top-px left-1/2 z-30 size-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-primary" />
      </div>

      <div
        className="pointer-events-none absolute top-7 z-30 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm"
        style={{ left: playheadLeft }}
      >
        {formatTimelineTime(currentTime, fps)}
      </div>

      <LoopHandle
        side="in"
        left={loopLeft}
        label={formatTimelineTime(loopIn, fps)}
        data-handle="loop-in"
      />
      <LoopHandle
        side="out"
        left={timeToPixel(loopOut, duration, contentWidth)}
        label={formatTimelineTime(loopOut, fps)}
        data-handle="loop-out"
      />
    </div>
  )
}

function LoopHandle({
  side,
  left,
  label,
}: {
  side: 'in' | 'out'
  left: number
  label: string
  'data-handle'?: string
}) {
  return (
    <div
      className="pointer-events-auto absolute top-0 bottom-0 z-20"
      style={{ left }}
      data-handle={`loop-${side}`}
    >
      <div
        className={cn(
          'absolute top-1/2 z-30 h-5 w-2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-primary/50 bg-primary/80 shadow-sm',
          side === 'in' ? '-translate-x-0.5' : '-translate-x-1.5',
        )}
        data-handle={`loop-${side}`}
        title={side === 'in' ? 'Loop in' : 'Loop out'}
      />
      <span
        className={cn(
          'pointer-events-none absolute top-6 whitespace-nowrap text-[9px] font-medium text-primary',
          side === 'in' ? 'left-0' : '-translate-x-full',
        )}
      >
        {label}
      </span>
    </div>
  )
}

export function getTimelineHandleTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null
  }

  const keyframe = target.closest('[data-handle="keyframe"]')
  if (keyframe) {
    return 'keyframe'
  }

  const handle = target.closest('[data-handle]')
  return handle?.getAttribute('data-handle') ?? null
}
