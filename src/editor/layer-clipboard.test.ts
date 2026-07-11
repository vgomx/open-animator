// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createDefaultProject, createLayerFromShape, createRectShape } from '@/editor/scene'

function createStorageMock() {
  const storage = new Map<string, string>()
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
  }
}

describe('layer clipboard', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
    vi.stubGlobal('sessionStorage', createStorageMock())
  })

  it('copies and pastes selected layers with offset', async () => {
    const { useEditorStore } = await import('@/editor/store')
    const project = createDefaultProject()
    const artboardId = project.artboards[0]!.id
    const layer = createLayerFromShape(createRectShape(10, 20, 80, 50), 0, artboardId, 'Box')

    useEditorStore.setState({
      project: { ...project, layers: [layer] },
      selectedLayerIds: [layer.id],
      selectedLayerId: layer.id,
      layerClipboard: [],
    })

    useEditorStore.getState().copySelectedLayers()
    expect(useEditorStore.getState().layerClipboard).toHaveLength(1)
    expect(useEditorStore.getState().layerClipboard[0]?.name).toBe('Box copy')

    useEditorStore.getState().pasteSelectedLayers()
    const next = useEditorStore.getState()

    expect(next.project.layers).toHaveLength(2)
    expect(next.selectedLayerIds).toHaveLength(1)
    expect(next.project.layers[1]?.shape.x).toBe(30)
    expect(next.project.layers[1]?.shape.y).toBe(40)
  })
})
