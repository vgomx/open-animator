import { useEffect, useState, type RefObject } from 'react'

import { artboardToLocal } from '@/editor/coordinates'
import { getTickInterval } from '@/editor/snap'
import type { GuideAxis } from '@/editor/types'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

const RULER_SIZE = 24

type CanvasRulersProps = {
  svgRef: RefObject<SVGSVGElement | null>
  canvasAreaRef: RefObject<HTMLDivElement | null>
}

type RulerProps = {
  axis: GuideAxis
  svgRef: RefObject<SVGSVGElement | null>
  canvasAreaRef: RefObject<HTMLDivElement | null>
}

function Ruler({ axis, svgRef, canvasAreaRef }: RulerProps) {
  const artboard = useEditorStore((state) => state.project.artboard)
  const zoom = useEditorStore((state) => state.zoom)
  const panX = useEditorStore((state) => state.panX)
  const panY = useEditorStore((state) => state.panY)
  const setGuideDraft = useEditorStore((state) => state.setGuideDraft)
  const addGuide = useEditorStore((state) => state.addGuide)
  const [ticks, setTicks] = useState<Array<{ position: number; label: string; offset: number }>>([])

  useEffect(() => {
    const svg = svgRef.current
    const container = canvasAreaRef.current
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
  }, [artboard.height, artboard.width, axis, canvasAreaRef, panX, panY, svgRef, zoom])

  const startGuideDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const svg = svgRef.current
    const container = canvasAreaRef.current
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
        'relative overflow-hidden border-border bg-card/90 text-[10px] text-muted-foreground select-none',
        axis === 'x' ? 'h-full cursor-col-resize border-b' : 'w-full cursor-row-resize border-r',
      )}
      style={axis === 'x' ? { height: RULER_SIZE } : { width: RULER_SIZE }}
      onPointerDown={startGuideDrag}
    >
      {ticks.map((tick) =>
        axis === 'x' ? (
          <div
            key={tick.position}
            className="pointer-events-none absolute top-0 flex h-full flex-col items-center"
            style={{ left: tick.offset }}
          >
            <div className="h-2 w-px bg-border" />
            <span className="mt-0.5">{tick.label}</span>
          </div>
        ) : (
          <div
            key={tick.position}
            className="pointer-events-none absolute left-0 flex w-full items-center gap-1"
            style={{ top: tick.offset }}
          >
            <div className="h-px w-2 bg-border" />
            <span>{tick.label}</span>
          </div>
        ),
      )}
    </div>
  )
}

export function CanvasRulers({ svgRef, canvasAreaRef }: CanvasRulersProps) {
  const showRulers = useEditorStore((state) => state.showRulers)

  if (!showRulers) {
    return null
  }

  return (
    <>
      <div
        className="border-border bg-card/90 border-b border-r"
        style={{ width: RULER_SIZE, height: RULER_SIZE, gridColumn: 1, gridRow: 1 }}
      />
      <div style={{ gridColumn: 2, gridRow: 1 }}>
        <Ruler axis="x" svgRef={svgRef} canvasAreaRef={canvasAreaRef} />
      </div>
      <div style={{ gridColumn: 1, gridRow: 2 }}>
        <Ruler axis="y" svgRef={svgRef} canvasAreaRef={canvasAreaRef} />
      </div>
    </>
  )
}

export { RULER_SIZE }
