// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isStaleSvgImportProject,
  loadProjectFromStorage,
  saveProjectToStorage,
  serializeProject,
} from '@/io/project'
import { cloneBalloonProject, getBalloonProject } from '@/io/fixtures/balloon-fixture'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { STORAGE_KEYS } from '@/lib/app'

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

describe('stale svg import cache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })
  it('detects baked-path projects without matrix keyframes', () => {
    const fresh = getBalloonProject()
    expect(isStaleSvgImportProject(fresh)).toBe(false)

    const stale = structuredClone(fresh)
    stale.layers = stale.layers.map((layer) => {
      if (layer.shape.type !== 'path') {
        return layer
      }

      return {
        ...layer,
        matrixKeyframes: undefined,
        shape: {
          ...layer.shape,
          localCoords: undefined,
          points: layer.shape.points.map((point, index) => ({
            ...point,
            x: index === 0 ? 1080 : point.x,
          })),
        },
      }
    })

    expect(isStaleSvgImportProject(stale)).toBe(true)
  })

  it('detects matrix-only projects missing timeline display keyframes', () => {
    const fresh = getBalloonProject()
    expect(isStaleSvgImportProject(fresh)).toBe(false)

    const stale = structuredClone(fresh)
    stale.layers = stale.layers.map((layer) =>
      matrixKeyframesHaveMotion(layer.matrixKeyframes)
        ? { ...layer, keyframes: [] }
        : layer,
    )

    expect(isStaleSvgImportProject(stale)).toBe(true)
  })

  it('detects localCoords paths missing matrix keyframes', () => {
    const fresh = getBalloonProject()
    const stale = structuredClone(fresh)
    stale.layers = stale.layers.map((layer) =>
      layer.shape.type === 'path' && layer.shape.localCoords
        ? { ...layer, matrixKeyframes: undefined }
        : layer,
    )

    expect(isStaleSvgImportProject(stale)).toBe(true)
  })

  it('drops stale cached projects on load', () => {
    const stale = cloneBalloonProject()
    stale.layers = stale.layers.map((layer) =>
      layer.shape.type === 'path'
        ? {
            ...layer,
            matrixKeyframes: undefined,
            shape: { ...layer.shape, localCoords: undefined },
          }
        : layer,
    )

    localStorage.setItem(STORAGE_KEYS.project, serializeProject(stale))
    expect(loadProjectFromStorage()).toBeNull()
    expect(localStorage.getItem(STORAGE_KEYS.project)).toBeNull()
  })

  it('keeps fresh cached projects on load when under the persistence threshold', () => {
    const fresh = getBalloonProject()
    const smallFresh = {
      ...fresh,
      layers: fresh.layers.slice(0, 20),
    }
    saveProjectToStorage(smallFresh)
    const loaded = loadProjectFromStorage()
    expect(loaded).not.toBeNull()
    expect(isStaleSvgImportProject(loaded!)).toBe(false)
  })

  it('does not persist large cached projects', () => {
    const fresh = getBalloonProject()
    saveProjectToStorage(fresh)
    expect(localStorage.getItem(STORAGE_KEYS.project)).toBeNull()
  })
})
