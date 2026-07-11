import {
  Circle,
  Folder,
  PenLine,
  Square,
  Type,
  type LucideIcon,
} from 'lucide-react'

import type { Layer, ShapeType } from '@/editor/types'

const layerTypeMeta: Record<
  ShapeType,
  { label: string; icon: LucideIcon }
> = {
  rect: { label: 'Rectangle', icon: Square },
  ellipse: { label: 'Ellipse', icon: Circle },
  text: { label: 'Text', icon: Type },
  path: { label: 'Path', icon: PenLine },
}

export function getLayerTypeIcon(type: ShapeType): LucideIcon {
  return layerTypeMeta[type].icon
}

export function getLayerTypeLabel(type: ShapeType): string {
  return layerTypeMeta[type].label
}

export function getLayerDisplayName(layer: Layer): string {
  return layer.name
}

export function getGroupDisplayName(
  layers: Layer[],
  groupId?: string,
  groupMeta?: Record<string, { name: string }>,
): string {
  if (groupId && groupMeta?.[groupId]?.name) {
    return groupMeta[groupId].name
  }

  const types = new Set(layers.map((layer) => layer.shape.type))
  const typeSummary =
    types.size === 1
      ? getLayerTypeLabel(layers[0]!.shape.type)
      : `${types.size} types`

  return `Group · ${layers.length} layers (${typeSummary})`
}

export const GROUP_ICON = Folder
