import { useEffect, useState } from 'react'
import { AppLoader } from '@/components/shell/AppLoader'
import { EditorLayout } from '@/components/shell/EditorLayout'
import { waitForPaint } from '@/lib/yield-to-ui'

const MIN_LOADER_MS = 720
const EXIT_MS = 380

type BootPhase = 'loading' | 'exiting' | 'ready'

function App() {
  const [phase, setPhase] = useState<BootPhase>('loading')

  useEffect(() => {
    let exitTimer: ReturnType<typeof setTimeout> | undefined
    let readyTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    void (async () => {
      const started = performance.now()
      await waitForPaint()
      const remaining = Math.max(0, MIN_LOADER_MS - (performance.now() - started))

      await new Promise<void>((resolve) => {
        readyTimer = setTimeout(resolve, remaining)
      })

      if (cancelled) {
        return
      }

      setPhase('exiting')
      exitTimer = setTimeout(() => {
        if (!cancelled) {
          setPhase('ready')
        }
      }, EXIT_MS)
    })()

    return () => {
      cancelled = true
      clearTimeout(exitTimer)
      clearTimeout(readyTimer)
    }
  }, [])

  if (phase !== 'ready') {
    return <AppLoader exiting={phase === 'exiting'} />
  }

  return <EditorLayout />
}

export default App
