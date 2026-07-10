import { useState } from 'react'
import { Eye, EyeOff, GripVertical, Lock, Unlock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

export function LayersPanel() {
  const layers = useEditorStore((state) => state.project.layers)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const reorderLayers = useEditorStore((state) => state.reorderLayers)
  const groupSelectedLayers = useEditorStore((state) => state.groupSelectedLayers)
  const ungroupSelectedLayers = useEditorStore((state) => state.ungroupSelectedLayers)
  const staggerSelectedLayers = useEditorStore((state) => state.staggerSelectedLayers)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const displayLayers = [...layers].reverse()

  const toActualIndex = (displayIndex: number) => layers.length - 1 - displayIndex

  return (
    <aside className="glass-panel absolute inset-y-0 left-0 z-10 flex w-56 min-h-0 flex-col overflow-hidden border-r border-border/50">
      <div className="glass-panel-header shrink-0 border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Layers</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-xs" title="Group" onClick={() => groupSelectedLayers()}>
              G
            </Button>
            <Button variant="ghost" size="icon-xs" title="Ungroup" onClick={() => ungroupSelectedLayers()}>
              U
            </Button>
            <Button variant="ghost" size="icon-xs" title="Stagger 0.1s" onClick={() => staggerSelectedLayers(0.1)}>
              S
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="panel-scroll">
        <div className="space-y-1 p-2">
          {displayLayers.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Add a shape to get started.
            </p>
          ) : (
            displayLayers.map((layer, displayIndex) => {
              const isSelected = selectedLayerIds.includes(layer.id)
              const isDragging = dragIndex === displayIndex

              return (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={() => setDragIndex(displayIndex)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    if (dragIndex === null || dragIndex === displayIndex) {
                      setDragIndex(null)
                      return
                    }

                    reorderLayers(toActualIndex(dragIndex), toActualIndex(displayIndex))
                    setDragIndex(null)
                  }}
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-1.5 py-1.5',
                    layer.groupId ? 'ml-3' : '',
                    isSelected
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:bg-muted/50',
                    isDragging && 'opacity-50',
                  )}
                >
                  <button
                    type="button"
                    aria-label="Drag to reorder"
                    className="cursor-grab text-muted-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm"
                    onClick={(event) =>
                      selectLayer(layer.id, {
                        additive: event.shiftKey || event.metaKey || event.ctrlKey,
                      })
                    }
                  >
                    {layer.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      updateLayer(layer.id, {
                        locked: !layer.locked,
                      })
                    }
                  >
                    {layer.locked ? <Lock /> : <Unlock />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      updateLayer(layer.id, {
                        visible: !layer.visible,
                      })
                    }
                  >
                    {layer.visible ? <Eye /> : <EyeOff />}
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
