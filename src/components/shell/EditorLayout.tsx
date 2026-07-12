import { useEffect, useState } from 'react'

import { ActivityRail } from '@/components/shell/ActivityRail'
import { Stage } from '@/components/canvas/Stage'
import { KeyboardShortcutsDialog } from '@/components/shell/KeyboardShortcutsDialog'
import { KeyboardShortcuts } from '@/components/shell/KeyboardShortcuts'
import { LayersPanel } from '@/components/shell/LayersPanel'
import { PropertiesPanel } from '@/components/shell/PropertiesPanel'
import { Toolbar } from '@/components/shell/Toolbar'
import { UiZoomGuard } from '@/components/shell/UiZoomGuard'
import { Timeline } from '@/components/timeline/Timeline'
import { useEditorStore } from '@/editor/store'
import { consumeStaleImportClearNotice } from '@/io/project'
import { STORAGE_KEYS } from '@/lib/app'
import { showToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const LARGE_PROJECT_NOTICE_KEY = `${STORAGE_KEYS.project}:large-notice`

export function EditorLayout() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shellRevealed, setShellRevealed] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShellRevealed(true)
      return
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setShellRevealed(true))
    })

    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!consumeStaleImportClearNotice()) {
      return
    }

    showToast({
      title: 'Previous SVG import was outdated',
      description:
        'Cached animation data was cleared. Open your SVG again as a new project to restore motion.',
      variant: 'default',
    })
  }, [])

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.shortcutsHintSeen) === '1') {
      return
    }

    localStorage.setItem(STORAGE_KEYS.shortcutsHintSeen, '1')
    showToast({
      title: 'Keyboard shortcuts',
      description: 'Press ? any time to open the shortcut cheat sheet.',
      variant: 'default',
    })
  }, [])

  useEffect(() => {
    const project = useEditorStore.getState().project
    if (project.layers.length < 100) {
      return
    }

    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(LARGE_PROJECT_NOTICE_KEY) === '1') {
      return
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(LARGE_PROJECT_NOTICE_KEY, '1')
    }

    showToast({
      title: 'Large cached project loaded',
      description:
        'This project has 100+ layers and may feel slower. Use File → New project to clear the cached import.',
      variant: 'default',
    })
  }, [])

  useEffect(() => {
    const project = useEditorStore.getState().project
    const artboard = project.artboards[0]
    if (!artboard || project.layers.length < 100) {
      return
    }

    requestAnimationFrame(() => {
      const viewport = document.querySelector('[data-stage-viewport]')?.getBoundingClientRect()
      if (!viewport) {
        return
      }

      useEditorStore.getState().fitToScreen(viewport.width, viewport.height)
    })
  }, [])

  return (
    <div
      className={cn(
        'editor-shell flex h-svh overflow-hidden bg-background text-foreground',
        shellRevealed && 'editor-shell--revealed',
      )}
    >
      <UiZoomGuard />
      <KeyboardShortcuts onOpenShortcuts={() => setShortcutsOpen(true)} />
      <ActivityRail onOpenShortcuts={() => setShortcutsOpen(true)} />
      <div className="editor-shell__main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Toolbar className="editor-shell__toolbar" />
        <div className="editor-shell__stage relative min-h-0 flex-1 overflow-hidden">
          <Stage />
          <LayersPanel className="editor-shell__panel editor-shell__panel--left" />
          <PropertiesPanel className="editor-shell__panel editor-shell__panel--right" />
        </div>
        <Timeline className="editor-shell__timeline" />
      </div>
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}
