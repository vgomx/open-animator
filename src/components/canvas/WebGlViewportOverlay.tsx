import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

import type { ViewportController } from '@/editor/viewport-controller'
import { WebGlViewportRenderer } from '@/lib/webgl-viewport'

export type WebGlViewportOverlayHandle = {
  drawFrame: () => void
}

type WebGlViewportOverlayProps = {
  active: boolean
  artboardWidth: number
  artboardHeight: number
  sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>
  viewportController: ViewportController
  containerRef: React.RefObject<HTMLDivElement | null>
  /** When true, drawing is driven by UnifiedPlaybackDriver instead of a local rAF loop. */
  playbackDriven?: boolean
}

export const WebGlViewportOverlay = forwardRef<WebGlViewportOverlayHandle, WebGlViewportOverlayProps>(
  function WebGlViewportOverlay(
    {
      active,
      artboardWidth,
      artboardHeight,
      sourceCanvasRef,
      viewportController,
      containerRef,
      playbackDriven = false,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const rendererRef = useRef<WebGlViewportRenderer | null>(null)
    const frameIdRef = useRef(0)

    const drawFrame = () => {
      const source = sourceCanvasRef.current
      const renderer = rendererRef.current
      if (!source || !renderer) {
        return
      }

      renderer.setViewportState(viewportController.getLiveState())
      renderer.draw(source)
    }

    useImperativeHandle(ref, () => ({ drawFrame }), [])

    useEffect(() => {
      if (!active) {
        return
      }

      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) {
        return
      }

      let renderer: WebGlViewportRenderer
      try {
        renderer = new WebGlViewportRenderer({
          canvas,
          artboardWidth,
          artboardHeight,
        })
      } catch {
        return
      }

      rendererRef.current = renderer

      const resize = () => {
        renderer.setViewportSize(container.clientWidth, container.clientHeight)
        renderer.setArtboardSize(artboardWidth, artboardHeight)
      }

      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(container)

      const unsubscribe = viewportController.subscribe((state) => {
        renderer.setViewportState(state)
        if (!playbackDriven) {
          drawFrame()
        }
      })

      if (playbackDriven) {
        drawFrame()
      } else {
        const tick = () => {
          drawFrame()
          frameIdRef.current = window.requestAnimationFrame(tick)
        }
        frameIdRef.current = window.requestAnimationFrame(tick)
      }

      return () => {
        window.cancelAnimationFrame(frameIdRef.current)
        unsubscribe()
        observer.disconnect()
        renderer.destroy()
        rendererRef.current = null
      }
    }, [
      active,
      artboardHeight,
      artboardWidth,
      containerRef,
      playbackDriven,
      sourceCanvasRef,
      viewportController,
    ])

    if (!active) {
      return null
    }

    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 block"
        aria-hidden
      />
    )
  },
)
