import type { Project } from '@/editor/types'
import { createDefaultProject } from '@/editor/scene'
import { migrateProject } from '@/io/migrate'
import { openFilePicker } from '@/io/file-picker'
import { STORAGE_KEYS } from '@/lib/app'

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
