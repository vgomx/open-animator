import { useEffect, useState } from 'react'

import { Stage } from '@/components/canvas/Stage'
import { KeyboardShortcutsDialog } from '@/components/shell/KeyboardShortcutsDialog'
import { KeyboardShortcuts } from '@/components/shell/KeyboardShortcuts'
import { LayersPanel } from '@/components/shell/LayersPanel'
import { PropertiesPanel } from '@/components/shell/PropertiesPanel'
import { Toolbar } from '@/components/shell/Toolbar'
import { UiZoomGuard } from '@/components/shell/UiZoomGuard'
import { Timeline } from '@/components/timeline/Timeline'
import { useEditorStore } from '@/editor/store'

function PlaybackLoop() {
  const playbackState = useEditorStore((state) => state.playbackState)
  const duration = useEditorStore((state) => state.project.duration)
  const loopIn = useEditorStore((state) => state.project.loopIn)
  const loopOut = useEditorStore((state) => state.project.loopOut)
  const loop = useEditorStore((state) => state.loop)

  useEffect(() => {
    if (playbackState !== 'playing') {
      return
    }

    let frameId = 0
    let lastTimestamp = performance.now()

    const tick = (timestamp: number) => {
      const delta = (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp

      const store = useEditorStore.getState()
      if (store.playbackState !== 'playing') {
        return
      }

      const regionEnd = store.project.loopOut ?? duration
      const regionStart = store.project.loopIn ?? 0

      let nextTime = store.currentTime + delta
      if (nextTime >= regionEnd) {
        if (loop) {
          nextTime = regionStart
        } else {
          store.setCurrentTime(regionEnd)
          store.setPlaybackState('idle')
          return
        }
      }

      store.setCurrentTime(nextTime)
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [duration, loop, loopIn, loopOut, playbackState])

  return null
}

export function EditorLayout() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <PlaybackLoop />
      <UiZoomGuard />
      <KeyboardShortcuts onOpenShortcuts={() => setShortcutsOpen(true)} />
      <Toolbar onOpenShortcuts={() => setShortcutsOpen(true)} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Stage />
        <LayersPanel />
        <PropertiesPanel />
      </div>
      <Timeline />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  )
}
