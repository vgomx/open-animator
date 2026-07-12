import { useRef } from 'react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PanelResizeHandle } from '@/components/shell/PanelResizeHandle'
import { GroupAnimationTab } from '@/components/shell/properties/GroupAnimationTab'
import { AnimationTab } from '@/components/shell/properties/AnimationTab'
import { DocumentTab } from '@/components/shell/properties/DocumentTab'
import { DesignTab } from '@/components/shell/properties/PropertyTabs'
import { getAnimatedShape } from '@/editor/animation'
import { getSelectedAnimatedShapes } from '@/editor/selection-utils'
import { useEditorStore, useActiveArtboard, useSelectedGroup, useSelectedLayer } from '@/editor/store'
import { cn } from '@/lib/utils'
import { Frame, Layers2, Sparkles } from 'lucide-react'

export function PropertiesPanel({ className }: { className?: string }) {
  const selectedLayer = useSelectedLayer()
  const selectedGroup = useSelectedGroup()
  const selectedGroupId = useEditorStore((state) => state.selectedGroupId)
  const layerGroups = useEditorStore((state) => state.project.layerGroups)
  const artboard = useActiveArtboard()
  const showPropertiesPanel = useEditorStore((state) => state.showPropertiesPanel)
  const propertiesPanelWidth = useEditorStore((state) => state.propertiesPanelWidth)
  const setPropertiesPanelWidth = useEditorStore((state) => state.setPropertiesPanelWidth)
  const selectedCount = useEditorStore((state) => state.selectedLayerIds.length)
  const scrubTime = useEditorStore((state) =>
    state.playbackState !== 'playing' ? state.currentTime : null,
  )
  const frozenTimeRef = useRef(useEditorStore.getState().currentTime)
  if (scrubTime !== null) {
    frozenTimeRef.current = scrubTime
  }
  const currentTime = frozenTimeRef.current
  const recordMode = useEditorStore((state) => state.recordMode)
  const updateSelectedShapes = useEditorStore((state) => state.updateSelectedShapes)
  const updateShape = useEditorStore((state) => state.updateShape)
  const layers = useEditorStore((state) => state.project.layers)
  const states = useEditorStore((state) => state.project.states)
  const fps = useEditorStore((state) => state.project.fps)
  const duration = useEditorStore((state) => state.project.duration)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const canvas = useEditorStore((state) => state.project.canvas)
  const updateArtboard = useEditorStore((state) => state.updateArtboard)
  const updateCanvas = useEditorStore((state) => state.updateCanvas)
  const updateProjectTiming = useEditorStore((state) => state.updateProjectTiming)
  const addKeyframeAtCurrentTime = useEditorStore((state) => state.addKeyframeAtCurrentTime)
  const setKeyframeEasing = useEditorStore((state) => state.setKeyframeEasing)
  const updateGroupTransform = useEditorStore((state) => state.updateGroupTransform)

  const documentPanel = (
    <DocumentTab
      canvas={canvas}
      artboard={artboard}
      fps={fps}
      duration={duration}
      layerCount={layers.length}
      stateCount={states.length}
      onUpdateCanvas={updateCanvas}
      onUpdateArtboard={(patch) => {
        if (activeArtboardId) {
          updateArtboard(activeArtboardId, patch)
        }
      }}
      onUpdateProjectTiming={updateProjectTiming}
    />
  )

  if (!showPropertiesPanel) {
    return null
  }

  if (!selectedLayer && !selectedGroup) {
    return (
      <aside
        style={{ width: propertiesPanelWidth }}
        className={cn(
          'glass-chrome absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-border text-card-foreground',
          className,
        )}
      >
        <PanelResizeHandle
          edge="left"
          getWidth={() => useEditorStore.getState().propertiesPanelWidth}
          onWidthChange={setPropertiesPanelWidth}
        />
        <div className="glass-panel-header shrink-0 border-b px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Frame className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Document
            </span>
          </div>
        </div>
        <ScrollArea className="panel-scroll">{documentPanel}</ScrollArea>
      </aside>
    )
  }

  if (selectedGroupId && selectedGroup) {
    return (
      <aside
        style={{ width: propertiesPanelWidth }}
        className={cn(
          'glass-chrome absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-border text-card-foreground',
          className,
        )}
      >
        <PanelResizeHandle
          edge="left"
          getWidth={() => useEditorStore.getState().propertiesPanelWidth}
          onWidthChange={setPropertiesPanelWidth}
        />
        <div className="glass-panel-header shrink-0 border-b px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Layers2 className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Group
            </span>
          </div>
        </div>
        <ScrollArea className="panel-scroll">
          <GroupAnimationTab
            groupId={selectedGroupId}
            group={selectedGroup}
            layerGroups={layerGroups}
            recordMode={recordMode}
            currentTime={currentTime}
            onAddKeyframe={addKeyframeAtCurrentTime}
            onSetEasing={setKeyframeEasing}
            onUpdateGroupTransform={(patch) => {
              if (selectedGroupId) {
                updateGroupTransform(selectedGroupId, patch)
              }
            }}
          />
        </ScrollArea>
      </aside>
    )
  }

  const shape = getAnimatedShape(selectedLayer!, currentTime)
  const selectedShapes = getSelectedAnimatedShapes(layers, selectedLayerIds, currentTime).map(
    (item) => item.shape,
  )

  const applyShapePatch = (patch: Partial<typeof shape>) => {
    if (selectedCount > 1) {
      updateSelectedShapes(patch)
      return
    }

    updateShape(selectedLayer!.id, patch)
  }

  return (
    <aside
      style={{ width: propertiesPanelWidth }}
      className={cn(
        'glass-chrome absolute inset-y-0 right-0 z-30 flex min-h-0 flex-col overflow-hidden border-l border-border text-card-foreground',
        className,
      )}
    >
      <PanelResizeHandle
        edge="left"
        getWidth={() => useEditorStore.getState().propertiesPanelWidth}
        onWidthChange={setPropertiesPanelWidth}
      />
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
        <TabsList className="mx-3 mt-3 grid w-auto shrink-0 grid-cols-3">
          <TabsTrigger value="document" className="gap-1.5 text-xs">
            <Frame className="size-3.5" />
            Document
          </TabsTrigger>
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
          <TabsContent value="document" className="mt-0">
            {documentPanel}
          </TabsContent>
          <TabsContent value="design" className="mt-0">
            <DesignTab
              selectedLayer={selectedLayer!}
              selectedCount={selectedCount}
              shapes={selectedShapes}
              onRename={(name) => updateLayer(selectedLayer!.id, { name })}
              onUpdateShape={applyShapePatch}
            />
          </TabsContent>
          <TabsContent value="animation" className="mt-0">
            <AnimationTab
              selectedLayer={selectedLayer!}
              selectedCount={selectedCount}
              shape={shape}
              recordMode={recordMode}
              currentTime={currentTime}
              onAddKeyframe={addKeyframeAtCurrentTime}
              onSetEasing={setKeyframeEasing}
              onUpdateShape={(patch) => updateShape(selectedLayer!.id, patch)}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  )
}
