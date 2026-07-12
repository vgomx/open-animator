// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/lib/app'
import {
  DEFAULT_EDITOR_PREFERENCES,
  loadEditorPreferences,
  saveEditorPreferences,
} from '@/lib/preferences'

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

describe('editor preferences', () => {
  it('persists skipWelcomeModal', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    expect(loadEditorPreferences().skipWelcomeModal).toBe(false)

    saveEditorPreferences({ skipWelcomeModal: true })

    expect(loadEditorPreferences().skipWelcomeModal).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.preferences) ?? '{}').skipWelcomeModal).toBe(
      true,
    )
  })

  it('defaults skipWelcomeModal when preferences are missing', () => {
    vi.stubGlobal('localStorage', createStorageMock())

    expect(DEFAULT_EDITOR_PREFERENCES.skipWelcomeModal).toBe(false)
    expect(loadEditorPreferences().skipWelcomeModal).toBe(false)
  })
})
