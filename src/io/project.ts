import type { Project } from '@/editor/types'
import { PROJECT_VERSION } from '@/editor/types'
import { createDefaultProject } from '@/editor/scene'

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function deserializeProject(raw: string): Project {
  const parsed = JSON.parse(raw) as Project

  if (parsed.version !== PROJECT_VERSION) {
    throw new Error(`Unsupported project version: ${String(parsed.version)}`)
  }

  return parsed
}

export function downloadProject(project: Project, filename = 'project.json'): void {
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
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const text = await file.text()
        resolve(deserializeProject(text))
      } catch {
        resolve(null)
      }
    })

    input.click()
  })
}

export function loadProjectFromStorage(): Project | null {
  const raw = localStorage.getItem('svg-animator:project')
  if (!raw) {
    return null
  }

  try {
    return deserializeProject(raw)
  } catch {
    return null
  }
}

export function saveProjectToStorage(project: Project): void {
  localStorage.setItem('svg-animator:project', serializeProject(project))
}

export function createInitialProject(): Project {
  return loadProjectFromStorage() ?? createDefaultProject()
}
