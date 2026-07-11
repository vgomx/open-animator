import { useMemo } from 'react'

import { getAnimatedShape } from '@/editor/animation'
import { ImportedSvgDefs } from '@/components/canvas/ImportedSvgDefs'
import { useEditorStore } from '@/editor/store'
import type { Layer } from '@/editor/types'
import { buildAnimatedClipPathDefs } from '@/io/svg-clippaths'
import { buildAnimatedMaskDefs } from '@/io/svg-masks'

type AnimatedMaskDefsProps = {
  layers: Layer[]
}

export function AnimatedMaskDefs({ layers }: AnimatedMaskDefsProps) {
  const importedSvg = useEditorStore((state) => state.project.importedSvg)
  const currentTime = useEditorStore((state) => state.currentTime)
  const playbackState = useEditorStore((state) => state.playbackState)

  const maskDefs = useMemo(() => {
    if (!importedSvg) {
      return null
    }

    let nextDefs = importedSvg
    const sourceMasks = importedSvg.masks
    if (sourceMasks && Object.keys(sourceMasks).length > 0) {
      const maskedLayers = layers.filter((layer) => layer.svgMaskId && layer.visible)
      if (maskedLayers.length > 0) {
        const masks = buildAnimatedMaskDefs(sourceMasks, maskedLayers, currentTime, getAnimatedShape)
        nextDefs = { ...nextDefs, masks }
      }
    }

    const sourceClipPaths = importedSvg.clipPaths
    if (sourceClipPaths && Object.keys(sourceClipPaths).length > 0) {
      const clippedLayers = layers.filter((layer) => layer.svgClipPathId && layer.visible)
      if (clippedLayers.length > 0) {
        const clipPaths = buildAnimatedClipPathDefs(
          sourceClipPaths,
          clippedLayers,
          currentTime,
          getAnimatedShape,
        )
        nextDefs = { ...nextDefs, clipPaths }
      }
    }

    return nextDefs
  }, [currentTime, importedSvg, layers, playbackState])

  return <ImportedSvgDefs defs={maskDefs ?? importedSvg} />
}
