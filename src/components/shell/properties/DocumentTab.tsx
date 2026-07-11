import { ArtboardTab } from '@/components/shell/properties/ArtboardTab'
import { ColorField } from '@/components/shell/properties/ColorField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import { PropertyField } from '@/components/shell/properties/PropertyField'
import type { Artboard, CanvasSettings } from '@/editor/types'
import { clampExportFps } from '@/lib/preferences'
import { Clapperboard, LayoutGrid } from 'lucide-react'

type DocumentTabProps = {
  canvas: CanvasSettings
  artboard: Artboard
  fps: number
  duration: number
  layerCount: number
  stateCount: number
  onUpdateCanvas: (patch: Partial<CanvasSettings>) => void
  onUpdateArtboard: (patch: Partial<Artboard>) => void
  onUpdateProjectTiming: (patch: {
    duration?: number
    fps?: number
    loopIn?: number
    loopOut?: number
  }) => void
}

export function DocumentTab({
  canvas,
  artboard,
  fps,
  duration,
  layerCount,
  stateCount,
  onUpdateCanvas,
  onUpdateArtboard,
  onUpdateProjectTiming,
}: DocumentTabProps) {
  return (
    <div className="pb-3">
      {layerCount === 0 ? (
        <div className="border-b border-border/60 px-3 py-4">
          <p className="text-sm font-medium text-foreground">Start your animation</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Add shapes from the toolbar, then use the timeline to add states at different times and
            run Smart animate.
          </p>
        </div>
      ) : stateCount < 2 ? (
        <div className="border-b border-border/60 px-3 py-4">
          <p className="text-sm font-medium text-foreground">Ready for motion</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Scrub the timeline, add states where layouts should change, tweak layers, then run Smart
            animate to interpolate between them.
          </p>
        </div>
      ) : null}

      <PanelSection title="Canvas" icon={LayoutGrid} className="border-b-0">
        <ColorField
          label="Background"
          value={canvas.backgroundColor}
          allowNone
          onChange={(value) => onUpdateCanvas({ backgroundColor: value })}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Workspace color around the artboard. Use the eyedropper to sample from the canvas (Shift+click
          when screen sampling is available).
        </p>
      </PanelSection>

      <div className="border-t border-border/60">
        <ArtboardTab artboard={artboard} onUpdate={onUpdateArtboard} />
      </div>

      <PanelSection title="Timing" icon={Clapperboard}>
        <div className="grid grid-cols-2 gap-2">
          <PropertyField
            label="Duration"
            value={duration}
            suffix="s"
            min={0.1}
            max={600}
            step={0.1}
            onChange={(value) => onUpdateProjectTiming({ duration: Number(value) })}
          />
          <PropertyField
            label="FPS"
            value={fps}
            suffix="fps"
            min={12}
            max={60}
            step={1}
            onChange={(value) => onUpdateProjectTiming({ fps: clampExportFps(Number(value)) })}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Timeline snapping and frame labels use project FPS. Export defaults can still be changed per
          export.
        </p>
      </PanelSection>
    </div>
  )
}
