import { useEffect } from 'react'

import { getAnimatedShape } from '@/editor/animation'
import { buildShapeTransform } from '@/editor/transforms'
import { useEditorStore } from '@/editor/store'
import type { Layer, Shape } from '@/editor/types'

function shapeTransform(shape: Shape): string {
  if (shape.type === 'path' && shape.transformMatrix) {
    const matrix = shape.transformMatrix
    return `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`
  }

  return buildShapeTransform(shape)
}

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
        const time = state.currentTime
        for (const layer of layers) {
          if (!layer.visible) {
            continue
          }

          const element = svg.querySelector<SVGGraphicsElement>(
            `[data-playback-layer="${layer.id}"]`,
          )
          if (!element) {
            continue
          }

          const shape = getAnimatedShape(layer, time)
          element.setAttribute('transform', shapeTransform(shape))
        }
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [layers, playbackState, svgRef])

  return null
}
