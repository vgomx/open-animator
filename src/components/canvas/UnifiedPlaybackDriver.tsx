import { useEffect, useRef } from 'react'

import { updatePlaybackLayerTransforms } from '@/components/canvas/playback-utils'
import {
  advancePlaybackTime,
  clampPlaybackDelta,
  shouldSyncPlaybackUi,
} from '@/editor/playback-tick'
import { useEditorStore } from '@/editor/store'
import type { Layer } from '@/editor/types'

type UnifiedPlaybackDriverProps = {
  layers: Layer[]
  svgRef: React.RefObject<SVGSVGElement | null>
  canvasRef?: React.RefObject<HTMLCanvasElement | null>
  artboardWidth?: number
  artboardHeight?: number
  useCanvasOutput?: boolean
  onAfterFrame?: (time: number) => void
  onCanvasFrameReady?: () => void
}

export function UnifiedPlaybackDriver({
  layers,
  svgRef,
  canvasRef,
  artboardWidth = 0,
  artboardHeight = 0,
  useCanvasOutput = false,
  onAfterFrame,
  onCanvasFrameReady,
}: UnifiedPlaybackDriverProps) {
  const playbackState = useEditorStore((state) => state.playbackState)
  const onAfterFrameRef = useRef(onAfterFrame)
  const onCanvasFrameReadyRef = useRef(onCanvasFrameReady)
  const canvasReadyRef = useRef(false)

  onAfterFrameRef.current = onAfterFrame
  onCanvasFrameReadyRef.current = onCanvasFrameReady

  useEffect(() => {
    if (playbackState !== 'playing') {
      canvasReadyRef.current = false
      return
    }

    let frameId = 0
    let lastTimestamp = performance.now()
    let lastUiSyncTimestamp = 0
    let localTime = useEditorStore.getState().currentTime

    const renderFrame = (time: number) => {
      const svg = svgRef.current
      if (!svg) {
        return
      }

      try {
        updatePlaybackLayerTransforms(svg, layers, time)

        if (useCanvasOutput) {
          const canvas = canvasRef?.current
          if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.clearRect(0, 0, artboardWidth, artboardHeight)
              ctx.drawImage(svg as unknown as CanvasImageSource, 0, 0, artboardWidth, artboardHeight)
              if (!canvasReadyRef.current) {
                canvasReadyRef.current = true
                onCanvasFrameReadyRef.current?.()
              }
            }
          }
        }

        onAfterFrameRef.current?.(time)
      } catch (error) {
        console.error('Playback frame render failed', error)
      }
    }

    const tick = (timestamp: number) => {
      const store = useEditorStore.getState()
      if (store.playbackState !== 'playing') {
        return
      }

      const delta = clampPlaybackDelta((timestamp - lastTimestamp) / 1000)
      lastTimestamp = timestamp

      if (delta > 0) {
        const { nextTime, finished } = advancePlaybackTime({
          currentTime: localTime,
          deltaSeconds: delta,
          loop: store.loop,
          loopIn: store.project.loopIn,
          loopOut: store.project.loopOut,
          duration: store.project.duration,
        })

        localTime = nextTime
        renderFrame(localTime)

        if (finished) {
          store.setCurrentTime(localTime)
          store.setPlaybackState('idle')
          return
        }

        if (shouldSyncPlaybackUi(lastUiSyncTimestamp, timestamp)) {
          lastUiSyncTimestamp = timestamp
          store.setCurrentTime(localTime)
        }
      } else {
        renderFrame(localTime)
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
      canvasReadyRef.current = false
      const store = useEditorStore.getState()
      if (store.playbackState === 'playing') {
        store.setCurrentTime(localTime)
      }
    }
  }, [
    artboardHeight,
    artboardWidth,
    canvasRef,
    layers,
    playbackState,
    svgRef,
    useCanvasOutput,
  ])

  return null
}
