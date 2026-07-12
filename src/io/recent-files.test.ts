// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { createDefaultProject, createLayerFromShape, createRectShape } from '@/editor/scene'
import { LARGE_PROJECT_PERSIST_LAYER_THRESHOLD } from '@/io/project'
import {
  bootstrapRecentFiles,
  deriveProjectName,
  getRecentFiles,
  loadRecentFileProject,
  removeRecentFile,
  touchRecentFile,
  upsertRecentFile,
} from '@/io/recent-files'
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

describe('recent files', () => {
  it('derives a friendly project name', () => {
    const project = createDefaultProject()
    expect(deriveProjectName(project)).toBe('Untitled project')

    const artboardId = project.artboards[0]!.id
    project.layers = [
      createLayerFromShape(createRectShape(0, 0, 80, 50), 0, artboardId, 'Train body'),
    ]
    expect(deriveProjectName(project)).toBe('Train body')
  })

  it('stores and reloads recent files', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    const project = createDefaultProject()
    const id = upsertRecentFile(project, { name: 'Demo' })

    expect(getRecentFiles()).toHaveLength(1)
    expect(getRecentFiles()[0]).toMatchObject({
      id,
      name: 'Demo',
      cached: true,
      layerCount: 0,
    })

    const loaded = loadRecentFileProject(id)
    expect(loaded?.duration).toBe(project.duration)
  })

  it('marks large projects as not cached', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    const project = createDefaultProject()
    const artboardId = project.artboards[0]!.id
    const template = createLayerFromShape(
      createRectShape(0, 0, 80, 50),
      0,
      artboardId,
      'Layer',
    )
    project.layers = Array.from({ length: LARGE_PROJECT_PERSIST_LAYER_THRESHOLD }, (_, index) => ({
      ...template,
      id: `layer-${index}`,
      shape: { ...template.shape, id: `shape-${index}` },
    }))

    const id = upsertRecentFile(project)
    expect(getRecentFiles()[0]?.cached).toBe(false)
    expect(loadRecentFileProject(id)).toBeNull()
  })

  it('updates the active recent file instead of creating duplicates', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    const project = createDefaultProject()
    const id = bootstrapRecentFiles(project)
    touchRecentFile({ ...project, duration: 5 }, id)

    expect(getRecentFiles()).toHaveLength(1)
    expect(getRecentFiles()[0]?.duration).toBe(5)
    expect(localStorage.getItem(STORAGE_KEYS.activeRecentFileId)).toBe(id)
  })

  it('removes recent files and clears the active id', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    const id = upsertRecentFile(createDefaultProject())
    removeRecentFile(id)

    expect(getRecentFiles()).toHaveLength(0)
    expect(localStorage.getItem(STORAGE_KEYS.activeRecentFileId)).toBeNull()
  })
})
