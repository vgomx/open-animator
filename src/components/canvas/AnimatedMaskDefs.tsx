import { useMemo } from 'react'

import { getAnimatedShape } from '@/editor/animation'
import { ImportedSvgDefs } from '@/components/canvas/ImportedSvgDefs'
import { useEditorStore } from '@/editor/store'
import type { Layer } from '@/editor/types'
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

    const sourceMasks = importedSvg.masks
    if (!sourceMasks || Object.keys(sourceMasks).length === 0) {
      return importedSvg
    }

    const maskedLayers = layers.filter((layer) => layer.svgMaskId && layer.visible)
    if (maskedLayers.length === 0) {
      return importedSvg
    }

    const masks = buildAnimatedMaskDefs(sourceMasks, maskedLayers, currentTime, getAnimatedShape)
    return {
      ...importedSvg,
      masks,
    }
  }, [currentTime, importedSvg, layers, playbackState])

  return <ImportedSvgDefs defs={maskDefs ?? importedSvg} />
}
