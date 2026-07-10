import { useEffect } from 'react'

import { useEditorStore } from '@/editor/store'

export function KeyboardShortcuts() {
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const removeSelectedLayer = useEditorStore((state) => state.removeSelectedLayer)
  const duplicateSelectedLayer = useEditorStore((state) => state.duplicateSelectedLayer)

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

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeSelectedLayer()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [duplicateSelectedLayer, redo, removeSelectedLayer, undo])

  return null
}
