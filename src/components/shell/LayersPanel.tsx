import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

type LayerDragState = {
  sourceIndex: number
  overIndex: number
  layerId: string
  rowHeight: number
}

const LAYER_ROW_GAP = 4
const DEFAULT_ROW_STEP = 40

const DROP_SETTLE_MS = 220
const DROP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Flat index where the drop gap is inserted (placeholder renders before this layer). */
function getPlaceholderBeforeIndex(drag: LayerDragState, length: number): number | null {
  if (drag.sourceIndex === drag.overIndex) {
    return null
  }

  if (drag.sourceIndex < drag.overIndex) {
    const next = drag.overIndex + 1
    return next >= length ? length : next
  }

  return drag.overIndex
}

function getDropIndexFromMarkers(list: HTMLElement, clientY: number, fallback: number): number {
  const markers = Array.from(
    list.querySelectorAll<HTMLElement>('[data-drop-marker]'),
  )

  if (markers.length === 0) {
    return fallback
  }

  for (const marker of markers) {
    const rect = marker.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    if (clientY < midpoint) {
      const target = Number(marker.dataset.dropTarget)
      return Number.isFinite(target) ? target : fallback
    }
  }

  const lastTarget = Number(markers[markers.length - 1]?.dataset.dropTarget)
  return Number.isFinite(lastTarget) ? lastTarget : fallback
}

function mountFloatingPreview(
  rowElement: HTMLDivElement,
  layerName: string,
  isSelected: boolean,
): HTMLDivElement {
  const rect = rowElement.getBoundingClientRect()
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--card').trim()

  const preview = document.createElement('div')
  preview.setAttribute('data-layer-drag-preview', 'true')
  preview.className = cn(
    'layer-panel-drag-preview flex items-center gap-1 rounded-md border px-1.5 py-1.5 shadow-lg',
    isSelected ? 'border-primary/40' : 'border-border',
  )
  preview.style.position = 'fixed'
  preview.style.left = `${rect.left}px`
  preview.style.top = `${rect.top}px`
  preview.style.width = `${rect.width}px`
  preview.style.height = `${rect.height}px`
  preview.style.margin = '0'
  preview.style.pointerEvents = 'none'
  preview.style.zIndex = '10000'
  preview.style.boxSizing = 'border-box'
  preview.style.backgroundColor = surface || '#141312'
  preview.style.boxShadow = '0 10px 28px rgb(0 0 0 / 0.28)'

  const grip = document.createElement('span')
  grip.className = 'text-muted-foreground'
  grip.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>'

  const label = document.createElement('span')
  label.className = 'min-w-0 flex-1 truncate text-sm'
  label.textContent = layerName

  preview.append(grip, label)
  document.body.appendChild(preview)
  return preview
}

function moveFloatingPreview(preview: HTMLDivElement, clientY: number, offsetY: number) {
  preview.style.transition = 'none'
  preview.style.top = `${clientY - offsetY}px`
}

function animateFloatingPreviewTo(
  preview: HTMLDivElement,
  target: DOMRect,
  onComplete: () => void,
) {
  let completed = false
  const finish = () => {
    if (completed) {
      return
    }
    completed = true
    preview.removeEventListener('transitionend', handleTransitionEnd)
    onComplete()
  }

  const handleTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== preview || event.propertyName !== 'top') {
      return
    }
    finish()
  }

  preview.style.transition = `top ${DROP_SETTLE_MS}ms ${DROP_EASING}, left ${DROP_SETTLE_MS}ms ${DROP_EASING}, width ${DROP_SETTLE_MS}ms ${DROP_EASING}, height ${DROP_SETTLE_MS}ms ${DROP_EASING}, box-shadow ${DROP_SETTLE_MS}ms ${DROP_EASING}`
  preview.style.top = `${target.top}px`
  preview.style.left = `${target.left}px`
  preview.style.width = `${target.width}px`
  preview.style.height = `${target.height}px`
  preview.style.boxShadow = '0 2px 8px rgb(0 0 0 / 0.12)'

  preview.addEventListener('transitionend', handleTransitionEnd)
  window.setTimeout(finish, DROP_SETTLE_MS + 40)
}

type LayerDropPlaceholderProps = {
  height: number
  dropTarget: number
  indented?: boolean
}

function LayerDropPlaceholder({ height, dropTarget, indented = false }: LayerDropPlaceholderProps) {
  return (
    <div
      data-drop-marker
      data-layer-drop-slot
      data-drop-target={dropTarget}
      className={cn(
        'layer-panel-placeholder rounded-md border border-dashed border-primary/45 bg-primary/8',
        indented ? 'ml-5' : '',
      )}
      style={{ height }}
      aria-hidden
    />
  )
}

type LayerListRowProps = {
  layer: Layer
  flatIndex: number
  indented?: boolean
  isSelected: boolean
  isDraggingList: boolean
  onSelect: (layerId: string, additive: boolean) => void
  onToggleLock: (layerId: string, locked: boolean) => void
  onToggleVisible: (layerId: string, visible: boolean) => void
  onGripPointerDown: (
    flatIndex: number,
    rowElement: HTMLDivElement,
    event: React.PointerEvent<HTMLDivElement>,
  ) => void
  onMeasureRow?: (node: HTMLDivElement | null) => void
}

