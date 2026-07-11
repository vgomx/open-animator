import { useEffect, useRef, useState } from 'react'

import {
  Dialog,
  DialogBody,
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
  addEventListener: (name: 'data_failed' | 'error', handler: () => void) => void
  removeEventListener: (name: 'data_failed' | 'error', handler: () => void) => void
}

export function LottieDialog({ open, onOpenChange, animationData }: LottieDialogProps) {
  const animationRef = useRef<LottieAnimationItem | null>(null)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !animationData || !mountRef.current) {
      return
    }

    const mountNode = mountRef.current
    let cancelled = false
    setIsLoading(true)
    setError(null)
    mountNode.replaceChildren()

    const handleFailure = () => {
      if (!cancelled) {
        setError('Lottie could not render this animation.')
      }
    }

    void import('lottie-web')
      .then((module) => {
        if (cancelled || !mountNode) {
          return
        }

        animationRef.current?.destroy()
        const animation = module.default.loadAnimation({
          container: mountNode,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        })
        animationRef.current = animation as unknown as LottieAnimationItem
        animation.addEventListener('data_failed', handleFailure)
        animation.addEventListener('error', handleFailure)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load the Lottie player.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
      const animation = animationRef.current
      if (animation) {
        animation.removeEventListener('data_failed', handleFailure)
        animation.removeEventListener('error', handleFailure)
        animation.destroy()
      }
      animationRef.current = null
      mountNode.replaceChildren()
      setIsLoading(false)
    }
  }, [animationData, open])

  useEffect(() => {
    if (!open) {
      setError(null)
      setIsLoading(false)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,90svh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Lottie preview</DialogTitle>
          <DialogDescription>
            Playback preview for exported or imported Lottie JSON.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-6 py-5">
          <div className="relative min-h-64 rounded-lg border border-border bg-muted/20 p-4">
            <div ref={mountRef} className="flex min-h-56 w-full items-center justify-center" />
            {isLoading ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Loading Lottie player…
              </p>
            ) : null}
            {!isLoading && error ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {!isLoading && !error && !animationData ? (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                No animation data to preview.
              </p>
            ) : null}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
