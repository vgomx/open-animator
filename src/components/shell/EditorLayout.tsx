import { useEffect, useRef, useState } from 'react'

import { ActivityRail } from '@/components/shell/ActivityRail'
import type { ActivityView } from '@/components/shell/activity-view'
import { FilesView } from '@/components/shell/FilesView'
import { Stage } from '@/components/canvas/Stage'
import { KeyboardShortcutsDialog } from '@/components/shell/KeyboardShortcutsDialog'
import { KeyboardShortcuts } from '@/components/shell/KeyboardShortcuts'
import { LayersPanel } from '@/components/shell/LayersPanel'
import { PropertiesPanel } from '@/components/shell/PropertiesPanel'
import { Toolbar } from '@/components/shell/Toolbar'
import { DocumentTabBar } from '@/components/shell/DocumentTabBar'
import { AboutDialog } from '@/components/shell/AboutDialog'
import { AcknowledgmentsDialog } from '@/components/shell/AcknowledgmentsDialog'
import { WelcomeDialog, type WelcomeDismissAction } from '@/components/shell/WelcomeDialog'
import { UiZoomGuard } from '@/components/shell/UiZoomGuard'
import { Timeline } from '@/components/timeline/Timeline'
import { useEditorStore } from '@/editor/store'
import { createDefaultProject } from '@/editor/scene'
import type { Project } from '@/editor/types'
import { consumeStaleImportClearNotice } from '@/io/project'
import { deriveProjectName, getRecentFiles } from '@/io/recent-files'
import { STORAGE_KEYS } from '@/lib/app'
import { loadEditorPreferences, saveEditorPreferences } from '@/lib/preferences'
import { getShellWelcomeModalDelayMs, SHELL_WELCOME_MODAL_PAUSE_MS } from '@/lib/shell-reveal'
import { showToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const LARGE_PROJECT_NOTICE_KEY = `${STORAGE_KEYS.project}:large-notice`

export function EditorLayout() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shellRevealed, setShellRevealed] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [acknowledgmentsOpen, setAcknowledgmentsOpen] = useState(false)
  const [activeView, setActiveView] = useState<ActivityView>('editor')
  const hasAutoOpenedWelcome = useRef(false)
  const setProject = useEditorStore((state) => state.setProject)
  const activeRecentFileId = useEditorStore((state) => state.activeRecentFileId)
  const project = useEditorStore((state) => state.project)

  const resumeDocumentName = (() => {
    const recent = getRecentFiles().find((entry) => entry.id === activeRecentFileId)
    return recent?.name ?? deriveProjectName(project)
  })()

  const handleWelcomeDismiss = (action: WelcomeDismissAction, dontShowAgain: boolean) => {
    if (dontShowAgain) {
      saveEditorPreferences({ skipWelcomeModal: true })
    }

    if (action === 'new') {
      startNewProject()
    }

    setWelcomeOpen(false)
  }

  const openProjectFromFiles = (project: Project, recentFileId: string) => {
    const viewport = document.querySelector('[data-stage-viewport]')?.getBoundingClientRect()
    setProject(project, {
      ...(recentFileId ? { recentFileId } : { isNewRecentFile: true }),
      fitViewport: viewport ?? undefined,
      clearLayerSelection: true,
    })
    setActiveView('editor')
  }

  const startNewProject = () => {
    const viewport = document.querySelector('[data-stage-viewport]')?.getBoundingClientRect()
    setProject(createDefaultProject(), {
      isNewRecentFile: true,
      fitViewport: viewport ?? undefined,
      clearLayerSelection: true,
    })
    setActiveView('editor')
  }

  useEffect(() => {
    if (
      !shellRevealed ||
      activeView !== 'editor' ||
      loadEditorPreferences().skipWelcomeModal ||
      hasAutoOpenedWelcome.current
    ) {
      return
    }

    hasAutoOpenedWelcome.current = true

    const toolPalette = document.querySelector('.editor-shell__tool-palette')
    const welcomeDelayMs = getShellWelcomeModalDelayMs()

    const openWelcome = () => {
      setWelcomeOpen(true)
    }

    if (!(toolPalette instanceof Element) || welcomeDelayMs === 0) {
      openWelcome()
      return
    }

    let opened = false
    let pauseTimer: number | undefined

    const openOnce = () => {
      if (opened) {
        return
      }

      opened = true
      openWelcome()
    }

    const scheduleWelcome = () => {
      pauseTimer = window.setTimeout(openOnce, SHELL_WELCOME_MODAL_PAUSE_MS)
    }

    const onTransitionEnd = (event: Event) => {
      if (event.target !== toolPalette) {
        return
      }

      if ((event as TransitionEvent).propertyName === 'transform') {
        scheduleWelcome()
      }
    }

    toolPalette.addEventListener('transitionend', onTransitionEnd)
    const fallbackTimer = window.setTimeout(openOnce, welcomeDelayMs + 80)

    return () => {
      toolPalette.removeEventListener('transitionend', onTransitionEnd)
      window.clearTimeout(fallbackTimer)
      if (pauseTimer !== undefined) {
        window.clearTimeout(pauseTimer)
      }
    }
  }, [shellRevealed, activeView])

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
      <ActivityRail
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onShowWelcome={() => {
          if (activeView === 'editor' && shellRevealed) {
            setWelcomeOpen(true)
          }
        }}
      />
      {activeView === 'files' ? (
        <FilesView
          activeRecentFileId={activeRecentFileId}
          onOpenProject={openProjectFromFiles}
          onStartNewProject={startNewProject}
        />
      ) : (
        <div className="editor-shell__main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Toolbar className="editor-shell__toolbar" />
          <DocumentTabBar className="editor-shell__tabs" />
          <div className="editor-shell__stage relative min-h-0 flex-1 overflow-hidden">
            <Stage />
            <LayersPanel className="editor-shell__panel editor-shell__panel--left" />
            <PropertiesPanel className="editor-shell__panel editor-shell__panel--right" />
          </div>
          <Timeline className="editor-shell__timeline" />
        </div>
      )}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <WelcomeDialog
        open={welcomeOpen}
        resumeDocumentName={resumeDocumentName}
        onDismiss={handleWelcomeDismiss}
        onOpenAbout={() => setAboutOpen(true)}
      />
      <AboutDialog
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        onOpenAcknowledgments={() => {
          setAboutOpen(false)
          setAcknowledgmentsOpen(true)
        }}
      />
      <AcknowledgmentsDialog open={acknowledgmentsOpen} onOpenChange={setAcknowledgmentsOpen} />
    </div>
  )
}
