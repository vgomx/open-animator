import { useEffect } from 'react'

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
  const nudgeSelectedKeyframes = useEditorStore((state) => state.nudgeSelectedKeyframes)
  const setPlaybackState = useEditorStore((state) => state.setPlaybackState)
  const playbackState = useEditorStore((state) => state.playbackState)

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

      if (event.key === '?' && !mod) {
        event.preventDefault()
        onOpenShortcuts?.()
        return
      }

      if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if (mod && ((event.key.toLowerCase() === 'z' && event.shiftKey) || event.key.toLowerCase() === 'y')) {
        event.preventDefault()
        redo()
        return
      }

      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelectedLayer()
        return
      }

      if (mod && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copyKeyframesAtCurrentTime()
        return
      }

      if (mod && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteKeyframesAtCurrentTime()
        return
      }

      if (event.key.toLowerCase() === 'k' && !mod) {
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
        removeSelectedLayer()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    copyKeyframesAtCurrentTime,
    duplicateSelectedLayer,
    nudgeSelectedKeyframes,
    onOpenShortcuts,
    pasteKeyframesAtCurrentTime,
    playbackState,
    redo,
    removeSelectedLayer,
    setPlaybackState,
    undo,
  ])

  return null
}
