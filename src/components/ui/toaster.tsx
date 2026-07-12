import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { dismissToast, subscribeToToasts, type Toast } from '@/lib/toast'

function ToastCard({ toast }: { toast: Toast }) {
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
      )}
    >
      {toast.variant === 'loading' ? (
        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
      ) : null}
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium leading-none">{toast.title}</p>
        {toast.description ? (
          <p className="text-sm text-muted-foreground">{toast.description}</p>
        ) : null}
        {toast.variant === 'loading' ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${Math.max(4, Math.min(100, toast.progress ?? 8))}%` }}
            />
          </div>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={() => dismissToast(toast.id)}
      >
        <X />
      </Button>
    </div>
  )
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribeToToasts(setToasts), [])

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
