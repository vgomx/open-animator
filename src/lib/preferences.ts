import { STORAGE_KEYS } from '@/lib/app'

export type EditorPreferences = {
  snapEnabled: boolean
  showRulers: boolean
  showLayersPanel: boolean
  showPropertiesPanel: boolean
  loop: boolean
  recordMode: boolean
  onionSkinEnabled: boolean
  defaultExportFps: number
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  snapEnabled: true,
  showRulers: true,
  showLayersPanel: true,
  showPropertiesPanel: true,
  loop: true,
  recordMode: true,
  onionSkinEnabled: false,
  defaultExportFps: 30,
}

export function loadEditorPreferences(): EditorPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.preferences)
    if (!raw) {
      return DEFAULT_EDITOR_PREFERENCES
    }

    const parsed = JSON.parse(raw) as Partial<EditorPreferences>
    return {
      ...DEFAULT_EDITOR_PREFERENCES,
      ...parsed,
      defaultExportFps: clampExportFps(parsed.defaultExportFps ?? DEFAULT_EDITOR_PREFERENCES.defaultExportFps),
    }
  } catch {
    return DEFAULT_EDITOR_PREFERENCES
  }
}

export function saveEditorPreferences(patch: Partial<EditorPreferences>): void {
  const current = loadEditorPreferences()
  const next = {
    ...current,
    ...patch,
  }

  if (patch.defaultExportFps !== undefined) {
    next.defaultExportFps = clampExportFps(patch.defaultExportFps)
  }

  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(next))
}

export function clampExportFps(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_EDITOR_PREFERENCES.defaultExportFps
  }

  return Math.max(12, Math.min(60, Math.round(value)))
}
