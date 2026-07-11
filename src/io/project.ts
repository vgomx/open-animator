import type { Project } from '@/editor/types'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'
import { createDefaultProject } from '@/editor/scene'
import { migrateProject } from '@/io/migrate'
import { openFilePicker } from '@/io/file-picker'
import { STORAGE_KEYS } from '@/lib/app'

/**
 * Detects cached projects produced by a broken SVG import that baked world-space
 * path coordinates without matrixKeyframes/localCoords. Those projects render
 * static artwork but never animate.
 */
export function isStaleSvgImportProject(project: Project): boolean {
  const pathLayers = project.layers.filter((layer) => layer.shape.type === 'path')
  if (pathLayers.length < 200) {
    return false
  }

  const localWithoutMatrix = pathLayers.filter(
    (layer) =>
      layer.shape.type === 'path' &&
      layer.shape.localCoords &&
      (layer.matrixKeyframes?.length ?? 0) === 0,
  ).length

  if (localWithoutMatrix > pathLayers.length * 0.1) {
    return true
  }

  const matrixBacked = pathLayers.filter((layer) => (layer.matrixKeyframes?.length ?? 0) > 0).length

  if (matrixBacked < pathLayers.length * 0.5) {
    return true
  }

  const maskedLayers = pathLayers.filter((layer) => layer.svgMaskId)
  const expectsMasks =
    pathLayers.length >= 300 &&
    Boolean(project.importedSvg?.gradients) &&
    Object.keys(project.importedSvg?.gradients ?? {}).length > 50

  if (expectsMasks && maskedLayers.length === 0) {
    return true
  }

  const motionWithoutDisplay = pathLayers.filter(
    (layer) =>
      layer.shape.type === 'path' &&
      matrixKeyframesHaveMotion(layer.matrixKeyframes) &&
      layer.keyframes.length === 0,
  ).length

  if (motionWithoutDisplay > 0) {
    return true
  }

  return false
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function deserializeProject(raw: string): Project {
  const parsed = JSON.parse(raw) as Project & { version: number }
  return migrateProject(parsed)
}

export function downloadProject(project: Project, filename = 'open-animator-project.json'): void {
  const blob = new Blob([serializeProject(project)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function openProjectFile(): Promise<Project | null> {
  const picked = await openFilePicker({
    accept: 'application/json,.json',
    isAccepted: (file) =>
      file.name.toLowerCase().endsWith('.json') || file.type === 'application/json',
  })

  if (picked.status !== 'ok') {
    return null
  }

  try {
    return deserializeProject(picked.text)
  } catch {
    return null
  }
}

export function loadProjectFromStorage(): Project | null {
  const raw =
    localStorage.getItem(STORAGE_KEYS.project) ??
    localStorage.getItem(STORAGE_KEYS.legacyProject)

  if (!raw) {
    return null
  }

  try {
    const project = deserializeProject(raw)
    if (isStaleSvgImportProject(project)) {
      localStorage.removeItem(STORAGE_KEYS.project)
      localStorage.removeItem(STORAGE_KEYS.legacyProject)
      return null
    }
    if (!localStorage.getItem(STORAGE_KEYS.project)) {
      saveProjectToStorage(project)
      localStorage.removeItem(STORAGE_KEYS.legacyProject)
    }
    return project
  } catch {
    return null
  }
}

export function saveProjectToStorage(project: Project): void {
  localStorage.setItem(STORAGE_KEYS.project, serializeProject(project))
}

export function createInitialProject(): Project {
  return loadProjectFromStorage() ?? createDefaultProject()
}
