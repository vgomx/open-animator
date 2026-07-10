import {
  AlignCenter,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
} from 'lucide-react'

import { PanelSection } from '@/components/shell/properties/PanelSection'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LayerAlignment } from '@/editor/align'
import { useEditorStore } from '@/editor/store'

type AlignButton = {
  alignment: LayerAlignment
  label: string
  icon: typeof AlignLeft
}

const horizontalButtons: AlignButton[] = [
  { alignment: 'left', label: 'Align left', icon: AlignLeft },
  { alignment: 'center-h', label: 'Align horizontal centers', icon: AlignCenter },
  { alignment: 'right', label: 'Align right', icon: AlignRight },
]

const verticalButtons: AlignButton[] = [
  { alignment: 'top', label: 'Align top', icon: AlignStartVertical },
  { alignment: 'center-v', label: 'Align vertical centers', icon: AlignCenterVertical },
  { alignment: 'bottom', label: 'Align bottom', icon: AlignEndVertical },
]

export function AlignSection() {
  const selectedCount = useEditorStore((state) => state.selectedLayerIds.length)
  const alignSelectedToArtboard = useEditorStore((state) => state.alignSelectedToArtboard)
  const alignSelectedLayers = useEditorStore((state) => state.alignSelectedLayers)
  const distributeSelectedLayers = useEditorStore((state) => state.distributeSelectedLayers)

  const canAlign = selectedCount > 0
  const canAlignTogether = selectedCount >= 2
  const canDistribute = selectedCount >= 3

  const renderButton = (
    { alignment, label, icon: Icon }: AlignButton,
    onClick: (alignment: LayerAlignment) => void,
    disabled: boolean,
  ) => (
    <Tooltip key={alignment}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-7 rounded-md"
          disabled={disabled}
          onClick={() => onClick(alignment)}
        >
          <Icon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )

  return (
    <PanelSection title="Alignment" icon={AlignCenter}>
      <div className="space-y-2">
        <div>
          <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
            To artboard {selectedCount > 1 ? `(${selectedCount} layers)` : ''}
          </p>
          <div className="grid grid-cols-3 gap-1">
            {horizontalButtons.map((button) =>
              renderButton(button, alignSelectedToArtboard, !canAlign),
            )}
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {verticalButtons.map((button) =>
              renderButton(button, alignSelectedToArtboard, !canAlign),
            )}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
            Selection {selectedCount > 0 ? `(${selectedCount} selected)` : ''}
          </p>
          <div className="grid grid-cols-3 gap-1">
            {horizontalButtons.map((button) =>
              renderButton(button, alignSelectedLayers, !canAlignTogether),
            )}
          </div>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {verticalButtons.map((button) =>
              renderButton(button, alignSelectedLayers, !canAlignTogether),
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 justify-start gap-1.5 px-2 text-xs"
                  disabled={!canDistribute}
                  onClick={() => distributeSelectedLayers('horizontal')}
                >
                  <AlignHorizontalSpaceBetween className="size-3.5" />
                  Distribute H
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {canDistribute
                  ? 'Space selected layers evenly horizontally'
                  : 'Select at least 3 layers'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 justify-start gap-1.5 px-2 text-xs"
                  disabled={!canDistribute}
                  onClick={() => distributeSelectedLayers('vertical')}
                >
                  <AlignVerticalSpaceBetween className="size-3.5" />
                  Distribute V
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {canDistribute
                  ? 'Space selected layers evenly vertically'
                  : 'Select at least 3 layers'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </PanelSection>
  )
}
