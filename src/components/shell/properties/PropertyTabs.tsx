import { AlignSection } from '@/components/shell/properties/AlignSection'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import { PropertyField, PropertyGrid } from '@/components/shell/properties/PropertyField'
import { Input } from '@/components/ui/input'
import type { Layer } from '@/editor/types'
import type { Shape } from '@/editor/types'
import { Layers2, Move, Paintbrush, PenLine } from 'lucide-react'

type DesignTabProps = {
  selectedLayer: Layer
  shape: Shape
  onRename: (name: string) => void
  onUpdateShape: (patch: Partial<Shape>) => void
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          className="h-7 w-10 shrink-0 cursor-pointer p-1"
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          value={value}
          className="h-7 min-w-0 flex-1 px-2 font-mono text-xs uppercase"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  )
}

export function DesignTab({
  selectedLayer,
  shape,
  onRename,
  onUpdateShape,
}: DesignTabProps) {
  return (
    <div className="pb-3">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted/40">
            <Layers2 className="size-3.5 text-muted-foreground" />
          </div>
          <Input
            value={selectedLayer.name}
            className="h-8 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-input"
            onChange={(event) => onRename(event.target.value)}
          />
        </div>
      </div>

      <PanelSection title="Transform" icon={Move}>
        <PropertyGrid>
          <PropertyField label="X" value={shape.x} suffix="px" onChange={(value) => onUpdateShape({ x: Number(value) })} />
          <PropertyField label="Y" value={shape.y} suffix="px" onChange={(value) => onUpdateShape({ y: Number(value) })} />
          {shape.type === 'rect' ? (
            <>
              <PropertyField
                label="W"
                value={shape.width}
                suffix="px"
                onChange={(value) => onUpdateShape({ width: Number(value) })}
              />
              <PropertyField
                label="H"
                value={shape.height}
                suffix="px"
                onChange={(value) => onUpdateShape({ height: Number(value) })}
              />
            </>
          ) : shape.type === 'text' ? (
            <>
              <PropertyField
                label="Size"
                value={shape.fontSize}
                suffix="px"
                onChange={(value) => onUpdateShape({ fontSize: Number(value) })}
              />
            </>
          ) : (
            <>
              <PropertyField
                label="RX"
                value={shape.rx}
                suffix="px"
                onChange={(value) => onUpdateShape({ rx: Number(value) })}
              />
              <PropertyField
                label="RY"
                value={shape.ry}
                suffix="px"
                onChange={(value) => onUpdateShape({ ry: Number(value) })}
              />
            </>
          )}
        </PropertyGrid>
        <PropertyGrid columns={3}>
          <PropertyField
            label="Rotation"
            value={shape.rotation}
            suffix="°"
            onChange={(value) => onUpdateShape({ rotation: Number(value) })}
          />
          <PropertyField
            label="Scale"
            value={shape.scale}
            onChange={(value) => onUpdateShape({ scale: Number(value) })}
          />
          <PropertyField
            label="Opacity"
            value={Math.round(shape.opacity * 100)}
            suffix="%"
            onChange={(value) => onUpdateShape({ opacity: Number(value) / 100 })}
          />
        </PropertyGrid>
      </PanelSection>

      <AlignSection />

      <PanelSection title="Fill" icon={Paintbrush}>
        {shape.type === 'text' ? (
          <PropertyField
            label="Text"
            value={shape.text}
            onChange={(value) => onUpdateShape({ text: String(value) })}
          />
        ) : null}
        <ColorField label="Color" value={shape.fill} onChange={(value) => onUpdateShape({ fill: value })} />
      </PanelSection>

      {shape.type === 'text' ? null : (
      <PanelSection title="Stroke" icon={PenLine} className="border-b-0">
        <ColorField
          label="Color"
          value={shape.stroke}
          onChange={(value) => onUpdateShape({ stroke: value })}
        />
        <PropertyField
          label="Width"
          value={shape.strokeWidth}
          suffix="px"
          onChange={(value) => onUpdateShape({ strokeWidth: Number(value) })}
        />
      </PanelSection>
      )}
    </div>
  )
}
