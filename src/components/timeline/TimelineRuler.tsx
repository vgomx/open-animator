import { useEffect, useMemo, useRef } from 'react'

import {
  formatTimelineTime,
  getRulerTicks,
  timeToPixel,
} from '@/editor/timeline-utils'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

type TimelineRulerProps = {
  duration: number
  contentWidth: number
  fps: number
  loopIn: number
  loopOut: number
  isPlayheadDragging?: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}

function TimelineRulerPlayhead({
  duration,
  contentWidth,
  fps,
  isDragging,
}: {
  duration: number
  contentWidth: number
  fps: number
  isDragging?: boolean
}) {
  const headRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const sync = (currentTime: number) => {
      const left = timeToPixel(currentTime, duration, contentWidth)
      if (lineRef.current) {
        lineRef.current.style.left = `${left}px`
      }
      if (headRef.current) {
        headRef.current.style.left = `${left}px`
      }
      if (timeRef.current) {
        timeRef.current.textContent = formatTimelineTime(currentTime, fps)
      }
    }

    sync(useEditorStore.getState().currentTime)

    return useEditorStore.subscribe((state, previousState) => {
      if (state.currentTime === previousState.currentTime) {
        return
      }

      sync(state.currentTime)
    })
  }, [contentWidth, duration, fps])

  return (
    <>
      <div
        ref={lineRef}
        className={cn(
          'pointer-events-none absolute top-0 bottom-0 -translate-x-1/2 bg-primary transition-[width,box-shadow] duration-150 ease-out',
          isDragging
            ? 'z-50 w-[2px] shadow-[0_0_14px_3px_color-mix(in_srgb,var(--primary)_55%,transparent)]'
            : 'z-20 w-px',
        )}
        style={{ left: 0 }}
      />

      <div
        ref={headRef}
        className={cn(
          'pointer-events-none absolute top-0 z-50 flex -translate-x-1/2 flex-col items-center transition-[transform,filter] duration-150 ease-out',
          isDragging && 'scale-[1.14] -translate-y-1',
        )}
        style={{ left: 0 }}
      >
        <div
          className={cn(
            'flex h-[9px] w-[14px] items-end justify-center transition-[filter] duration-150',
            isDragging && '[filter:drop-shadow(0_5px_8px_rgba(0,0,0,0.45))]',
          )}
        >
          <div className="size-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-primary" />
        </div>

        <div
          className={cn(
            'mt-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground transition-[box-shadow] duration-150',
            isDragging
              ? 'shadow-[0_12px_28px_-8px_rgba(0,0,0,0.55),0_4px_12px_-2px_rgba(0,0,0,0.35)] ring-1 ring-white/25'
              : 'shadow-sm',
          )}
        >
          <span ref={timeRef} />
        </div>
      </div>
    </>
  )
}

export function TimelineRuler({
  duration,
  contentWidth,
  fps,
  loopIn,
  loopOut,
  isPlayheadDragging = false,
  onPointerDown,
}: TimelineRulerProps) {
  const ticks = useMemo(() => getRulerTicks(duration), [duration])
  const loopLeft = timeToPixel(loopIn, duration, contentWidth)
  const loopWidth = timeToPixel(loopOut, duration, contentWidth) - loopLeft

  return (
    <div
      className={cn(
        'relative h-8 shrink-0 cursor-pointer border-b border-border/70 bg-muted/30 select-none',
        isPlayheadDragging && 'z-50 overflow-visible',
      )}
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

      <TimelineRulerPlayhead
        duration={duration}
        contentWidth={contentWidth}
        fps={fps}
        isDragging={isPlayheadDragging}
      />

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
