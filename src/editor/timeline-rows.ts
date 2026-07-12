import { buildLayerTreeRows, collectGroupLayers, type LayerTreeRow } from '@/editor/layer-tree'
import { GROUP_ANIMATABLE_PROPERTIES } from '@/editor/group-animation'
import type { AnimatableProperty, Layer, LayerGroupMeta } from '@/editor/types'

export type TimelineRow =
  | { kind: 'layer'; layer: Layer; depth: number }
  | { kind: 'property'; layer: Layer; property: AnimatableProperty; label: string; depth: number }
  | { kind: 'group'; groupId: string; depth: number }
  | {
      kind: 'groupProperty'
      groupId: string
      property: AnimatableProperty
      label: string
      depth: number
    }

const propertyLabels: Record<AnimatableProperty, string> = {
  x: 'X',
  y: 'Y',
  opacity: 'Opacity',
  scaleX: 'Scale X',
  scaleY: 'Scale Y',
  rotation: 'Rotation',
  fill: 'Fill',
  stroke: 'Stroke',
  width: 'Width',
  height: 'Height',
  rx: 'Radius X',
  ry: 'Radius Y',
  fontSize: 'Font size',
}

function appendLayerPropertyRows(
  layer: Layer,
  result: TimelineRow[],
  expandedLayerIds: string[],
  depth: number,
) {
  if (!expandedLayerIds.includes(layer.id)) {
    return
  }

  for (const property of Object.keys(propertyLabels) as AnimatableProperty[]) {
    const keyframes = layer.keyframes.filter((keyframe) => keyframe.property === property)
    if (keyframes.length === 0) {
      continue
    }

    result.push({
      kind: 'property',
      layer,
      property,
      label: propertyLabels[property],
      depth: depth + 1,
    })
  }
}

function appendGroupPropertyRows(
  groupId: string,
  keyframes: LayerGroupMeta['keyframes'],
  result: TimelineRow[],
  expandedGroupIds: string[],
  depth: number,
) {
  if (!expandedGroupIds.includes(groupId)) {
    return
  }

  for (const property of GROUP_ANIMATABLE_PROPERTIES) {
    if ((keyframes ?? []).some((keyframe) => keyframe.property === property)) {
      result.push({
        kind: 'groupProperty',
        groupId,
        property,
        label: propertyLabels[property as AnimatableProperty],
        depth: depth + 1,
      })
    }
  }
}

function appendTimelineRows(
  treeRows: LayerTreeRow[],
  result: TimelineRow[],
  expandedLayerIds: string[],
  expandedGroupIds: string[],
  collapsedGroupIds: string[],
  layerGroups: Record<string, LayerGroupMeta> | undefined,
  depth = 0,
) {
  for (const row of treeRows) {
    if (row.kind === 'group') {
      result.push({ kind: 'group', groupId: row.groupId, depth })
      appendGroupPropertyRows(
        row.groupId,
        layerGroups?.[row.groupId]?.keyframes,
        result,
        expandedGroupIds,
        depth,
      )

      if (!collapsedGroupIds.includes(row.groupId)) {
        appendTimelineRows(
          row.children,
          result,
          expandedLayerIds,
          expandedGroupIds,
          collapsedGroupIds,
          layerGroups,
          depth + 1,
        )
      }

      continue
    }

    result.push({ kind: 'layer', layer: row.layer, depth })
    appendLayerPropertyRows(row.layer, result, expandedLayerIds, depth)
  }
}

export function buildTimelineRows(options: {
  displayLayers: Layer[]
  layerGroups?: Record<string, LayerGroupMeta>
  collapsedGroupIds: string[]
  expandedLayerIds: string[]
  expandedGroupIds: string[]
}): TimelineRow[] {
  const treeRows = buildLayerTreeRows(options.displayLayers, options.layerGroups)
  const result: TimelineRow[] = []

  if (treeRows.some((row) => row.kind === 'group')) {
    appendTimelineRows(
      treeRows,
      result,
      options.expandedLayerIds,
      options.expandedGroupIds,
      options.collapsedGroupIds,
      options.layerGroups,
    )
    return result
  }

  for (const layer of [...options.displayLayers].reverse()) {
    result.push({ kind: 'layer', layer, depth: 0 })
    appendLayerPropertyRows(layer, result, options.expandedLayerIds, 0)
  }

  return result
}

export function getAnimatedGroupIds(
  displayLayers: Layer[],
  layerGroups?: Record<string, LayerGroupMeta>,
): string[] {
  const treeRows = buildLayerTreeRows(displayLayers, layerGroups)
  const groupIds: string[] = []

  const walk = (rows: LayerTreeRow[]) => {
    for (const row of rows) {
      if (row.kind === 'group') {
        if ((layerGroups?.[row.groupId]?.keyframes?.length ?? 0) > 0) {
          groupIds.push(row.groupId)
        }
        walk(row.children)
      }
    }
  }

  walk(treeRows)
  return groupIds
}

export function getGroupLayers(
  groupId: string,
  displayLayers: Layer[],
  layerGroups?: Record<string, LayerGroupMeta>,
): Layer[] {
  const treeRows = buildLayerTreeRows(displayLayers, layerGroups)

  const findGroup = (rows: LayerTreeRow[]): LayerTreeRow | null => {
    for (const row of rows) {
      if (row.kind === 'group' && row.groupId === groupId) {
        return row
      }
      if (row.kind === 'group') {
        const nested = findGroup(row.children)
        if (nested) {
          return nested
        }
      }
    }
    return null
  }

  const groupRow = findGroup(treeRows)
  if (!groupRow || groupRow.kind !== 'group') {
    return []
  }

  return collectGroupLayers(groupRow)
}
