import type { Layer, LayerGroupMeta } from '@/editor/types'

export type LayerTreeRow =
  | { kind: 'layer'; layer: Layer }
  | { kind: 'group'; groupId: string; children: LayerTreeRow[] }

function getRootGroupId(
  groupId: string,
  layerGroups?: Record<string, LayerGroupMeta>,
): string {
  let current = groupId
  while (layerGroups?.[current]?.parentGroupId) {
    current = layerGroups[current]!.parentGroupId!
  }
  return current
}

function isInGroupTree(
  groupId: string | null,
  ancestorId: string,
  layerGroups?: Record<string, LayerGroupMeta>,
): boolean {
  if (!groupId) {
    return false
  }

  let current: string | null = groupId
  while (current) {
    if (current === ancestorId) {
      return true
    }
    current = layerGroups?.[current]?.parentGroupId ?? null
  }

  return false
}

function firstLayerIndexForGroup(
  groupId: string,
  displayLayers: Layer[],
  layerGroups?: Record<string, LayerGroupMeta>,
): number {
  for (let index = 0; index < displayLayers.length; index += 1) {
    const layer = displayLayers[index]!
    if (layer.groupId === groupId || isInGroupTree(layer.groupId, groupId, layerGroups)) {
      return index
    }
  }

  return displayLayers.length
}

function buildGroupChildren(
  groupId: string,
  displayLayers: Layer[],
  layerGroups: Record<string, LayerGroupMeta> | undefined,
  seenGroups: Set<string>,
): LayerTreeRow[] {
  const childGroupIds = Object.entries(layerGroups ?? {})
    .filter(([, meta]) => meta.parentGroupId === groupId)
    .map(([id]) => id)

  type QueueItem =
    | { kind: 'layer'; layer: Layer; order: number }
    | { kind: 'group'; groupId: string; order: number }

  const items: QueueItem[] = []

  for (const layer of displayLayers) {
    if (layer.groupId === groupId) {
      items.push({ kind: 'layer', layer, order: displayLayers.indexOf(layer) })
    }
  }

  for (const childId of childGroupIds) {
    if (seenGroups.has(childId)) {
      continue
    }

    const order = firstLayerIndexForGroup(childId, displayLayers, layerGroups)
    if (order < displayLayers.length) {
      items.push({ kind: 'group', groupId: childId, order })
    }
  }

  items.sort((left, right) => left.order - right.order)

  const rows: LayerTreeRow[] = []
  for (const item of items) {
    if (item.kind === 'layer') {
      rows.push({ kind: 'layer', layer: item.layer })
      continue
    }

    seenGroups.add(item.groupId)
    rows.push({
      kind: 'group',
      groupId: item.groupId,
      children: buildGroupChildren(item.groupId, displayLayers, layerGroups, seenGroups),
    })
  }

  return rows
}

function hasNestedGroups(layerGroups?: Record<string, LayerGroupMeta>): boolean {
  return Object.values(layerGroups ?? {}).some((meta) => meta.parentGroupId !== null)
}

function buildFlatGroupRows(displayLayers: Layer[], seenGroups: Set<string>): LayerTreeRow[] {
  const result: LayerTreeRow[] = []

  for (const layer of displayLayers) {
    if (!layer.groupId) {
      result.push({ kind: 'layer', layer })
      continue
    }

    if (seenGroups.has(layer.groupId)) {
      continue
    }

    seenGroups.add(layer.groupId)
    const groupLayers = displayLayers.filter((item) => item.groupId === layer.groupId)
    result.push({
      kind: 'group',
      groupId: layer.groupId,
      children: groupLayers.map((item) => ({ kind: 'layer', layer: item })),
    })
  }

  return result
}

export function buildLayerTreeRows(
  displayLayers: Layer[],
  layerGroups?: Record<string, LayerGroupMeta>,
): LayerTreeRow[] {
  if (!hasNestedGroups(layerGroups)) {
    return buildFlatGroupRows(displayLayers, new Set<string>())
  }

  const seenGroups = new Set<string>()
  const result: LayerTreeRow[] = []

  for (const layer of displayLayers) {
    if (!layer.groupId) {
      result.push({ kind: 'layer', layer })
      continue
    }

    const rootId = getRootGroupId(layer.groupId, layerGroups)
    if (seenGroups.has(rootId)) {
      continue
    }

    seenGroups.add(rootId)
    result.push({
      kind: 'group',
      groupId: rootId,
      children: buildGroupChildren(rootId, displayLayers, layerGroups, new Set([rootId])),
    })
  }

  return result
}

export function flattenLayerTreeRows(rows: LayerTreeRow[], collapsedGroupIds: string[]): Layer[] {
  const flat: Layer[] = []

  for (const row of rows) {
    if (row.kind === 'layer') {
      flat.push(row.layer)
      continue
    }

    if (collapsedGroupIds.includes(row.groupId)) {
      continue
    }

    flat.push(...flattenLayerTreeRows(row.children, collapsedGroupIds))
  }

  return flat
}

export function collectGroupLayers(row: LayerTreeRow): Layer[] {
  if (row.kind === 'layer') {
    return [row.layer]
  }

  return row.children.flatMap(collectGroupLayers)
}
