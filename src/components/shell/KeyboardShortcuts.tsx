import { useEffect } from 'react'

import { EDITOR_TOOLS } from '@/editor/tools'
import { useEditorStore } from '@/editor/store'

type KeyboardShortcutsProps = {
  onOpenShortcuts?: () => void
}

export function KeyboardShortcuts({ onOpenShortcuts }: KeyboardShortcutsProps) {
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const removeSelectedLayer = useEditorStore((state) => state.removeSelectedLayer)
  const duplicateSelectedLayer = useEditorStore((state) => state.duplicateSelectedLayer)
  const copyKeyframesAtCurrentTime = useEditorStore((state) => state.copyKeyframesAtCurrentTime)
  const pasteKeyframesAtCurrentTime = useEditorStore((state) => state.pasteKeyframesAtCurrentTime)
  const copyStyleFromSelection = useEditorStore((state) => state.copyStyleFromSelection)
  const pasteStyleToSelection = useEditorStore((state) => state.pasteStyleToSelection)
  const toggleLockSelectedLayers = useEditorStore((state) => state.toggleLockSelectedLayers)
  const toggleVisibilitySelectedLayers = useEditorStore((state) => state.toggleVisibilitySelectedLayers)
  const nudgeSelectedKeyframes = useEditorStore((state) => state.nudgeSelectedKeyframes)
  const setPlaybackState = useEditorStore((state) => state.setPlaybackState)
  const playbackState = useEditorStore((state) => state.playbackState)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const activeTool = useEditorStore((state) => state.activeTool)
  const deleteSelectedNodes = useEditorStore((state) => state.deleteSelectedNodes)
  const selectedNodeIndices = useEditorStore((state) => state.selectedNodeIndices)
  const finishPenPath = useEditorStore((state) => state.finishPenPath)
  const cancelPenDraft = useEditorStore((state) => state.cancelPenDraft)
  const eyedropperActive = useEditorStore((state) => state.eyedropperActive)
  const cancelEyedropper = useEditorStore((state) => state.cancelEyedropper)
  const zoomToSelection = useEditorStore((state) => state.zoomToSelection)
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }

      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (event.key === '?' && !mod) {
        event.preventDefault()
        onOpenShortcuts?.()
        return
      }

      if (!mod) {
        const tool = EDITOR_TOOLS.find((item) => item.shortcut.toLowerCase() === key)
        if (tool) {
          event.preventDefault()
          setActiveTool(tool.id)
          return
        }
      }

      if (mod && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if (mod && ((key === 'z' && event.shiftKey) || key === 'y')) {
        event.preventDefault()
        redo()
        return
      }

      if (mod && key === 'd') {
        event.preventDefault()
        duplicateSelectedLayer()
        return
      }

      if (mod && event.altKey && key === 'c') {
        event.preventDefault()
        copyStyleFromSelection()
        return
      }

      if (mod && event.altKey && key === 'v') {
        event.preventDefault()
        pasteStyleToSelection()
        return
      }

      if (mod && key === 'c' && !event.altKey) {
        event.preventDefault()
        copyKeyframesAtCurrentTime()
        return
      }

      if (mod && key === 'v' && !event.altKey) {
        event.preventDefault()
        pasteKeyframesAtCurrentTime()
        return
      }

      if (mod && key === '2' && selectedLayerIds.length > 0) {
        event.preventDefault()
        const viewport = document.querySelector('[data-stage-viewport]')
        if (viewport) {
          zoomToSelection(viewport.clientWidth, viewport.clientHeight)
        }
        return
      }

      if (mod && event.shiftKey && key === 'l') {
        event.preventDefault()
        toggleLockSelectedLayers()
        return
      }

      if (mod && event.shiftKey && key === 'h') {
        event.preventDefault()
        toggleVisibilitySelectedLayers()
        return
      }

      if (key === 'k' && !mod) {
        event.preventDefault()
        setPlaybackState(playbackState === 'playing' ? 'paused' : 'playing')
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        nudgeSelectedKeyframes(event.shiftKey ? -0.1 : -1 / 30)
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        nudgeSelectedKeyframes(event.shiftKey ? 0.1 : 1 / 30)
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        if (activeTool === 'node' && selectedNodeIndices.length > 0) {
          deleteSelectedNodes()
          return
        }
        removeSelectedLayer()
        return
      }

      if (event.key === 'Escape') {
        if (eyedropperActive) {
          event.preventDefault()
          cancelEyedropper()
          return
        }

        cancelPenDraft()
      }

      if (event.key === 'Enter' && activeTool === 'pen') {
        event.preventDefault()
        finishPenPath(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    activeTool,
    cancelEyedropper,
    cancelPenDraft,
    copyKeyframesAtCurrentTime,
    copyStyleFromSelection,
    deleteSelectedNodes,
    duplicateSelectedLayer,
    eyedropperActive,
    finishPenPath,
    nudgeSelectedKeyframes,
    onOpenShortcuts,
    pasteKeyframesAtCurrentTime,
    pasteStyleToSelection,
    playbackState,
    redo,
    removeSelectedLayer,
    selectedLayerIds.length,
    selectedNodeIndices.length,
    setActiveTool,
    setPlaybackState,
    toggleLockSelectedLayers,
    toggleVisibilitySelectedLayers,
    undo,
    zoomToSelection,
  ])

  return null
}
