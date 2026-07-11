import { useEffect } from 'react'

import { updatePlaybackLayerTransforms } from '@/components/canvas/playback-utils'
import { useEditorStore } from '@/editor/store'
import type { Layer } from '@/editor/types'

type PlaybackTransformDriverProps = {
  layers: Layer[]
  svgRef: React.RefObject<SVGSVGElement | null>
}

export function PlaybackTransformDriver({ layers, svgRef }: PlaybackTransformDriverProps) {
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
      if (svg) {
        updatePlaybackLayerTransforms(svg, layers, state.currentTime)
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [layers, playbackState, svgRef])

  return null
}
