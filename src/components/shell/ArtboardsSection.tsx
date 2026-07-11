import { Copy, Frame, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

export function ArtboardsSection() {
  const artboards = useEditorStore((state) => state.project.artboards)
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId)
  const setActiveArtboardId = useEditorStore((state) => state.setActiveArtboardId)
  const addArtboard = useEditorStore((state) => state.addArtboard)
  const removeArtboard = useEditorStore((state) => state.removeArtboard)
  const duplicateArtboard = useEditorStore((state) => state.duplicateArtboard)

  return (
    <div className="border-b border-border/60 px-2 py-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Artboards
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-xs" onClick={() => addArtboard()}>
              <Plus className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Add artboard</TooltipContent>
        </Tooltip>
      </div>
      <div className="space-y-1">
        {artboards.map((artboard) => {
          const active = artboard.id === activeArtboardId
          return (
            <div
              key={artboard.id}
              className={cn(
                'group flex items-center gap-1 rounded-md border px-1.5 py-1 transition-colors',
                active
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-transparent hover:bg-muted/40',
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                onClick={() => setActiveArtboardId(artboard.id)}
              >
                <Frame className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs font-medium">{artboard.name}</span>
              </button>
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Duplicate ${artboard.name}`}
                  onClick={() => duplicateArtboard(artboard.id)}
                >
                  <Copy className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={artboards.length <= 1}
                  aria-label={`Delete ${artboard.name}`}
                  onClick={() => removeArtboard(artboard.id)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
