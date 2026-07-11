import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnimationTab } from '@/components/shell/properties/AnimationTab'
import { DocumentTab } from '@/components/shell/properties/DocumentTab'
import { DesignTab } from '@/components/shell/properties/PropertyTabs'
import { getAnimatedShape } from '@/editor/animation'
import { getSelectedAnimatedShapes } from '@/editor/selection-utils'
import { useEditorStore, useSelectedLayer } from '@/editor/store'
import { Frame, Layers2, Sparkles } from 'lucide-react'

export function PropertiesPanel() {
  const selectedLayer = useSelectedLayer()
  const showPropertiesPanel = useEditorStore((state) => state.showPropertiesPanel)
  const selectedCount = useEditorStore((state) => state.selectedLayerIds.length)
  const currentTime = useEditorStore((state) => state.currentTime)
  const recordMode = useEditorStore((state) => state.recordMode)
  const updateSelectedShapes = useEditorStore((state) => state.updateSelectedShapes)
  const updateShape = useEditorStore((state) => state.updateShape)
  const layers = useEditorStore((state) => state.project.layers)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const artboard = useEditorStore((state) => state.project.artboard)
  const canvas = useEditorStore((state) => state.project.canvas)
  const updateArtboard = useEditorStore((state) => state.updateArtboard)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const addKeyframeAtCurrentTime = useEditorStore((state) => state.addKeyframeAtCurrentTime)
  const setKeyframeEasing = useEditorStore((state) => state.setKeyframeEasing)

  if (!showPropertiesPanel) {
    return null
  }

  if (!selectedLayer) {
    return (
      <aside className="glass-chrome absolute inset-y-0 right-0 z-30 flex w-72 min-h-0 flex-col overflow-hidden border-l border-border text-card-foreground">
        <div className="glass-panel-header shrink-0 border-b px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Frame className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Document
            </span>
          </div>
        </div>
        <ScrollArea className="panel-scroll">
          <DocumentTab
            canvas={canvas}
            artboard={artboard}
            onUpdateCanvas={updateCanvas}
            onUpdateArtboard={updateArtboard}
          />
        </ScrollArea>
      </aside>
    )
  }

  const shape = getAnimatedShape(selectedLayer, currentTime)
  const selectedShapes = getSelectedAnimatedShapes(layers, selectedLayerIds, currentTime).map(
    (item) => item.shape,
  )

  const applyShapePatch = (patch: Partial<typeof shape>) => {
    if (selectedCount > 1) {
      updateSelectedShapes(patch)
      return
    }

    updateShape(selectedLayer.id, patch)
  }

  return (
    <aside className="glass-chrome absolute inset-y-0 right-0 z-30 flex w-72 min-h-0 flex-col overflow-hidden border-l border-border text-card-foreground">
      <div className="glass-panel-header shrink-0 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Layers2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Properties
            {selectedCount > 1 ? ` · ${selectedCount} selected` : ''}
          </span>
        </div>
      </div>

      <Tabs defaultValue="design" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-3 grid w-auto shrink-0 grid-cols-2">
          <TabsTrigger value="design" className="gap-1.5 text-xs">
            <Layers2 className="size-3.5" />
            Design
          </TabsTrigger>
          <TabsTrigger value="animation" className="gap-1.5 text-xs">
            <Sparkles className="size-3.5" />
            Animate
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="panel-scroll">
          <TabsContent value="design" className="mt-0">
            <DesignTab
              selectedLayer={selectedLayer}
              selectedCount={selectedCount}
              shapes={selectedShapes}
              onRename={(name) => updateLayer(selectedLayer.id, { name })}
              onUpdateShape={applyShapePatch}
            />
          </TabsContent>
          <TabsContent value="animation" className="mt-0">
            <AnimationTab
              selectedLayer={selectedLayer}
              selectedCount={selectedCount}
              shape={shape}
              recordMode={recordMode}
              currentTime={currentTime}
              onAddKeyframe={addKeyframeAtCurrentTime}
              onSetEasing={setKeyframeEasing}
              onUpdateShape={(patch) => updateShape(selectedLayer.id, patch)}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}
