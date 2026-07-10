import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type PanelSectionProps = {
  title: string
  icon: LucideIcon
  children: ReactNode
  className?: string
}

export function PanelSection({ title, icon: Icon, children, className }: PanelSectionProps) {
  return (
    <section className={cn('border-b border-border/60 pb-3', className)}>
      <div className="mb-2 flex items-center gap-1.5 px-3 pt-3">
        <Icon className="size-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-2 px-3">{children}</div>
    </section>
  )
}
