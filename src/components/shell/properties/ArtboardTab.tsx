import { ColorField } from '@/components/shell/properties/ColorField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import { PropertyField, PropertyGrid } from '@/components/shell/properties/PropertyField'
import { Input } from '@/components/ui/input'
import type { Artboard } from '@/editor/types'
import { Frame, Paintbrush, Ruler } from 'lucide-react'

type ArtboardTabProps = {
  artboard: Artboard
  onUpdate: (patch: Partial<Artboard>) => void
}

export function ArtboardTab({ artboard, onUpdate }: ArtboardTabProps) {
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
      </PanelSection>

      <PanelSection title="Background" icon={Paintbrush}>
        <ColorField
          label="Fill"
          value={artboard.backgroundColor}
          allowNone
          onChange={(value) => onUpdate({ backgroundColor: value })}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Choose a solid color for the artboard. Set to none to show the transparent grid.
        </p>
      </PanelSection>
    </div>
  )
}
