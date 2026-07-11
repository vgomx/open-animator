import type { Artboard, Layer, Project } from '@/editor/types'
import { createArtboard, DEFAULT_PROJECT_FPS } from '@/editor/types'

export function getArtboard(project: Project, artboardId: string): Artboard | undefined {
  return project.artboards.find((artboard) => artboard.id === artboardId)
}

export function getActiveArtboard(project: Project, activeArtboardId: string | null): Artboard {
  const resolvedId = activeArtboardId ?? project.artboards[0]?.id
  const artboard = resolvedId ? getArtboard(project, resolvedId) : undefined
  return artboard ?? project.artboards[0] ?? createArtboard({ width: 800, height: 600 })
}

export function getArtboardLayers(project: Project, artboardId: string): Layer[] {
  return project.layers.filter((layer) => layer.artboardId === artboardId)
}

export function ensureActiveArtboardId(project: Project, activeArtboardId: string | null): string {
  if (activeArtboardId && getArtboard(project, activeArtboardId)) {
    return activeArtboardId
  }

  return project.artboards[0]?.id ?? createArtboard({ width: 800, height: 600 }).id
}

export function getProjectFps(project: Project): number {
  return Number.isFinite(project.fps) ? project.fps : DEFAULT_PROJECT_FPS
}

export function getExportArtboard(project: Project, artboardId?: string): Artboard {
  return getActiveArtboard(project, artboardId ?? project.artboards[0]?.id ?? null)
}

export function getExportLayers(project: Project, artboardId?: string): Layer[] {
  const artboard = getExportArtboard(project, artboardId)
  return getArtboardLayers(project, artboard.id)
}
