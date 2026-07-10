import { useEffect, useRef, useState } from 'react'

import { useEditorStore } from '@/editor/store'
import { wheelZoomFactor } from '@/editor/viewport'
import { ShapeView } from '@/components/canvas/ShapeView'
import { SelectionOverlay } from '@/components/canvas/SelectionOverlay'

export function Stage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const panDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  )

  const project = useEditorStore((state) => state.project)
  const currentTime = useEditorStore((state) => state.currentTime)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const setSelectedLayerId = useEditorStore((state) => state.setSelectedLayerId)
  const getAnimatedShape = useEditorStore((state) => state.getAnimatedShape)
  const zoom = useEditorStore((state) => state.zoom)
  const panX = useEditorStore((state) => state.panX)
  const panY = useEditorStore((state) => state.panY)
  const setPan = useEditorStore((state) => state.setPan)
  const panBy = useEditorStore((state) => state.panBy)
  const zoomAtPoint = useEditorStore((state) => state.zoomAtPoint)

  const { width, height } = project.artboard

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        setSpacePressed(true)
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false)
        panDragRef.current = null
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = panDragRef.current
      if (!drag) {
        return
      }

      setPan(drag.originX + (event.clientX - drag.startX), drag.originY + (event.clientY - drag.startY))
    }

    const onPointerUp = () => {
      panDragRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [setPan])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()

      const rect = container.getBoundingClientRect()
      const pointX = event.clientX - rect.left
      const pointY = event.clientY - rect.top
      const shouldZoom = event.ctrlKey || event.altKey

      if (shouldZoom) {
        zoomAtPoint(
          wheelZoomFactor(event.deltaY),
          pointX,
          pointY,
          rect.width,
          rect.height,
        )
        return
      }

      panBy(event.deltaX, event.deltaY)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [panBy, zoomAtPoint])

  return (
    <div
      ref={containerRef}
      data-stage-viewport
      className={`absolute inset-0 overflow-hidden overscroll-none bg-[#0b0f17] ${spacePressed ? 'cursor-grab' : ''}`}
      style={{ touchAction: 'none' }}
      onPointerDown={(event) => {
        const isMiddleClick = event.button === 1
        if (!spacePressed && !isMiddleClick) {
          return
        }

        event.preventDefault()
        panDragRef.current = {
          startX: event.clientX,
          startY: event.clientY,
          originX: panX,
          originY: panY,
        }
      }}
    >
      <div className="flex h-full w-full items-center justify-center">
        <div
          className="relative shadow-2xl ring-1 ring-white/10"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block bg-[#111827]"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
            }}
            onClick={() => setSelectedLayerId(null)}
          >
            {project.layers.map((layer) => {
              if (!layer.visible) {
                return null
              }

              const animatedShape = getAnimatedShape(layer, currentTime)
              const isSelected = layer.id === selectedLayerId

              return (
                <g
                  key={layer.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedLayerId(layer.id)
                  }}
                  className="cursor-pointer"
                >
                  <ShapeView shape={animatedShape} />
                  {isSelected ? (
                    <SelectionOverlay layerId={layer.id} shape={animatedShape} />
                  ) : null}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}
