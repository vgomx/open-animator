import { createId } from '@/editor/scene'
import type { Project } from '@/editor/types'
import {
  deserializeProject,
  serializeProject,
  shouldPersistProject,
} from '@/io/project'
import { STORAGE_KEYS } from '@/lib/app'

export const MAX_RECENT_FILES = 12

export type RecentFileEntry = {
  id: string
  name: string
  updatedAt: number
  layerCount: number
  duration: number
  cached: boolean
}

type RecentFilesStore = {
  entries: RecentFileEntry[]
  projects: Record<string, string>
}

function emptyStore(): RecentFilesStore {
  return { entries: [], projects: {} }
}

function readStore(): RecentFilesStore {
  if (typeof localStorage === 'undefined') {
    return emptyStore()
  }

  const raw = localStorage.getItem(STORAGE_KEYS.recentFiles)
  if (!raw) {
    return emptyStore()
  }

  try {
    const parsed = JSON.parse(raw) as RecentFilesStore
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      projects: parsed.projects && typeof parsed.projects === 'object' ? parsed.projects : {},
    }
  } catch {
    return emptyStore()
  }
}

function writeStore(store: RecentFilesStore): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(STORAGE_KEYS.recentFiles, JSON.stringify(store))
}

export function getActiveRecentFileId(): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage.getItem(STORAGE_KEYS.activeRecentFileId)
}

export function setActiveRecentFileId(id: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(STORAGE_KEYS.activeRecentFileId, id)
}

export function deriveProjectName(project: Project, fallbackName?: string): string {
  if (fallbackName?.trim()) {
    return fallbackName.trim()
  }

  if (project.layers.length === 0) {
    return 'Untitled project'
  }

  const namedLayer = project.layers.find(
    (layer) => layer.name.trim().length > 0 && !/^layer(\s+\d+)?$/i.test(layer.name.trim()),
  )
  if (namedLayer) {
    return namedLayer.name.trim()
  }

  if (project.layers.length === 1) {
    return project.layers[0]!.name.trim() || 'Untitled project'
  }

  return `Project · ${project.layers.length} layers`
}

export function formatRecentFileDate(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 60_000) {
    return 'Just now'
  }

  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)}m ago`
  }

  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)}h ago`
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function getRecentFiles(): RecentFileEntry[] {
  return readStore().entries.sort((left, right) => right.updatedAt - left.updatedAt)
}

export function loadRecentFileProject(id: string): Project | null {
  const store = readStore()
  const raw = store.projects[id]
  if (!raw) {
    return null
  }

  try {
    return deserializeProject(raw)
  } catch {
    return null
  }
}

export function removeRecentFile(id: string): void {
  const store = readStore()
  store.entries = store.entries.filter((entry) => entry.id !== id)
  delete store.projects[id]
  writeStore(store)

  if (typeof localStorage === 'undefined') {
    return
  }

  if (getActiveRecentFileId() === id) {
    localStorage.removeItem(STORAGE_KEYS.activeRecentFileId)
  }
}

export function upsertRecentFile(
  project: Project,
  options?: {
    id?: string
    name?: string
  },
): string {
  const store = readStore()
  const id = options?.id ?? createId()
  const cached = shouldPersistProject(project)
  const entry: RecentFileEntry = {
    id,
    name: deriveProjectName(project, options?.name),
    updatedAt: Date.now(),
    layerCount: project.layers.length,
    duration: project.duration,
    cached,
  }

  store.entries = [entry, ...store.entries.filter((item) => item.id !== id)].slice(0, MAX_RECENT_FILES)

  if (cached) {
    store.projects[id] = serializeProject(project)
  } else {
    delete store.projects[id]
  }

  writeStore(store)
  setActiveRecentFileId(id)
  return id
}

export function updateActiveRecentFile(project: Project, activeId: string | null): void {
  if (!activeId) {
    return
  }

  const store = readStore()
  const index = store.entries.findIndex((entry) => entry.id === activeId)
  if (index === -1) {
    return
  }

  const cached = shouldPersistProject(project)
  const current = store.entries[index]!
  store.entries[index] = {
    ...current,
    name: deriveProjectName(project, current.name),
    updatedAt: Date.now(),
    layerCount: project.layers.length,
    duration: project.duration,
    cached,
  }

  if (cached) {
    store.projects[activeId] = serializeProject(project)
  } else {
    delete store.projects[activeId]
  }

  writeStore(store)
}

export function touchRecentFile(
  project: Project,
  activeId: string | null,
  options?: {
    recentFileId?: string
    isNewRecentFile?: boolean
    name?: string
  },
): string {
  if (options?.isNewRecentFile) {
    return upsertRecentFile(project, { name: options.name })
  }

  if (options?.recentFileId) {
    upsertRecentFile(project, { id: options.recentFileId, name: options.name })
    return options.recentFileId
  }

  if (activeId && readStore().entries.some((entry) => entry.id === activeId)) {
    updateActiveRecentFile(project, activeId)
    setActiveRecentFileId(activeId)
    return activeId
  }

  return upsertRecentFile(project, { name: options?.name })
}

export function bootstrapRecentFiles(project: Project): string {
  const activeId = getActiveRecentFileId()
  if (activeId && loadRecentFileProject(activeId)) {
    updateActiveRecentFile(project, activeId)
    return activeId
  }

  const existing = getRecentFiles().find((entry) => entry.cached && loadRecentFileProject(entry.id))
  if (existing) {
    setActiveRecentFileId(existing.id)
    updateActiveRecentFile(project, existing.id)
    return existing.id
  }

  return upsertRecentFile(project)
}
