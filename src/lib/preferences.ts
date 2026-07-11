import { STORAGE_KEYS } from '@/lib/app'
import {
  LAYERS_PANEL_WIDTH,
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  PROPERTIES_PANEL_WIDTH,
} from '@/editor/layout-constants'

export type EditorPreferences = {
  snapEnabled: boolean
  showRulers: boolean
  showLayersPanel: boolean
  showPropertiesPanel: boolean
  layersPanelWidth: number
  propertiesPanelWidth: number
  loop: boolean
  recordMode: boolean
  onionSkinEnabled: boolean
  defaultExportFps: number
  experimentalWebGlViewport: boolean
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  snapEnabled: true,
  showRulers: true,
  showLayersPanel: true,
  showPropertiesPanel: true,
  layersPanelWidth: LAYERS_PANEL_WIDTH,
  propertiesPanelWidth: PROPERTIES_PANEL_WIDTH,
  loop: true,
  recordMode: true,
  onionSkinEnabled: false,
  defaultExportFps: 30,
  experimentalWebGlViewport: false,
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
      layersPanelWidth: clampPanelWidth(
        parsed.layersPanelWidth ?? DEFAULT_EDITOR_PREFERENCES.layersPanelWidth,
      ),
      propertiesPanelWidth: clampPanelWidth(
        parsed.propertiesPanelWidth ?? DEFAULT_EDITOR_PREFERENCES.propertiesPanelWidth,
      ),
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

  if (patch.layersPanelWidth !== undefined) {
    next.layersPanelWidth = clampPanelWidth(patch.layersPanelWidth)
  }

  if (patch.propertiesPanelWidth !== undefined) {
    next.propertiesPanelWidth = clampPanelWidth(patch.propertiesPanelWidth)
  }

  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(next))
}

export function clampPanelWidth(value: number): number {
  if (!Number.isFinite(value)) {
    return LAYERS_PANEL_WIDTH
  }

  return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, Math.round(value)))
}

export function clampExportFps(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_EDITOR_PREFERENCES.defaultExportFps
  }

  return Math.max(12, Math.min(60, Math.round(value)))
}
