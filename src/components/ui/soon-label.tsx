import { cn } from '@/lib/utils'

type SoonLabelProps = {
  className?: string
}

export function SoonLabel({ className }: SoonLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1 py-px text-[8px] font-medium leading-none text-muted-foreground ring-1 ring-border/70',
        className,
      )}
    >
      Soon
    </span>
  )
}
