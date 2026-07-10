import { useEffect } from 'react'

import { Stage } from '@/components/canvas/Stage'
import { LayersPanel } from '@/components/shell/LayersPanel'
import { PropertiesPanel } from '@/components/shell/PropertiesPanel'
import { Toolbar } from '@/components/shell/Toolbar'
import { Timeline } from '@/components/timeline/Timeline'
import { useEditorStore } from '@/editor/store'

function PlaybackLoop() {
  const playbackState = useEditorStore((state) => state.playbackState)
  const duration = useEditorStore((state) => state.project.duration)
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

      let nextTime = store.currentTime + delta
      if (nextTime >= duration) {
        if (loop) {
          nextTime = 0
        } else {
          store.setCurrentTime(duration)
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
  }, [duration, loop, playbackState])

  return null
}

export function EditorLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <PlaybackLoop />
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <LayersPanel />
        <Stage />
        <PropertiesPanel />
      </div>
      <Timeline />
    </div>
  )
}
