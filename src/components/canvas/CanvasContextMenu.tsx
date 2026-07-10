import type { ReactNode } from 'react'
import {
  Copy,
  Expand,
  Group,
  Pause,
  Play,
  Redo2,
  Timer,
  Trash2,
  Undo2,
  Ungroup,
  ZoomIn,
} from 'lucide-react'

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { EDITOR_TOOLS } from '@/editor/tools'
import { useEditorStore } from '@/editor/store'
import { modShiftShortcut, modShortcut } from '@/lib/shortcut-labels'

type CanvasContextMenuProps = {
  children: ReactNode
  onPrepare?: (event: React.MouseEvent) => void
}

export function CanvasContextMenu({ children, onPrepare }: CanvasContextMenuProps) {
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)
  const canUndo = useEditorStore((state) => state.history.past.length > 0)
  const canRedo = useEditorStore((state) => state.history.future.length > 0)
  const keyframeClipboard = useEditorStore((state) => state.keyframeClipboard)
  const playbackState = useEditorStore((state) => state.playbackState)
  const snapEnabled = useEditorStore((state) => state.snapEnabled)
  const showRulers = useEditorStore((state) => state.showRulers)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const layers = useEditorStore((state) => state.project.layers)

  const duplicateSelectedLayer = useEditorStore((state) => state.duplicateSelectedLayer)
  const copyKeyframesAtCurrentTime = useEditorStore((state) => state.copyKeyframesAtCurrentTime)
  const pasteKeyframesAtCurrentTime = useEditorStore((state) => state.pasteKeyframesAtCurrentTime)
  const removeSelectedLayer = useEditorStore((state) => state.removeSelectedLayer)
  const groupSelectedLayers = useEditorStore((state) => state.groupSelectedLayers)
  const ungroupSelectedLayers = useEditorStore((state) => state.ungroupSelectedLayers)
  const staggerSelectedLayers = useEditorStore((state) => state.staggerSelectedLayers)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const setPlaybackState = useEditorStore((state) => state.setPlaybackState)
  const zoomToSelection = useEditorStore((state) => state.zoomToSelection)
  const fitToScreen = useEditorStore((state) => state.fitToScreen)
  const resetViewport = useEditorStore((state) => state.resetViewport)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const toggleSnapEnabled = useEditorStore((state) => state.toggleSnapEnabled)
  const toggleShowRulers = useEditorStore((state) => state.toggleShowRulers)
  const toggleOnionSkinEnabled = useEditorStore((state) => state.toggleOnionSkinEnabled)

  const hasSelection = selectedLayerIds.length > 0
  const canGroupOrStagger = selectedLayerIds.length >= 2
  const canUngroup = selectedLayerIds.some((id) => {
    const layer = layers.find((item) => item.id === id)
    return Boolean(layer?.groupId)
  })
  const canPasteKeyframes = keyframeClipboard.length > 0 && hasSelection
  const isPlaying = playbackState === 'playing'

  const zoomViewport = () => document.querySelector('[data-stage-viewport]')

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onContextMenu={(event) => {
          onPrepare?.(event)
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {hasSelection ? (
          <>
            <ContextMenuLabel>Selection</ContextMenuLabel>
            <ContextMenuItem onSelect={() => duplicateSelectedLayer()}>
              <Copy />
              Duplicate
              <ContextMenuShortcut>{modShortcut('D')}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => copyKeyframesAtCurrentTime()}>
              Copy keyframes
              <ContextMenuShortcut>{modShortcut('C')}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem disabled={!canPasteKeyframes} onSelect={() => pasteKeyframesAtCurrentTime()}>
              Paste keyframes
              <ContextMenuShortcut>{modShortcut('V')}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onSelect={() => removeSelectedLayer()}>
              <Trash2 />
              Delete
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!canGroupOrStagger} onSelect={() => groupSelectedLayers()}>
              <Group />
              Group
            </ContextMenuItem>
            <ContextMenuItem disabled={!canUngroup} onSelect={() => ungroupSelectedLayers()}>
              <Ungroup />
              Ungroup
            </ContextMenuItem>
            <ContextMenuItem disabled={!canGroupOrStagger} onSelect={() => staggerSelectedLayers(0.1)}>
              <Timer />
              Stagger 0.1s
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : (
          <>
            <ContextMenuItem disabled={!canPasteKeyframes} onSelect={() => pasteKeyframesAtCurrentTime()}>
              Paste keyframes
              <ContextMenuShortcut>{modShortcut('V')}</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuLabel>Edit</ContextMenuLabel>
        <ContextMenuItem disabled={!canUndo} onSelect={() => undo()}>
          <Undo2 />
          Undo
          <ContextMenuShortcut>{modShortcut('Z')}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!canRedo} onSelect={() => redo()}>
          <Redo2 />
          Redo
          <ContextMenuShortcut>{modShiftShortcut('Z')}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuLabel>View</ContextMenuLabel>
        <ContextMenuItem
          disabled={!hasSelection}
          onSelect={() => {
            const viewport = zoomViewport()
            if (viewport) {
              zoomToSelection(viewport.clientWidth, viewport.clientHeight)
            }
          }}
        >
          <ZoomIn />
          Zoom to selection
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            const viewport = zoomViewport()
            if (viewport) {
              fitToScreen(viewport.clientWidth, viewport.clientHeight)
            }
          }}
        >
          <Expand />
          Fit artboard to screen
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => resetViewport()}>Reset zoom (100%)</ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger>Tools</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {EDITOR_TOOLS.map((tool) => (
              <ContextMenuItem key={tool.id} onSelect={() => setActiveTool(tool.id)}>
                {tool.label}
                <ContextMenuShortcut>{tool.shortcut}</ContextMenuShortcut>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />

        <ContextMenuItem
          onSelect={() => setPlaybackState(isPlaying ? 'paused' : 'playing')}
        >
          {isPlaying ? <Pause /> : <Play />}
          {isPlaying ? 'Pause' : 'Play'}
          <ContextMenuShortcut>K</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />

        <ContextMenuCheckboxItem checked={snapEnabled} onCheckedChange={() => toggleSnapEnabled()}>
          Snapping
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked={showRulers} onCheckedChange={() => toggleShowRulers()}>
          Rulers
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem checked={onionSkinEnabled} onCheckedChange={() => toggleOnionSkinEnabled()}>
          Onion skin
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
