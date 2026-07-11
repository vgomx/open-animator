import { ZoomIn, ZoomOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { MAX_ZOOM, MIN_ZOOM } from '@/editor/viewport'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

const ZOOM_PRESETS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
] as const

const ZOOM_STEP = 0.05

function formatZoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`
}

function isActivePreset(zoom: number, preset: number): boolean {
  return Math.abs(zoom - preset) < ZOOM_STEP / 2
}

export function ZoomControls() {
  const zoom = useEditorStore((state) => state.zoom)
  const setZoom = useEditorStore((state) => state.setZoom)

  const stepZoom = (direction: -1 | 1) => {
    setZoom(zoom + direction * ZOOM_STEP)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="min-w-14 px-2 tabular-nums"
          aria-label={`Canvas zoom ${formatZoomLabel(zoom)}`}
        >
          {formatZoomLabel(zoom)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-56">
        <div className="space-y-3">
          <p className="text-sm font-medium">Zoom</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-xs"
              aria-label="Zoom out"
              disabled={zoom <= MIN_ZOOM + 0.001}
              onClick={() => stepZoom(-1)}
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <Slider
              className="flex-1"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0] ?? 1)}
            />
            <Button
              variant="outline"
              size="icon-xs"
              aria-label="Zoom in"
              disabled={zoom >= MAX_ZOOM - 0.001}
              onClick={() => stepZoom(1)}
            >
              <ZoomIn className="size-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {ZOOM_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={isActivePreset(zoom, preset.value) ? 'secondary' : 'ghost'}
                size="sm"
                className={cn('h-7 px-2 text-xs tabular-nums')}
                onClick={() => setZoom(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
