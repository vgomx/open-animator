import { useRef } from 'react'

import type { BezierHandle } from '@/editor/types'
import { clamp01 } from '@/editor/easing'
import { cn } from '@/lib/utils'
import { UI_STROKE } from '@/lib/brand-colors'

type BezierEasingEditorProps = {
  value: BezierHandle
  onChange: (value: BezierHandle) => void
  className?: string
}

const PRESETS: Array<{ label: string; value: BezierHandle }> = [
  { label: 'Ease', value: [0.25, 0.1, 0.25, 1] },
  { label: 'In', value: [0.42, 0, 1, 1] },
  { label: 'Out', value: [0, 0, 0.58, 1] },
  { label: 'In-out', value: [0.42, 0, 0.58, 1] },
]

const WIDTH = 220
const HEIGHT = 140
const PADDING = 16

function toScreen(x: number, y: number) {
  const plotWidth = WIDTH - PADDING * 2
  const plotHeight = HEIGHT - PADDING * 2
  return {
    x: PADDING + x * plotWidth,
    y: PADDING + (1 - y) * plotHeight,
  }
}

function toNormalized(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  current: BezierHandle,
  handle: 1 | 2,
): BezierHandle {
  const plotWidth = WIDTH - PADDING * 2
  const plotHeight = HEIGHT - PADDING * 2
  const x = clamp01((clientX - rect.left - PADDING) / plotWidth)
  const y = clamp01(1 - (clientY - rect.top - PADDING) / plotHeight)

  if (handle === 1) {
    return [x, y, current[2], current[3]]
  }

  return [current[0], current[1], x, y]
}

function buildCurvePath(value: BezierHandle): string {
  const [x1, y1, x2, y2] = value
  const start = toScreen(0, 0)
  const end = toScreen(1, 1)
  const c1 = toScreen(x1, y1)
  const c2 = toScreen(x2, y2)

  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`
}

export function BezierEasingEditor({ value, onChange, className }: BezierEasingEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [x1, y1, x2, y2] = value
  const p1 = toScreen(x1, y1)
  const p2 = toScreen(x2, y2)
  const start = toScreen(0, 0)
  const end = toScreen(1, 1)

  const beginDrag = (handle: 1 | 2) => (event: React.PointerEvent<SVGCircleElement>) => {
    event.preventDefault()
    const svg = svgRef.current
    if (!svg) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      onChange(toNormalized(moveEvent.clientX, moveEvent.clientY, rect, value, handle))
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-md border border-border bg-muted/20"
        role="img"
        aria-label="Cubic bezier easing curve editor"
      >
        <rect x={PADDING} y={PADDING} width={WIDTH - PADDING * 2} height={HEIGHT - PADDING * 2} fill="transparent" stroke="currentColor" strokeOpacity={0.12} />
        <line x1={start.x} y1={start.y} x2={p1.x} y2={p1.y} stroke="#94a3b8" strokeWidth={1.5} />
        <line x1={end.x} y1={end.y} x2={p2.x} y2={p2.y} stroke="#94a3b8" strokeWidth={1.5} />
        <path d={buildCurvePath(value)} fill="none" stroke={UI_STROKE} strokeWidth={2.5} />
        <circle cx={start.x} cy={start.y} r={4} fill="#64748b" />
        <circle cx={end.x} cy={end.y} r={4} fill="#64748b" />
        <circle
          cx={p1.x}
          cy={p1.y}
          r={6}
          className="cursor-grab fill-primary stroke-background stroke-[1.5]"
          onPointerDown={beginDrag(1)}
        />
        <circle
          cx={p2.x}
          cy={p2.y}
          r={6}
          className="cursor-grab fill-primary stroke-background stroke-[1.5]"
          onPointerDown={beginDrag(2)}
        />
      </svg>

      <div className="grid grid-cols-4 gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="rounded-md border border-border/70 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="font-mono text-[10px] text-muted-foreground">
        cubic-bezier({x1.toFixed(2)}, {y1.toFixed(2)}, {x2.toFixed(2)}, {y2.toFixed(2)})
      </p>
    </div>
  )
}
