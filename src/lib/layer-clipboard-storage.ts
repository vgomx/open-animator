import type { Layer } from '@/editor/types'
import { STORAGE_KEYS } from '@/lib/app'

export function loadLayerClipboard(): Layer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.layerClipboard)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as Layer[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLayerClipboard(layers: Layer[]): void {
  if (layers.length === 0) {
    localStorage.removeItem(STORAGE_KEYS.layerClipboard)
    return
  }

  localStorage.setItem(STORAGE_KEYS.layerClipboard, JSON.stringify(layers))
}