function LayerListRow({
  layer,
  flatIndex,
  indented = false,
  isSelected,
  isDraggingList,
  onSelect,
  onToggleLock,
  onToggleVisible,
  onGripPointerDown,
  onMeasureRow,
}: LayerListRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={(node) => {
        rowRef.current = node
        onMeasureRow?.(node)
      }}
      data-drop-marker
      data-drop-target={flatIndex}
      className={cn(
        'layer-panel-row relative flex items-center gap-1 rounded-md border px-1.5 py-1.5',
        indented ? 'ml-5' : '',
        isSelected ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted/50',
        isDraggingList && 'opacity-55',
      )}
    >
      <div
        role="button"
        tabIndex={-1}
        aria-label="Drag to reorder"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.button !== 0 || !rowRef.current) {
            return
          }

          event.preventDefault()
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          onGripPointerDown(flatIndex, rowRef.current, event)
        }}
      >
        <GripVertical className="size-3.5" />
      </div>
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left text-sm"
        onClick={(event) =>
          onSelect(layer.id, event.shiftKey || event.metaKey || event.ctrlKey)
        }
      >
        {layer.name}
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onToggleLock(layer.id, layer.locked)}
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
            onClick={() => onToggleVisible(layer.id, layer.visible)}
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
  const [drag, setDrag] = useState<LayerDragState | null>(null)
  const [isSettling, setIsSettling] = useState(false)
  const [rowStep, setRowStep] = useState(DEFAULT_ROW_STEP)
  const rowStepRef = useRef(DEFAULT_ROW_STEP)
  const dragRef = useRef<LayerDragState | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const floatingPreviewRef = useRef<HTMLDivElement | null>(null)
  const pointerOffsetYRef = useRef(0)
  const dragStartRectRef = useRef<DOMRect | null>(null)
  const isSettlingRef = useRef(false)

  const setDragState = (next: LayerDragState | null) => {
    dragRef.current = next
    setDrag(next)
  }

  const removeFloatingPreview = () => {
    floatingPreviewRef.current?.remove()
    floatingPreviewRef.current = null
    document.querySelectorAll('[data-layer-drag-preview]').forEach((node) => node.remove())
    document.body.classList.remove('cursor-grabbing')
  }

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

  const flatLayersRef = useRef(flatLayers)
  useLayoutEffect(() => {
    flatLayersRef.current = flatLayers
  }, [flatLayers])

  useLayoutEffect(() => {
    rowStepRef.current = rowStep
  }, [rowStep])

  const measureRow = (node: HTMLDivElement | null) => {
    if (!node || dragRef.current) {
      return
    }

    const nextStep = node.offsetHeight + LAYER_ROW_GAP
    if (Math.abs(nextStep - rowStepRef.current) > 0.5) {
      rowStepRef.current = nextStep
      setRowStep(nextStep)
    }
  }

  const placeholderBeforeIndex = drag
    ? getPlaceholderBeforeIndex(drag, flatLayers.length)
    : null

  const commitReorder = (current: LayerDragState, overIndex: number) => {
    if (current.sourceIndex === overIndex) {
      return
    }

    const flat = flatLayersRef.current
    const fromLayer = flat[current.sourceIndex]
    const toLayer = flat[overIndex]
    if (!fromLayer || !toLayer) {
      return
    }

    const projectLayers = useEditorStore.getState().project.layers
    const fromIndex = projectLayers.findIndex((item) => item.id === fromLayer.id)
    const toIndex = projectLayers.findIndex((item) => item.id === toLayer.id)
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderLayers(fromIndex, toIndex)
    }
  }

  const clearDrag = () => {
    setDragState(null)
    removeFloatingPreview()
    dragStartRectRef.current = null
    isSettlingRef.current = false
    setIsSettling(false)
  }

  const settlePreview = (targetRect: DOMRect, current: LayerDragState, overIndex: number) => {
    const preview = floatingPreviewRef.current
    if (!preview) {
      commitReorder(current, overIndex)
      clearDrag()
      return
    }

    isSettlingRef.current = true
    setIsSettling(true)
    setDragState({ ...current, overIndex })

    animateFloatingPreviewTo(preview, targetRect, () => {
      commitReorder(current, overIndex)
      clearDrag()
    })
  }

  const finishDrag = (clientY: number) => {
    const current = dragRef.current
    const list = listRef.current
    const preview = floatingPreviewRef.current
    if (!current || !list || isSettlingRef.current) {
      return
    }

    const overIndex = getDropIndexFromMarkers(list, clientY, current.overIndex)
    const finalDrag = { ...current, overIndex }

    if (finalDrag.sourceIndex === overIndex) {
      const homeRect = dragStartRectRef.current
      if (preview && homeRect) {
        settlePreview(homeRect, finalDrag, overIndex)
        return
      }
      clearDrag()
      return
    }

    setDragState(finalDrag)

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const slot = list.querySelector<HTMLElement>('[data-layer-drop-slot]')
        if (preview && slot) {
          settlePreview(slot.getBoundingClientRect(), finalDrag, overIndex)
          return
        }

        commitReorder(finalDrag, overIndex)
        clearDrag()
      })
    })
  }

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const current = dragRef.current
      const list = listRef.current
      const preview = floatingPreviewRef.current
      if (!current || !list || isSettlingRef.current) {
        return
      }

      if (preview) {
        moveFloatingPreview(preview, event.clientY, pointerOffsetYRef.current)
      }

      const nextIndex = getDropIndexFromMarkers(list, event.clientY, current.overIndex)
      if (nextIndex !== current.overIndex) {
        setDragState({ ...current, overIndex: nextIndex })
      }
    }

    const onPointerFinish = (event: PointerEvent) => {
      if (!dragRef.current) {
        return
      }

      finishDrag(event.clientY)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerFinish)
    window.addEventListener('pointercancel', onPointerFinish)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerFinish)
      window.removeEventListener('pointercancel', onPointerFinish)
      removeFloatingPreview()
    }
  }, [reorderLayers])

  const beginPointerDrag = (
    flatIndex: number,
    rowElement: HTMLDivElement,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const layer = flatLayers[flatIndex]
    if (!layer) {
      return
    }

    removeFloatingPreview()

    const rect = rowElement.getBoundingClientRect()
    const rowHeight = rowElement.offsetHeight
    dragStartRectRef.current = rect
    rowStepRef.current = rowHeight + LAYER_ROW_GAP
    setRowStep(rowStepRef.current)
    pointerOffsetYRef.current = event.clientY - rect.top
    floatingPreviewRef.current = mountFloatingPreview(
      rowElement,
      layer.name,
      selectedLayerIds.includes(layer.id),
    )
    document.body.classList.add('cursor-grabbing')

    setDragState({
      sourceIndex: flatIndex,
      overIndex: flatIndex,
      layerId: layer.id,
      rowHeight,
    })
  }

  const renderDropPlaceholder = (flatIndex: number, indented = false) => {
    if (!drag || placeholderBeforeIndex !== flatIndex) {
      return null
    }

    return (
      <LayerDropPlaceholder
        key={`placeholder-before-${flatIndex}`}
        height={drag.rowHeight}
        dropTarget={drag.overIndex}
        indented={indented}
      />
    )
  }

  const renderLayerRow = (layer: Layer, flatIndex: number, indented = false) => {
    if (drag?.sourceIndex === flatIndex) {
      return (
        <Fragment key={`${layer.id}-drag-source`}>
          {renderDropPlaceholder(flatIndex, indented)}
        </Fragment>
      )
    }

    return (
      <Fragment key={layer.id}>
        {renderDropPlaceholder(flatIndex, indented)}
        <LayerListRow
          layer={layer}
          flatIndex={flatIndex}
          indented={indented}
          isSelected={selectedLayerIds.includes(layer.id)}
          isDraggingList={drag !== null && !isSettling}
          onSelect={(layerId, additive) => selectLayer(layerId, { additive })}
          onToggleLock={(layerId, locked) => updateLayer(layerId, { locked: !locked })}
          onToggleVisible={(layerId, visible) => updateLayer(layerId, { visible: !visible })}
          onGripPointerDown={beginPointerDrag}
          onMeasureRow={measureRow}
        />
      </Fragment>
    )
  }

  if (!showLayersPanel) {
    return null
  }

  return (
    <aside className="glass-chrome absolute inset-y-0 left-0 z-30 flex w-56 min-h-0 flex-col overflow-hidden border-r border-border text-card-foreground">
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
        <div
          ref={listRef}
          className={cn('space-y-1 p-2', (drag || isSettling) && 'layers-panel-dragging select-none')}
        >
          {rows.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Add a shape to get started.
            </p>
          ) : (
            <>
              {rows.map((row) => {
                if (row.kind === 'layer') {
                  const flatIndex = flatLayers.findIndex((item) => item.id === row.layer.id)
                  return renderLayerRow(row.layer, flatIndex)
                }

                const collapsed = collapsedGroupIds.includes(row.groupId)
                const groupSelected = row.layers.some((layer) =>
                  selectedLayerIds.includes(layer.id),
                )

                return (
                  <div key={row.groupId} className="space-y-1">
                    <div
                      className={cn(
                        'flex items-center gap-1 rounded-md border px-1.5 py-1.5 transition-colors duration-200',
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
                      : row.layers.map((layer) => {
                          const flatIndex = flatLayers.findIndex((item) => item.id === layer.id)
                          return renderLayerRow(layer, flatIndex, true)
                        })}
                  </div>
                )
              })}
              {drag && placeholderBeforeIndex === flatLayers.length ? (
                <LayerDropPlaceholder
                  height={drag.rowHeight}
                  dropTarget={drag.overIndex}
                />
              ) : null}
            </>
          )}
        </div>
      </ScrollArea>
    </aside>
  )
}
