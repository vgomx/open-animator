import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AnimatableProperty } from '@/editor/types'
import { useEditorStore, useSelectedLayer } from '@/editor/store'

const animatableProperties: AnimatableProperty[] = ['x', 'y', 'opacity', 'scale']

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

export function PropertiesPanel() {
  const selectedLayer = useSelectedLayer()
  const updateShape = useEditorStore((state) => state.updateShape)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const addKeyframeAtCurrentTime = useEditorStore((state) => state.addKeyframeAtCurrentTime)

  if (!selectedLayer) {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-card">
        <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Properties
        </div>
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          Select a layer to edit properties.
        </div>
      </aside>
    )
  }

  const { shape } = selectedLayer

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Properties
      </div>
      <Tabs defaultValue="design" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid w-auto grid-cols-2">
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="animation">Animation</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1">
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
              Scrub the timeline, adjust a value, then add a keyframe at the current time.
            </p>
            {animatableProperties.map((property) => (
              <div
                key={property}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium uppercase">{property}</p>
                  <p className="text-xs text-muted-foreground">
                    {shape[property].toFixed(2)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addKeyframeAtCurrentTime(property)}
                >
                  Keyframe
                </Button>
              </div>
            ))}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}
