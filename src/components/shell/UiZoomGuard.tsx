import { useEffect } from 'react'

export function UiZoomGuard() {
  useEffect(() => {
    const blockWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
      }
    }

    const blockGestureZoom = (event: Event) => {
      event.preventDefault()
    }

    const blockKeyboardZoom = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return
      }

      if (event.key === '+' || event.key === '-' || event.key === '=' || event.key === '0') {
        event.preventDefault()
      }
    }

    window.addEventListener('wheel', blockWheelZoom, { passive: false, capture: true })
    document.addEventListener('gesturestart', blockGestureZoom)
    document.addEventListener('gesturechange', blockGestureZoom)
    document.addEventListener('gestureend', blockGestureZoom)
    window.addEventListener('keydown', blockKeyboardZoom)

    return () => {
      window.removeEventListener('wheel', blockWheelZoom, { capture: true })
      document.removeEventListener('gesturestart', blockGestureZoom)
      document.removeEventListener('gesturechange', blockGestureZoom)
      document.removeEventListener('gestureend', blockGestureZoom)
      window.removeEventListener('keydown', blockKeyboardZoom)
    }
  }, [])

  return null
}
