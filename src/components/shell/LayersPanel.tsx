import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

export function LayersPanel() {
  const layers = useEditorStore((state) => state.project.layers)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const setSelectedLayerId = useEditorStore((state) => state.setSelectedLayerId)
  const updateLayer = useEditorStore((state) => state.updateLayer)

  return (
    <aside className="glass-panel absolute inset-y-0 left-0 z-10 flex w-56 shrink-0 flex-col border-r border-border/50">
      <div className="glass-panel-header border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Layers
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {layers.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Add a shape to get started.
            </p>
          ) : (
            layers.map((layer) => {
              const isSelected = layer.id === selectedLayerId

              return (
                <div
                  key={layer.id}
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-2 py-1.5',
                    isSelected
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-transparent hover:bg-muted/50',
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-sm"
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    {layer.name}
                  </button>
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
