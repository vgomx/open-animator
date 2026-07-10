import { useEffect, useState } from 'react'
import { Pipette } from 'lucide-react'

import { ColorPickerPanel } from '@/components/shell/properties/ColorPickerPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isTransparentColor, normalizeHex } from '@/editor/color-utils'
import { isNativeEyeDropperSupported, pickColorFromScreen } from '@/editor/eyedropper'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

type ColorFieldProps = {
  label: string
  value: string
  allowNone?: boolean
  mixed?: boolean
  onChange: (value: string) => void
}

function SwatchPreview({ color, className }: { color: string; className?: string }) {
  const transparent = isTransparentColor(color)
  const display = transparent ? 'transparent' : normalizeHex(color)

  return (
    <div className={cn('relative overflow-hidden rounded-md border border-border/80', className)}>
      <div
        className="absolute inset-0 bg-[length:8px_8px] bg-[position:0_0,4px_4px]"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
        }}
      />
      <div className="absolute inset-0" style={{ backgroundColor: display }} />
    </div>
  )
}

export function ColorField({ label, value, allowNone = false, mixed = false, onChange }: ColorFieldProps) {
  const transparent = !mixed && isTransparentColor(value)
  const displayHex = mixed ? '' : transparent ? '' : normalizeHex(value).replace('#', '').toUpperCase()
  const [hexDraft, setHexDraft] = useState(displayHex)
  const [open, setOpen] = useState(false)
  const startEyedropper = useEditorStore((state) => state.startEyedropper)

  useEffect(() => {
    setHexDraft(displayHex)
  }, [displayHex])

  const handleEyedropper = async (event?: React.MouseEvent) => {
    if (event?.shiftKey || !isNativeEyeDropperSupported()) {
      setOpen(false)
      startEyedropper(onChange)
      return
    }

    const nativeColor = await pickColorFromScreen()
    if (nativeColor) {
      onChange(nativeColor)
      return
    }

    setOpen(false)
    startEyedropper(onChange)
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <div className="flex h-7 items-stretch overflow-hidden rounded-lg border border-input bg-transparent dark:bg-input/30">
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-9 shrink-0 items-center justify-center border-r border-input hover:bg-muted/40"
              aria-label={`Open ${label.toLowerCase()} color picker`}
            >
              <SwatchPreview color={mixed ? 'transparent' : value} className="size-5" />
            </button>
          </PopoverTrigger>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 rounded-none border-r border-input"
                onClick={(event) => {
                  void handleEyedropper(event)
                }}
              >
                <Pipette className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isNativeEyeDropperSupported()
                ? 'Sample from screen · Shift+click for canvas'
                : 'Sample from canvas'}
            </TooltipContent>
          </Tooltip>
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[10px] text-muted-foreground">
              {transparent ? '' : '#'}
            </span>
            <Input
              value={mixed ? 'Mixed' : transparent ? 'None' : hexDraft}
              readOnly={mixed || transparent}
              className={cn(
                'h-7 rounded-none border-0 bg-transparent pr-2 font-mono text-xs uppercase shadow-none focus-visible:ring-0',
                transparent ? 'pl-2' : 'pl-5',
              )}
              onChange={(event) => {
                const cleaned = event.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase()
                setHexDraft(cleaned)
                if (cleaned.length === 6) {
                  onChange(`#${cleaned}`)
                }
              }}
              onBlur={() => {
                if (transparent) {
                  return
                }

                const cleaned = hexDraft.replace(/[^0-9a-f]/gi, '').slice(0, 6).padEnd(6, '0').toUpperCase()
                setHexDraft(cleaned)
                onChange(`#${cleaned}`)
              }}
            />
          </div>
        </div>
        <PopoverContent side="left" align="start" sideOffset={12}>
          <div className="mb-2 flex items-center gap-2">
            <Pipette className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">{label}</p>
          </div>
          <ColorPickerPanel
            value={transparent ? '#000000' : value}
            onChange={onChange}
            onEyedropper={() => {
              void handleEyedropper()
            }}
          />
          {allowNone ? (
            <button
              type="button"
              className="mt-3 w-full rounded-md border border-border/70 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              onClick={() => onChange('none')}
            >
              Set to none
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  )
}
