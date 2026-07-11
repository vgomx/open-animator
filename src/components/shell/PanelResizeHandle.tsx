import { useCallback, useRef } from 'react'

import { clampPanelWidth } from '@/lib/preferences'
import { cn } from '@/lib/utils'

type PanelResizeHandleProps = {
  edge: 'left' | 'right'
  onWidthChange: (width: number) => void
  getWidth: () => number
  className?: string
}

export function PanelResizeHandle({
  edge,
  onWidthChange,
  getWidth,
  className,
}: PanelResizeHandleProps) {
  const draggingRef = useRef(false)

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const startX = event.clientX
      const startWidth = getWidth()
      draggingRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.classList.add('select-none')

      const onPointerMove = (moveEvent: PointerEvent) => {
        const delta = edge === 'right' ? moveEvent.clientX - startX : startX - moveEvent.clientX
        onWidthChange(clampPanelWidth(startWidth + delta))
      }

      const onPointerUp = () => {
        draggingRef.current = false
        document.body.style.cursor = ''
        document.body.classList.remove('select-none')
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
    },
    [edge, getWidth, onWidthChange],
  )

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 z-40 h-full w-3',
        edge === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
        className,
      )}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        className={cn(
          'pointer-events-auto absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 cursor-col-resize touch-none',
          'hover:bg-primary/20 active:bg-primary/30',
        )}
        onPointerDown={onPointerDown}
      />
    </div>
  )
}
