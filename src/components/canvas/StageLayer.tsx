import { memo } from 'react'

import { NodeOverlay } from '@/components/canvas/NodeOverlay'
import { SelectionOverlay } from '@/components/canvas/SelectionOverlay'
import { ShapeView } from '@/components/canvas/ShapeView'
import type { EditorTool } from '@/editor/tools'
import type { Layer, Shape } from '@/editor/types'
import { importedMaskId } from '@/io/svg-masks'

type StageLayerProps = {
  layer: Layer
  shape: Shape
  isSelected: boolean
  isPrimary: boolean
  allowLayerSelect: boolean
  isPanning: boolean
  activeTool: EditorTool
  onSelect: (layerId: string, options: { additive: boolean }) => void
  onEditText: (layerId: string) => void
}

export const StageLayer = memo(function StageLayer({
  layer,
  shape,
  isSelected,
  isPrimary,
  allowLayerSelect,
  isPanning,
  activeTool,
  onSelect,
  onEditText,
}: StageLayerProps) {
  const maskId =
    layer.svgMaskId && shape.type === 'path' && shape.transformMatrix
      ? `${layer.svgMaskId}__${layer.id}`
      : layer.svgMaskId

  return (
    <g
      mask={maskId ? `url(#${importedMaskId(maskId)})` : undefined}
      onPointerDown={(event) => {
        if (!allowLayerSelect || isPanning) {
          return
        }

        event.stopPropagation()
        onSelect(layer.id, {
          additive: event.shiftKey || event.metaKey || event.ctrlKey,
        })
      }}
      onDoubleClick={(event) => {
        if (activeTool !== 'select' || layer.shape.type !== 'text') {
          return
        }

        event.stopPropagation()
        onEditText(layer.id)
      }}
      className={allowLayerSelect ? 'cursor-pointer' : undefined}
      style={{ pointerEvents: allowLayerSelect ? 'auto' : 'none' }}
    >
      <ShapeView shape={shape} playbackLayerId={layer.id} />
      <g data-eyedropper-ignore>
        {isSelected && activeTool === 'select' ? (
          <SelectionOverlay layerId={layer.id} shape={shape} interactive={isPrimary} />
        ) : null}
        {isSelected && activeTool === 'node' && isPrimary ? (
          <NodeOverlay layerId={layer.id} shape={shape} />
        ) : null}
      </g>
    </g>
  )
})
