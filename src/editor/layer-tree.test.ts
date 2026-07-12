// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  buildLayerTreeRows,
  collectGroupLayers,
  flattenLayerTreeRows,
} from '@/editor/layer-tree'
import type { Layer, LayerGroupMeta } from '@/editor/types'

function makeLayer(id: string, groupId: string | null = null): Layer {
  return {
    id,
    artboardId: 'artboard-1',
    name: id,
    visible: true,
    locked: false,
    groupId,
    delay: 0,
    shape: {
      id: `${id}-shape`,
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      rotation: 0,
      scaleX: 1, scaleY: 1,
      opacity: 1,
      fill: '#000000',
      stroke: 'none',
      strokeWidth: 0,
    },
    keyframes: [],
  }
}

describe('layer tree', () => {
  it('builds nested svg group rows from parentGroupId metadata', () => {
    const layerGroups: Record<string, LayerGroupMeta> = {
      root: { name: 'root', parentGroupId: null },
      child: { name: 'child', parentGroupId: 'root' },
    }

    const displayLayers = [
      makeLayer('layer-a', 'child'),
      makeLayer('layer-b', 'child'),
      makeLayer('layer-c', 'root'),
      makeLayer('solo'),
    ]

    const rows = buildLayerTreeRows(displayLayers, layerGroups)
    expect(rows).toHaveLength(2)

    const rootRow = rows[0]
    expect(rootRow?.kind).toBe('group')
    if (rootRow?.kind !== 'group') {
      return
    }

    expect(rootRow.groupId).toBe('root')
    expect(rootRow.children).toHaveLength(2)

    const childRow = rootRow.children[0]
    expect(childRow?.kind).toBe('group')
    if (childRow?.kind !== 'group') {
      return
    }

    expect(childRow.groupId).toBe('child')
    expect(collectGroupLayers(childRow).map((layer) => layer.id)).toEqual(['layer-a', 'layer-b'])

    const directLayer = rootRow.children[1]
    expect(directLayer?.kind).toBe('layer')
    if (directLayer?.kind !== 'layer') {
      return
    }

    expect(directLayer.layer.id).toBe('layer-c')

    const soloRow = rows[1]
    expect(soloRow?.kind).toBe('layer')
    if (soloRow?.kind !== 'layer') {
      return
    }

    expect(soloRow.layer.id).toBe('solo')
  })

  it('flattens nested rows while respecting collapsed groups', () => {
    const layerGroups: Record<string, LayerGroupMeta> = {
      root: { name: 'root', parentGroupId: null },
      child: { name: 'child', parentGroupId: 'root' },
    }

    const displayLayers = [makeLayer('layer-a', 'child'), makeLayer('solo')]
    const rows = buildLayerTreeRows(displayLayers, layerGroups)

    expect(flattenLayerTreeRows(rows, []).map((layer) => layer.id)).toEqual(['layer-a', 'solo'])
    expect(flattenLayerTreeRows(rows, ['root']).map((layer) => layer.id)).toEqual(['solo'])
  })
})
