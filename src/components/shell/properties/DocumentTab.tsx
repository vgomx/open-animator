import { ArtboardTab } from '@/components/shell/properties/ArtboardTab'
import { ColorField } from '@/components/shell/properties/ColorField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import type { Artboard, CanvasSettings } from '@/editor/types'
import { LayoutGrid } from 'lucide-react'

type DocumentTabProps = {
  canvas: CanvasSettings
  artboard: Artboard
  onUpdateCanvas: (patch: Partial<CanvasSettings>) => void
  onUpdateArtboard: (patch: Partial<Artboard>) => void
}

export function DocumentTab({
  canvas,
  artboard,
  onUpdateCanvas,
  onUpdateArtboard,
}: DocumentTabProps) {
  return (
    <div className="pb-3">
      <PanelSection title="Canvas" icon={LayoutGrid} className="border-b-0">
        <ColorField
          label="Background"
          value={canvas.backgroundColor}
          allowNone
          onChange={(value) => onUpdateCanvas({ backgroundColor: value })}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Workspace color around the artboard. Set to none to show the transparent grid.
        </p>
      </PanelSection>

      <div className="border-t border-border/60">
        <ArtboardTab artboard={artboard} onUpdate={onUpdateArtboard} />
      </div>
    </div>
  )
}
