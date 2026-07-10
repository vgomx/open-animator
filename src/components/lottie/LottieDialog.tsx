import { useEffect, useRef, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type LottieDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  animationData: object | null
}

type LottieAnimationItem = {
  destroy: () => void
}

export function LottieDialog({ open, onOpenChange, animationData }: LottieDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<LottieAnimationItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !animationData || !containerRef.current) {
      return
    }

    let cancelled = false
    setIsLoading(true)

    void import('lottie-web')
      .then((module) => {
        if (cancelled || !containerRef.current) {
          return
        }

        animationRef.current?.destroy()
        animationRef.current = module.default.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        })
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
      animationRef.current?.destroy()
      animationRef.current = null
      setIsLoading(false)
    }
  }, [animationData, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lottie preview</DialogTitle>
          <DialogDescription>Playback preview for imported or exported Lottie JSON.</DialogDescription>
        </DialogHeader>
        <div
          ref={containerRef}
          className="flex min-h-64 items-center justify-center rounded-lg border border-border bg-muted/20 p-4"
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading Lottie player…</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
