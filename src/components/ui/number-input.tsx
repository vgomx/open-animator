import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '@/lib/utils'

export type NumberInputProps = {
  value: number
  onChange: (value: number) => void
  step?: number
  shiftStep?: number
  min?: number
  max?: number
  decimals?: number
  suffix?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
}

function clampValue(value: number, min?: number, max?: number) {
  let next = value
  if (min !== undefined) {
    next = Math.max(min, next)
  }
  if (max !== undefined) {
    next = Math.min(max, next)
  }
  return next
}

function formatNumber(value: number, decimals?: number) {
  if (decimals === undefined) {
    return String(Math.round(value))
  }

  return value.toFixed(decimals)
}

function parseNumber(raw: string) {
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function NumberInput({
  value,
  onChange,
  step = 1,
  shiftStep,
  min,
  max,
  decimals,
  suffix,
  disabled = false,
  className,
  inputClassName,
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const effectiveShiftStep = shiftStep ?? step * 10

  const commit = (next: number) => {
    onChange(clampValue(next, min, max))
    setDraft(null)
  }

  const nudge = (direction: 1 | -1, large: boolean) => {
    const delta = (large ? effectiveShiftStep : step) * direction
    commit(value + delta)
  }

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft(null)
    }
  }, [value])

  const displayValue = draft ?? formatNumber(value, decimals)

  return (
    <div
      className={cn(
        'flex h-7 min-w-0 items-stretch overflow-hidden rounded-lg border border-input bg-transparent dark:bg-input/30',
        disabled && 'opacity-50',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={displayValue}
        className={cn(
          'min-w-0 flex-1 bg-transparent px-2 text-xs outline-none disabled:cursor-not-allowed',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          inputClassName,
        )}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== null) {
            commit(parseNumber(draft))
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            nudge(1, event.shiftKey)
            return
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault()
            nudge(-1, event.shiftKey)
            return
          }

          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      {suffix ? (
        <span className="flex shrink-0 items-center pr-1 text-[10px] text-muted-foreground">{suffix}</span>
      ) : null}
      {!disabled ? (
        <div className="flex w-4 shrink-0 flex-col border-l border-input">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Increase value"
            className="flex h-3.5 flex-1 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => nudge(1, false)}
          >
            <ChevronUp className="size-2.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Decrease value"
            className="flex h-3.5 flex-1 items-center justify-center border-t border-input text-muted-foreground hover:bg-muted hover:text-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => nudge(-1, false)}
          >
            <ChevronDown className="size-2.5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function useNumberScrub({
  value,
  onChange,
  step = 1,
  shiftStep,
  min,
  max,
  disabled = false,
}: Pick<NumberInputProps, 'value' | 'onChange' | 'step' | 'shiftStep' | 'min' | 'max' | 'disabled'>) {
  const effectiveShiftStep = shiftStep ?? step * 10

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (disabled || event.button !== 0) {
      return
    }

    event.preventDefault()
    const originX = event.clientX
    const originValue = value
    const largeStep = event.shiftKey

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - originX
      const stepSize = largeStep ? effectiveShiftStep : step
      const next = originValue + Math.round(delta / 2) * stepSize
      onChange(clampValue(next, min, max))
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  return {
    scrubProps: disabled
      ? {}
      : {
          onPointerDown,
          className: 'cursor-ew-resize select-none',
        },
  }
}
