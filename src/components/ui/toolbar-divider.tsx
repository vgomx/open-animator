import { cn } from '@/lib/utils'

type ToolbarDividerProps = {
  /** Match icon-sm toolbar buttons (size-7). */
  size?: 'toolbar' | 'palette'
  className?: string
}

const sizeClasses = {
  toolbar: 'h-7',
  palette: 'h-8',
} as const

export function ToolbarDivider({ size = 'toolbar', className }: ToolbarDividerProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={cn('mx-1 w-px shrink-0 self-center bg-border', sizeClasses[size], className)}
    />
  )
}
