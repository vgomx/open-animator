import { AlignSection } from '@/components/shell/properties/AlignSection'
import { ColorField } from '@/components/shell/properties/ColorField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import { PropertyField, PropertyGrid } from '@/components/shell/properties/PropertyField'
import { Input } from '@/components/ui/input'
import { getSharedNumericValue, getSharedShapeValue } from '@/editor/selection-utils'
import type { Layer, Shape } from '@/editor/types'
import { Layers2, Move, Paintbrush, PenLine } from 'lucide-react'

type DesignTabProps = {
  selectedLayer: Layer
  selectedCount: number
  shapes: Shape[]
  onRename: (name: string) => void
  onUpdateShape: (patch: Partial<Shape>) => void
}

function sharedNumber(
  shapes: Shape[],
  property: string,
  fallback = 0,
): { value: number; mixed: boolean } {
  const result = getSharedNumericValue(shapes, property)
  return {
    value: result.mixed ? fallback : result.value,
    mixed: result.mixed,
  }
}

function sharedString(
  shapes: Shape[],
  property: keyof Shape,
  fallback = '',
): { value: string; mixed: boolean } {
  const shared = getSharedShapeValue(shapes, property)
  return {
    value: typeof shared === 'string' ? shared : fallback,
    mixed: shared === null,
  }
}

export function DesignTab({
  selectedLayer,
  selectedCount,
  shapes,
  onRename,
  onUpdateShape,
}: DesignTabProps) {
  const shape = shapes[0]!
  const multi = selectedCount > 1
  const allText = shapes.every((item) => item.type === 'text')
  const allRect = shapes.every((item) => item.type === 'rect')
  const allEllipse = shapes.every((item) => item.type === 'ellipse')
  const allPath = shapes.every((item) => item.type === 'path')
  const hasStroke = shapes.every((item) => item.type !== 'text')

  const xField = sharedNumber(shapes, 'x')
  const yField = sharedNumber(shapes, 'y')
  const rotationField = sharedNumber(shapes, 'rotation')
  const scaleXField = sharedNumber(shapes, 'scaleX')
  const scaleYField = sharedNumber(shapes, 'scaleY')
  const opacityField = sharedNumber(shapes, 'opacity', 1)
  const fillField = sharedString(shapes, 'fill')
  const strokeField = sharedString(shapes, 'stroke', 'none')
  const strokeWidthField = sharedNumber(shapes, 'strokeWidth', 0)

  return (
    <div className="pb-3">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted/40">
            <Layers2 className="size-3.5 text-muted-foreground" />
          </div>
          {multi ? (
            <p className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-muted-foreground">
              {selectedCount} layers selected
            </p>
          ) : (
            <Input
              value={selectedLayer.name}
              className="h-8 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-input"
              onChange={(event) => onRename(event.target.value)}
            />
          )}
        </div>
      </div>

      <PanelSection title="Transform" icon={Move}>
        <PropertyGrid>
          <PropertyField
            label="X"
            value={xField.value}
            mixed={xField.mixed}
            suffix="px"
            onChange={(value) => onUpdateShape({ x: Number(value) })}
          />
          <PropertyField
            label="Y"
            value={yField.value}
            mixed={yField.mixed}
            suffix="px"
            onChange={(value) => onUpdateShape({ y: Number(value) })}
          />
          {allRect ? (
            <>
              <PropertyField
                label="W"
                value={sharedNumber(shapes, 'width').value}
                mixed={sharedNumber(shapes, 'width').mixed}
                suffix="px"
                onChange={(value) => onUpdateShape({ width: Number(value) })}
              />
              <PropertyField
                label="H"
                value={sharedNumber(shapes, 'height').value}
                mixed={sharedNumber(shapes, 'height').mixed}
                suffix="px"
                onChange={(value) => onUpdateShape({ height: Number(value) })}
              />
            </>
          ) : allText ? (
            <PropertyField
              label="Size"
              value={sharedNumber(shapes, 'fontSize').value}
              mixed={sharedNumber(shapes, 'fontSize').mixed}
              suffix="px"
              onChange={(value) => onUpdateShape({ fontSize: Number(value) })}
            />
          ) : allEllipse ? (
            <>
              <PropertyField
                label="RX"
                value={sharedNumber(shapes, 'rx').value}
                mixed={sharedNumber(shapes, 'rx').mixed}
                suffix="px"
                onChange={(value) => onUpdateShape({ rx: Number(value) })}
              />
              <PropertyField
                label="RY"
                value={sharedNumber(shapes, 'ry').value}
                mixed={sharedNumber(shapes, 'ry').mixed}
                suffix="px"
                onChange={(value) => onUpdateShape({ ry: Number(value) })}
              />
            </>
          ) : allPath ? (
            <PropertyField
              label="Points"
              value={shape.type === 'path' ? shape.points.length : 0}
              disabled
              onChange={() => undefined}
            />
          ) : null}
        </PropertyGrid>
        <PropertyGrid>
          <PropertyField
            label="Scale X"
            value={scaleXField.value}
            mixed={scaleXField.mixed}
            decimals={2}
            step={0.01}
            shiftStep={0.1}
            min={0.01}
            onChange={(value) => onUpdateShape({ scaleX: Number(value) })}
          />
          <PropertyField
            label="Scale Y"
            value={scaleYField.value}
            mixed={scaleYField.mixed}
            decimals={2}
            step={0.01}
            shiftStep={0.1}
            min={0.01}
            onChange={(value) => onUpdateShape({ scaleY: Number(value) })}
          />
        </PropertyGrid>
        <PropertyGrid columns={3}>
          <PropertyField
            label="Rotation"
            value={rotationField.value}
            mixed={rotationField.mixed}
            suffix="°"
            decimals={1}
            step={1}
            shiftStep={15}
            onChange={(value) => onUpdateShape({ rotation: Number(value) })}
          />
          <PropertyField
            label="Opacity"
            value={Math.round(opacityField.value * 100)}
            mixed={opacityField.mixed}
            suffix="%"
            min={0}
            max={100}
            step={1}
            shiftStep={10}
            onChange={(value) => onUpdateShape({ opacity: Number(value) / 100 })}
          />
        </PropertyGrid>
      </PanelSection>

      <AlignSection />

      <PanelSection title="Fill" icon={Paintbrush}>
        {allText && !multi ? (
          <PropertyField
            label="Text"
            value={shape.type === 'text' ? shape.text : ''}
            onChange={(value) => onUpdateShape({ text: String(value) })}
          />
        ) : null}
        <ColorField
          label="Color"
          value={fillField.value}
          mixed={fillField.mixed}
          onChange={(value) => onUpdateShape({ fill: value })}
        />
      </PanelSection>

      {hasStroke ? (
        <PanelSection title="Stroke" icon={PenLine} className="border-b-0">
          <ColorField
            label="Color"
            value={strokeField.value}
            mixed={strokeField.mixed}
            allowNone
            onChange={(value) => onUpdateShape({ stroke: value })}
          />
          <PropertyField
            label="Width"
            value={strokeWidthField.value}
            mixed={strokeWidthField.mixed}
            suffix="px"
            onChange={(value) => onUpdateShape({ strokeWidth: Number(value) })}
          />
        </PanelSection>
      ) : null}
    </div>
  )
}
