import type { ReactNode } from 'react'

import { NumberInput, useNumberScrub, type NumberInputProps } from '@/components/ui/number-input'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PropertyFieldProps = {
  label: string
  value: number | string
  suffix?: string
  type?: 'number' | 'text' | 'color'
  className?: string
  disabled?: boolean
  mixed?: boolean
  onChange: (value: number | string) => void
} & Pick<NumberInputProps, 'step' | 'shiftStep' | 'min' | 'max' | 'decimals'>

export function PropertyField({
  label,
  value,
  suffix,
  type = 'number',
  className,
  disabled = false,
  mixed = false,
  step,
  shiftStep,
  min,
  max,
  decimals,
  onChange,
}: PropertyFieldProps) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  const isFieldDisabled = disabled || mixed
  const { scrubProps } = useNumberScrub({
    value: numericValue,
    onChange: (next) => onChange(next),
    step,
    shiftStep,
    min,
    max,
    disabled: isFieldDisabled || type !== 'number',
  })

  return (
    <div className={cn('group flex min-w-0 flex-col gap-1', className)}>
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-wide text-muted-foreground',
          type === 'number' && !isFieldDisabled && scrubProps.className,
        )}
        onPointerDown={type === 'number' && !isFieldDisabled ? scrubProps.onPointerDown : undefined}
      >
        {label}
      </span>
      {type === 'number' ? (
        mixed ? (
          <Input
            type="text"
            value=""
            placeholder="Mixed"
            className="h-7 px-2 text-xs text-muted-foreground"
            onChange={(event) => {
              const parsed = Number.parseFloat(event.target.value)
              if (Number.isFinite(parsed)) {
                onChange(parsed)
              }
            }}
          />
        ) : (
          <NumberInput
            value={numericValue}
            suffix={suffix}
            step={step}
            shiftStep={shiftStep}
            min={min}
            max={max}
            decimals={decimals}
            disabled={disabled}
            onChange={(next) => onChange(next)}
          />
        )
      ) : (
        <Input
          type={type}
          value={mixed ? '' : value}
          placeholder={mixed ? 'Mixed' : undefined}
          disabled={isFieldDisabled}
          className="h-7 px-2 text-xs"
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}

type PropertyGridProps = {
  children: ReactNode
  columns?: 2 | 3
}

export function PropertyGrid({ children, columns = 2 }: PropertyGridProps) {
  return (
    <div
      className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}
    >
      {children}
    </div>
  )
}
