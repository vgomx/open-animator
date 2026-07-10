import { useEffect, useRef, useState } from 'react'

import { Pipette } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  clamp,
  COLOR_PRESETS,
  hexToHsv,
  HUE_GRADIENT,
  hsvToHex,
  isTransparentColor,
  normalizeHex,
  sanitizeHexInput,
  type HSV,
} from '@/editor/color-utils'
import { cn } from '@/lib/utils'

type ColorPickerPanelProps = {
  value: string
  onChange: (value: string) => void
  onEyedropper?: () => void
}

function Checkerboard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md bg-[length:8px_8px] bg-[position:0_0,4px_4px]',
        className,
      )}
      style={{
        backgroundImage:
          'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
      }}
    />
  )
}

export function ColorPickerPanel({ value, onChange, onEyedropper }: ColorPickerPanelProps) {
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(normalizeHex(value)))
  const [hexDraft, setHexDraft] = useState(normalizeHex(value))

  useEffect(() => {
    if (isTransparentColor(value)) {
      return
    }

    const next = normalizeHex(value)
    setHsv(hexToHsv(next))
    setHexDraft(next)
  }, [value])

  const commitHsv = (next: HSV) => {
    setHsv(next)
    const hex = hsvToHex(next)
    setHexDraft(hex)
    onChange(hex)
  }

  const bindDrag = (
    ref: React.RefObject<HTMLDivElement | null>,
    onMove: (x: number, y: number, rect: DOMRect) => void,
  ) => {
    return (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const element = ref.current
      if (!element) {
        return
      }

      const update = (clientX: number, clientY: number) => {
        onMove(clientX, clientY, element.getBoundingClientRect())
      }

      update(event.clientX, event.clientY)

      const onPointerMove = (moveEvent: PointerEvent) => update(moveEvent.clientX, moveEvent.clientY)
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    }
  }

  const currentHex = hsvToHex(hsv)
  const transparent = isTransparentColor(value)

  return (
    <div className="space-y-3">
      <div
        ref={svRef}
        className="relative h-36 cursor-crosshair overflow-hidden rounded-lg border border-border/70"
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={bindDrag(svRef, (clientX, clientY, rect) => {
          commitHsv({
            ...hsv,
            s: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
            v: clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100),
          })
        })}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            backgroundColor: currentHex,
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="relative h-3 cursor-ew-resize overflow-hidden rounded-full border border-border/70"
        style={{ background: HUE_GRADIENT }}
        onPointerDown={bindDrag(hueRef, (clientX, _clientY, rect) => {
          commitHsv({
            ...hsv,
            h: clamp(((clientX - rect.left) / rect.width) * 360, 0, 360),
          })
        })}
      >
        <div
          className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{
            left: `${(hsv.h / 360) * 100}%`,
            backgroundColor: `hsl(${hsv.h} 100% 50%)`,
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        {onEyedropper ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-7 shrink-0 rounded-md"
                onClick={onEyedropper}
              >
                <Pipette className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Sample color from canvas</TooltipContent>
          </Tooltip>
        ) : null}
        <div className="relative size-7 shrink-0 overflow-hidden rounded-md border border-border">
          <Checkerboard className="absolute inset-0" />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: transparent ? 'transparent' : currentHex }}
          />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
            #
          </span>
          <Input
            value={hexDraft.replace('#', '').toUpperCase()}
            className="h-7 pl-5 font-mono text-xs uppercase"
            onChange={(event) => {
              const next = sanitizeHexInput(event.target.value)
              setHexDraft(next)
              if (next.length === 7) {
                const parsed = hexToHsv(next)
                setHsv(parsed)
                onChange(next)
              }
            }}
            onBlur={() => {
              const next = normalizeHex(hexDraft)
              setHexDraft(next)
              setHsv(hexToHsv(next))
              onChange(next)
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-9 gap-1.5">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`Set color ${preset}`}
            className={cn(
              'relative size-5 overflow-hidden rounded-md border border-border/70 transition-transform hover:scale-105',
              normalizeHex(value) === preset && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
            )}
            onClick={() => {
              setHsv(hexToHsv(preset))
              setHexDraft(preset)
              onChange(preset)
            }}
          >
            <Checkerboard className="absolute inset-0" />
            <span className="absolute inset-0" style={{ backgroundColor: preset }} />
          </button>
        ))}
      </div>
    </div>
  )
}
