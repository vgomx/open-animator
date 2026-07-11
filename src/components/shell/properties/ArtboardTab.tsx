import { ColorField } from '@/components/shell/properties/ColorField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import { PropertyField, PropertyGrid } from '@/components/shell/properties/PropertyField'
import { Input } from '@/components/ui/input'
import type { Artboard } from '@/editor/types'
import { ARTBOARD_SIZE_PRESETS } from '@/lib/artboard-presets'
import { Frame, Paintbrush, Ruler } from 'lucide-react'

type ArtboardTabProps = {
  artboard: Artboard
  onUpdate: (patch: Partial<Artboard>) => void
}

export function ArtboardTab({ artboard, onUpdate }: ArtboardTabProps) {
  const matchingPreset = ARTBOARD_SIZE_PRESETS.find(
    (preset) => preset.width === artboard.width && preset.height === artboard.height,
  )?.id

  return (
    <div className="pb-3">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted/40">
            <Frame className="size-3.5 text-muted-foreground" />
          </div>
          <Input
            value={artboard.name}
            className="h-8 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-input"
            onChange={(event) => onUpdate({ name: event.target.value })}
          />
        </div>
        <p className="mt-2 px-1 text-[11px] text-muted-foreground">
          {artboard.width} × {artboard.height}px
        </p>
      </div>

      <PanelSection title="Size" icon={Ruler}>
        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Preset
            </span>
            <select
              value={matchingPreset ?? 'custom'}
              className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
              onChange={(event) => {
                const preset = ARTBOARD_SIZE_PRESETS.find((item) => item.id === event.target.value)
                if (preset) {
                  onUpdate({ width: preset.width, height: preset.height })
                }
              }}
            >
              <option value="custom">Custom</option>
              {ARTBOARD_SIZE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <PropertyGrid>
            <PropertyField
              label="W"
              value={artboard.width}
              suffix="px"
              min={1}
              max={10000}
              onChange={(value) => onUpdate({ width: Number(value) })}
            />
            <PropertyField
              label="H"
              value={artboard.height}
              suffix="px"
              min={1}
              max={10000}
              onChange={(value) => onUpdate({ height: Number(value) })}
            />
          </PropertyGrid>
        </div>
      </PanelSection>

      <PanelSection title="Background" icon={Paintbrush}>
        <ColorField
          label="Fill"
          value={artboard.backgroundColor}
          allowNone
          onChange={(value) => onUpdate({ backgroundColor: value })}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Solid artboard fill, or set to none for a transparent grid. Sample colors from the canvas with
          the eyedropper.
        </p>
      </PanelSection>
    </div>
  )
}
