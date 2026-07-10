import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PropertyFieldProps = {
  label: string
  value: number | string
  suffix?: string
  type?: 'number' | 'text' | 'color'
  className?: string
  onChange: (value: number | string) => void
}

export function PropertyField({
  label,
  value,
  suffix,
  type = 'number',
  className,
  onChange,
}: PropertyFieldProps) {
  return (
    <label className={cn('group flex min-w-0 flex-col gap-1', className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        <Input
          type={type}
          value={value}
          className={cn('h-7 px-2 text-xs', suffix && 'pr-7')}
          onChange={(event) =>
            onChange(type === 'number' ? Number(event.target.value) : event.target.value)
          }
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
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
