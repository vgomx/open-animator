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
}

export function LottieDialog({ open, onOpenChange, animationData }: LottieDialogProps) {
  const animationRef = useRef<LottieAnimationItem | null>(null)
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !animationData || !containerNode) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)
    containerNode.replaceChildren()

    void import('lottie-web')
      .then((module) => {
        if (cancelled || !containerNode) {
          return
        }

        animationRef.current?.destroy()
        animationRef.current = module.default.loadAnimation({
          container: containerNode,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData,
        })
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
      animationRef.current?.destroy()
      animationRef.current = null
      setIsLoading(false)
    }
  }, [animationData, containerNode, open])

  useEffect(() => {
    if (!open) {
      setContainerNode(null)
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
          <div
            ref={setContainerNode}
            className="flex min-h-64 items-center justify-center rounded-lg border border-border bg-muted/20 p-4"
          >
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading Lottie player…</p>
            ) : null}
            {!isLoading && error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {!isLoading && !error && !animationData ? (
              <p className="text-sm text-muted-foreground">No animation data to preview.</p>
            ) : null}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
