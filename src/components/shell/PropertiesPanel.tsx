import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AnimatableProperty, EasingType } from '@/editor/types'
import {
  ANIMATABLE_PROPERTIES,
  EASING_OPTIONS,
  isColorProperty,
} from '@/editor/types'
import { useEditorStore, useSelectedLayer } from '@/editor/store'

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

function AnimationPropertyRow({
  property,
  displayValue,
  keyframeAtTime,
  onAddKeyframe,
  onSetEasing,
  easing,
}: {
  property: AnimatableProperty
  displayValue: ReactNode
  keyframeAtTime: boolean
  onAddKeyframe: () => void
  onSetEasing: (easing: EasingType) => void
  easing: EasingType
}) {
  return (
    <div className="space-y-2 rounded-md border border-border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium uppercase">{property}</p>
          <p className="text-xs text-muted-foreground">{displayValue}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onAddKeyframe}>
          Keyframe
        </Button>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Segment easing</Label>
        <select
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={easing}
          disabled={!keyframeAtTime}
          onChange={(event) => onSetEasing(event.target.value as EasingType)}
        >
          {EASING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function PropertiesPanel() {
  const selectedLayer = useSelectedLayer()
  const currentTime = useEditorStore((state) => state.currentTime)
  const recordMode = useEditorStore((state) => state.recordMode)
  const updateShape = useEditorStore((state) => state.updateShape)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const addKeyframeAtCurrentTime = useEditorStore((state) => state.addKeyframeAtCurrentTime)
  const setKeyframeEasing = useEditorStore((state) => state.setKeyframeEasing)

  if (!selectedLayer) {
    return (
      <aside className="glass-panel absolute inset-y-0 right-0 z-10 flex w-72 min-h-0 flex-col overflow-hidden border-l border-border/50">
        <div className="glass-panel-header shrink-0 border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Properties
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 text-sm text-muted-foreground">
          Select a layer to edit properties.
        </div>
      </aside>
    )
  }

  const { shape } = selectedLayer

  return (
    <aside className="glass-panel absolute inset-y-0 right-0 z-10 flex w-72 min-h-0 flex-col overflow-hidden border-l border-border/50">
      <div className="glass-panel-header shrink-0 border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Properties
      </div>
      <Tabs defaultValue="design" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-3 grid w-auto shrink-0 grid-cols-2">
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
        </TabsList>
        <ScrollArea className="panel-scroll">
          <TabsContent value="design" className="space-y-4 p-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Layer name</Label>
              <Input
                value={selectedLayer.name}
                onChange={(event) =>
                  updateLayer(selectedLayer.id, {
                    name: event.target.value,
                  })
                }
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="X"
                value={shape.x}
                onChange={(value) => updateShape(selectedLayer.id, { x: value })}
              />
              <NumberField
                label="Y"
                value={shape.y}
                onChange={(value) => updateShape(selectedLayer.id, { y: value })}
              />
            </div>
            <NumberField
              label="Rotation"
              value={shape.rotation}
              onChange={(value) => updateShape(selectedLayer.id, { rotation: value })}
            />
            {shape.type === 'rect' ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Width"
                  value={shape.width}
                  onChange={(value) => updateShape(selectedLayer.id, { width: value })}
                />
                <NumberField
                  label="Height"
                  value={shape.height}
                  onChange={(value) => updateShape(selectedLayer.id, { height: value })}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Radius X"
                  value={shape.rx}
                  onChange={(value) => updateShape(selectedLayer.id, { rx: value })}
                />
                <NumberField
                  label="Radius Y"
                  value={shape.ry}
                  onChange={(value) => updateShape(selectedLayer.id, { ry: value })}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Fill</Label>
                <Input
                  type="color"
                  value={shape.fill}
                  onChange={(event) =>
                    updateShape(selectedLayer.id, { fill: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Stroke</Label>
                <Input
                  type="color"
                  value={shape.stroke}
                  onChange={(event) =>
                    updateShape(selectedLayer.id, { stroke: event.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Stroke width"
                value={shape.strokeWidth}
                onChange={(value) => updateShape(selectedLayer.id, { strokeWidth: value })}
              />
              <NumberField
                label="Opacity"
                value={shape.opacity}
                onChange={(value) => updateShape(selectedLayer.id, { opacity: value })}
              />
            </div>
          </TabsContent>
          <TabsContent value="animation" className="space-y-3 p-3">
            <p className="text-sm text-muted-foreground">
              {recordMode
                ? 'Record mode is on — property edits at the current time create keyframes automatically.'
                : 'Record mode is off — scrub the timeline, adjust a value, then add a keyframe manually.'}
            </p>
            {ANIMATABLE_PROPERTIES.map((property) => {
              const keyframeAtTime = selectedLayer.keyframes.find(
                (keyframe) =>
                  keyframe.property === property &&
                  Math.abs(keyframe.time - currentTime) < 0.001,
              )
              const displayValue = isColorProperty(property)
                ? String(shape[property])
                : Number(shape[property]).toFixed(property === 'rotation' ? 1 : 2)

              return (
                <AnimationPropertyRow
                  key={property}
                  property={property}
                  displayValue={
                    isColorProperty(property) ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-block size-3 rounded-full border border-border"
                          style={{ backgroundColor: shape[property] }}
                        />
                        {displayValue}
                      </span>
                    ) : (
                      displayValue
                    )
                  }
                  keyframeAtTime={Boolean(keyframeAtTime)}
                  easing={keyframeAtTime?.easing ?? 'linear'}
                  onAddKeyframe={() => addKeyframeAtCurrentTime(property)}
                  onSetEasing={(easing) => setKeyframeEasing(property, easing)}
                />
              )
            })}
            <p className="text-xs text-muted-foreground">
              Drag keyframe dots on the timeline to retime animations.
            </p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}
