import { layerHasAnimation } from '@/editor/layer-animation'
import type { Layer } from '@/editor/types'
import { getLayerTypeIcon, GROUP_ICON } from '@/editor/layer-display'
import { TIMELINE_ROW_HEIGHT } from '@/editor/layout-constants'
import { cn } from '@/lib/utils'

type TimelineLayerLabelProps = {
  layer: Layer
  depth?: number
  isSelected: boolean
  isExpanded?: boolean
  onSelect: (layerId: string, additive: boolean) => void
  onToggleExpand?: () => void
}

export function TimelineLayerLabel({
  layer,
  depth = 0,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
}: TimelineLayerLabelProps) {
  const Icon = getLayerTypeIcon(layer.shape.type)
  const hasKeyframes = layerHasAnimation(layer)

  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-border/40 px-2',
        isSelected ? 'bg-primary/8' : 'bg-card/80',
      )}
      style={{ height: TIMELINE_ROW_HEIGHT, paddingLeft: 8 + depth * 12 }}
    >
      {hasKeyframes ? (
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          aria-label={isExpanded ? 'Collapse properties' : 'Expand properties'}
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpand?.()
          }}
        >
          <span className="text-[10px]">{isExpanded ? '▾' : '▸'}</span>
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}
      <Icon className="size-3 shrink-0 text-muted-foreground" />
      <button
        type="button"
        className={cn(
          'min-w-0 flex-1 truncate text-left text-xs',
          isSelected ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
        onClick={(event) =>
          onSelect(layer.id, event.shiftKey || event.metaKey || event.ctrlKey)
        }
      >
        {layer.name}
      </button>
    </div>
  )
}

type TimelinePropertyLabelProps = {
  label: string
  depth?: number
}

export function TimelinePropertyLabel({ label, depth = 1 }: TimelinePropertyLabelProps) {
  return (
    <div
      className="flex items-center border-b border-border/30 bg-muted/10 px-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      style={{ height: TIMELINE_ROW_HEIGHT, paddingLeft: 8 + depth * 12 }}
    >
      {label}
    </div>
  )
}

type TimelineGroupLabelProps = {
  label: string
  depth?: number
  isSelected: boolean
  isExpanded?: boolean
  hasKeyframes: boolean
  onSelect: () => void
  onToggleExpand?: () => void
}

export function TimelineGroupLabel({
  label,
  depth = 0,
  isSelected,
  isExpanded,
  hasKeyframes,
  onSelect,
  onToggleExpand,
}: TimelineGroupLabelProps) {
  const GroupIcon = GROUP_ICON

  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-border/40 px-2',
        isSelected ? 'bg-primary/8' : 'bg-card/80',
      )}
      style={{ height: TIMELINE_ROW_HEIGHT, paddingLeft: 8 + depth * 12 }}
    >
      {hasKeyframes ? (
        <button
          type="button"
          className="flex size-4 shrink-0 items-center justify-center text-muted-foreground"
          aria-label={isExpanded ? 'Collapse properties' : 'Expand properties'}
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpand?.()
          }}
        >
          <span className="text-[10px]">{isExpanded ? '▾' : '▸'}</span>
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}
      <GroupIcon className="size-3 shrink-0 text-muted-foreground" />
      <button
        type="button"
        className={cn(
          'min-w-0 flex-1 truncate text-left text-xs',
          isSelected ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
        onClick={onSelect}
      >
        {label}
      </button>
    </div>
  )
}
