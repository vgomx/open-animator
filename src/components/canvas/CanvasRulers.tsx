import { useEffect, useState, type RefObject } from 'react'

import { artboardToLocal } from '@/editor/coordinates'
import { getTickInterval } from '@/editor/snap'
import type { GuideAxis } from '@/editor/types'
import { RULER_X_SIZE, RULER_Y_SIZE } from '@/editor/layout-constants'
import { getCanvasChromeInsets } from '@/editor/viewport-chrome'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

type CanvasRulersProps = {
  svgRef: RefObject<SVGSVGElement | null>
  canvasViewportRef: RefObject<HTMLDivElement | null>
}

type RulerProps = {
  axis: GuideAxis
  svgRef: RefObject<SVGSVGElement | null>
  canvasViewportRef: RefObject<HTMLDivElement | null>
}

function Ruler({ axis, svgRef, canvasViewportRef }: RulerProps) {
  const artboard = useEditorStore((state) => state.project.artboard)
  const zoom = useEditorStore((state) => state.zoom)
  const panX = useEditorStore((state) => state.panX)
  const panY = useEditorStore((state) => state.panY)
  const setGuideDraft = useEditorStore((state) => state.setGuideDraft)
  const addGuide = useEditorStore((state) => state.addGuide)
  const [ticks, setTicks] = useState<Array<{ position: number; label: string; offset: number }>>([])

  useEffect(() => {
    const svg = svgRef.current
    const container = canvasViewportRef.current
    if (!svg || !container) {
      return
    }

    const updateTicks = () => {
      const interval = getTickInterval(zoom)
      const length = axis === 'x' ? artboard.width : artboard.height
      const nextTicks: Array<{ position: number; label: string; offset: number }> = []

      for (let position = 0; position <= length; position += interval) {
        const local = artboardToLocal(svg, container, axis === 'x' ? position : 0, axis === 'y' ? position : 0)
        const offset = axis === 'x' ? local.x : local.y
        const containerSize = axis === 'x' ? container.clientWidth : container.clientHeight

        if (offset >= -40 && offset <= containerSize + 40) {
          nextTicks.push({
            position,
            label: String(Math.round(position)),
            offset,
          })
        }
      }

      setTicks(nextTicks)
    }

    updateTicks()
    const observer = new ResizeObserver(updateTicks)
    observer.observe(container)
    window.addEventListener('resize', updateTicks)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateTicks)
    }
  }, [artboard.height, artboard.width, axis, canvasViewportRef, panX, panY, svgRef, zoom])

  const startGuideDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const svg = svgRef.current
    const container = canvasViewportRef.current
    if (!svg || !container) {
      return
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      const point = svg.createSVGPoint()
      point.x = moveEvent.clientX
      point.y = moveEvent.clientY
      const matrix = svg.getScreenCTM()?.inverse()
      if (!matrix) {
        return
      }

      const transformed = point.matrixTransform(matrix)
      const position = axis === 'x' ? transformed.x : transformed.y
      setGuideDraft({ axis, position })
    }

    const onPointerUp = (upEvent: PointerEvent) => {
      const point = svg.createSVGPoint()
      point.x = upEvent.clientX
      point.y = upEvent.clientY
      const matrix = svg.getScreenCTM()?.inverse()
      if (matrix) {
        const transformed = point.matrixTransform(matrix)
        const position = axis === 'x' ? transformed.x : transformed.y
        const limit = axis === 'x' ? artboard.width : artboard.height
        if (position >= 0 && position <= limit) {
          addGuide(axis, position)
        }
      }

      setGuideDraft(null)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  return (
    <div
      className={cn(
        'glass-chrome relative text-muted-foreground select-none',
        axis === 'x'
          ? 'h-full w-full cursor-col-resize overflow-hidden border-b border-border/50'
          : 'h-full w-full cursor-row-resize overflow-x-visible overflow-y-hidden border-r border-border/50',
      )}
      style={axis === 'x' ? { height: RULER_X_SIZE } : { width: RULER_Y_SIZE, height: '100%' }}
      onPointerDown={startGuideDrag}
    >
      {ticks.map((tick) =>
        axis === 'x' ? (
          <div
            key={tick.position}
            className="pointer-events-none absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: tick.offset }}
          >
            <span className="mb-0.5 text-[10px] leading-none tabular-nums">{tick.label}</span>
            <div className="h-2 w-px shrink-0 bg-border" />
          </div>
        ) : (
          <div
            key={tick.position}
            className="pointer-events-none absolute right-0 flex -translate-y-1/2 flex-col items-end"
            style={{ top: tick.offset }}
          >
            <span className="mb-px whitespace-nowrap text-[10px] leading-none tabular-nums">{tick.label}</span>
            <div className="h-px w-2 shrink-0 bg-border" />
          </div>
        ),
      )}
    </div>
  )
}

export function CanvasRulers({ svgRef, canvasViewportRef }: CanvasRulersProps) {
  const showRulers = useEditorStore((state) => state.showRulers)

  if (!showRulers) {
    return null
  }

  const { left: chromeLeft, top: chromeTop } = getCanvasChromeInsets(true)

  return (
    <>
      <div
        className="glass-chrome pointer-events-none absolute z-20 border-b border-r border-border/50"
        style={{ left: chromeLeft - RULER_Y_SIZE, top: chromeTop - RULER_X_SIZE, width: RULER_Y_SIZE, height: RULER_X_SIZE }}
      />
      <div
        className="absolute z-20 min-h-0 min-w-0 overflow-hidden"
        style={{ left: chromeLeft, top: 0, right: 0, height: RULER_X_SIZE }}
      >
        <Ruler axis="x" svgRef={svgRef} canvasViewportRef={canvasViewportRef} />
      </div>
      <div
        className="absolute z-20 min-h-0 overflow-visible"
        style={{ left: chromeLeft - RULER_Y_SIZE, top: chromeTop, width: RULER_Y_SIZE, bottom: 0 }}
      >
        <Ruler axis="y" svgRef={svgRef} canvasViewportRef={canvasViewportRef} />
      </div>
    </>
  )
}

export { RULER_SIZE, RULER_X_SIZE, RULER_Y_SIZE } from '@/editor/layout-constants'
