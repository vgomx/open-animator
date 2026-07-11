import { useEffect } from 'react'

import { updatePlaybackLayerTransforms } from '@/components/canvas/playback-utils'
import { useEditorStore } from '@/editor/store'
import type { Layer } from '@/editor/types'

type CanvasPlaybackRendererProps = {
  layers: Layer[]
  svgRef: React.RefObject<SVGSVGElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  width: number
  height: number
}

export function CanvasPlaybackRenderer({
  layers,
  svgRef,
  canvasRef,
  width,
  height,
}: CanvasPlaybackRendererProps) {
  const playbackState = useEditorStore((state) => state.playbackState)

  useEffect(() => {
    if (playbackState !== 'playing') {
      return
    }

    let frameId = 0

    const tick = () => {
      const state = useEditorStore.getState()
      if (state.playbackState !== 'playing') {
        return
      }

      const svg = svgRef.current
      const canvas = canvasRef.current
      if (svg && canvas) {
        const time = state.currentTime
        updatePlaybackLayerTransforms(svg, layers, time)

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, width, height)
          // SVGSVGElement is valid at runtime; TS types only list SVGImageElement.
          ctx.drawImage(svg as unknown as CanvasImageSource, 0, 0, width, height)
        }
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [canvasRef, height, layers, playbackState, svgRef, width])

  return null
}

type FastPreviewBadgeProps = {
  active: boolean
  gpu?: boolean
}

export function FastPreviewBadge({ active, gpu = false }: FastPreviewBadgeProps) {
  if (!active) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute right-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm ring-1 ring-border/50"
      aria-hidden
    >
      {gpu ? 'Fast preview · GPU' : 'Fast preview'}
    </div>
  )
}
