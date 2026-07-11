// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { createDefaultProject, createRectShape, createLayerFromShape } from '@/editor/scene'
import {
  LARGE_PROJECT_PERSIST_LAYER_THRESHOLD,
  saveProjectToStorage,
  shouldPersistProject,
} from '@/io/project'
import { STORAGE_KEYS } from '@/lib/app'

function createStorageMock(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, value)
    },
  }
}

describe('project persistence', () => {
  it('skips localStorage writes for large projects', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    const small = createDefaultProject()
    saveProjectToStorage(small)
    expect(localStorage.getItem(STORAGE_KEYS.project)).toBeTruthy()

    localStorage.clear()

    const template = createLayerFromShape(
      createRectShape(0, 0, 80, 50),
      0,
      small.artboards[0]!.id,
      'Layer',
    )
    const large = {
      ...createDefaultProject(),
      layers: Array.from({ length: LARGE_PROJECT_PERSIST_LAYER_THRESHOLD }, (_, index) => ({
        ...template,
        id: `layer-${index}`,
        shape: { ...template.shape, id: `shape-${index}` },
      })),
    }

    expect(shouldPersistProject(large)).toBe(false)
    saveProjectToStorage(large)
    expect(localStorage.getItem(STORAGE_KEYS.project)).toBeNull()
  })
})
