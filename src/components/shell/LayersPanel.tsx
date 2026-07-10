import { useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Group,
  Lock,
  Timer,
  Unlock,
  Ungroup,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEditorStore } from '@/editor/store'
import type { Layer } from '@/editor/types'
import { cn } from '@/lib/utils'

type LayerRow = {
  kind: 'group'
  groupId: string
  layers: Layer[]
} | {
  kind: 'layer'
  layer: Layer
}

export function LayersPanel() {
  const showLayersPanel = useEditorStore((state) => state.showLayersPanel)
  const layers = useEditorStore((state) => state.project.layers)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const collapsedGroupIds = useEditorStore((state) => state.collapsedGroupIds)
  const selectLayer = useEditorStore((state) => state.selectLayer)
  const updateLayer = useEditorStore((state) => state.updateLayer)
  const reorderLayers = useEditorStore((state) => state.reorderLayers)
  const groupSelectedLayers = useEditorStore((state) => state.groupSelectedLayers)
  const ungroupSelectedLayers = useEditorStore((state) => state.ungroupSelectedLayers)
  const staggerSelectedLayers = useEditorStore((state) => state.staggerSelectedLayers)
  const toggleGroupCollapsed = useEditorStore((state) => state.toggleGroupCollapsed)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const displayLayers = [...layers].reverse()
  const canGroupOrStagger = selectedLayerIds.length >= 2
  const canUngroup = selectedLayerIds.some((id) => {
    const layer = layers.find((item) => item.id === id)
    return Boolean(layer?.groupId)
  })

  const rows = useMemo(() => {
    const result: LayerRow[] = []
    const seenGroups = new Set<string>()

    for (const layer of displayLayers) {
      if (!layer.groupId) {
        result.push({ kind: 'layer', layer })
        continue
      }

      if (seenGroups.has(layer.groupId)) {
        continue
      }

      seenGroups.add(layer.groupId)
      const groupLayers = displayLayers.filter((item) => item.groupId === layer.groupId)
      result.push({ kind: 'group', groupId: layer.groupId, layers: groupLayers })
    }

    return result
  }, [displayLayers])

  const flatLayers = useMemo(() => {
    const flat: Layer[] = []
    for (const row of rows) {
      if (row.kind === 'layer') {
        flat.push(row.layer)
        continue
      }

      if (!collapsedGroupIds.includes(row.groupId)) {
        flat.push(...row.layers)
      }
    }
    return flat
  }, [collapsedGroupIds, rows])

  const toActualIndex = (layerId: string) => layers.findIndex((item) => item.id === layerId)

  if (!showLayersPanel) {
    return null
  }

  const renderLayerRow = (layer: Layer, indented = false) => {
    const isSelected = selectedLayerIds.includes(layer.id)
    const displayIndex = flatLayers.findIndex((item) => item.id === layer.id)
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

          const fromLayer = flatLayers[dragIndex]
          const toLayer = flatLayers[displayIndex]
          if (!fromLayer || !toLayer) {
            setDragIndex(null)
            return
          }

          reorderLayers(toActualIndex(fromLayer.id), toActualIndex(toLayer.id))
          setDragIndex(null)
        }}
        className={cn(
          'flex items-center gap-1 rounded-md border px-1.5 py-1.5',
          indented ? 'ml-5' : '',
          isSelected ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted/50',
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                updateLayer(layer.id, {
                  locked: !layer.locked,
                })
              }
            >
              {layer.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {layer.locked ? 'Unlock layer' : 'Lock layer'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() =>
                updateLayer(layer.id, {
                  visible: !layer.visible,
                })
              }
            >
              {layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {layer.visible ? 'Hide layer' : 'Show layer'}
          </TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <aside className="glass-chrome absolute inset-y-0 left-0 z-30 flex w-56 min-h-0 flex-col overflow-hidden border-r border-border/50">
      <div className="glass-panel-header shrink-0 border-b px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Layers</span>
          <div className="flex gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={!canGroupOrStagger}
                  onClick={() => groupSelectedLayers()}
                >
                  <Group className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Group selected layers</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={!canUngroup}
                  onClick={() => ungroupSelectedLayers()}
                >
                  <Ungroup className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Ungroup selected layers</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={!canGroupOrStagger}
                  onClick={() => staggerSelectedLayers(0.1)}
                >
                  <Timer className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Stagger animation by 0.1s per layer</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <ScrollArea className="panel-scroll">
        <div className="space-y-1 p-2">
          {rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Add a shape to get started.
            </p>
          ) : (
            rows.map((row) => {
              if (row.kind === 'layer') {
                return renderLayerRow(row.layer)
              }

              const collapsed = collapsedGroupIds.includes(row.groupId)
              const groupSelected = row.layers.some((layer) => selectedLayerIds.includes(layer.id))

              return (
                <div key={row.groupId} className="space-y-1">
                  <div
                    className={cn(
                      'flex items-center gap-1 rounded-md border px-1.5 py-1.5',
                      groupSelected
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-transparent hover:bg-muted/40',
                    )}
                  >
                    <button
                      type="button"
                      className="flex size-5 items-center justify-center text-muted-foreground"
                      aria-label={collapsed ? 'Expand group' : 'Collapse group'}
                      onClick={() => toggleGroupCollapsed(row.groupId)}
                    >
                      {collapsed ? (
                        <ChevronRight className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </button>
                    <Group className="size-3.5 shrink-0 text-muted-foreground" />
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm text-muted-foreground"
                      onClick={() => selectLayer(row.layers[0]!.id)}
                    >
                      Group · {row.layers.length}
                    </button>
                  </div>
                  {collapsed
                    ? null
                    : row.layers.map((layer) => renderLayerRow(layer, true))}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
