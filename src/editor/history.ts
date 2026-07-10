import type { Project } from '@/editor/types'

export type HistorySnapshot = {
  project: Project
  selectedLayerId: string | null
  selectedLayerIds: string[]
}

export type HistoryStacks = {
  past: HistorySnapshot[]
  future: HistorySnapshot[]
}

export const HISTORY_LIMIT = 50

export function createSnapshot(
  project: Project,
  selectedLayerIds: string[],
): HistorySnapshot {
  return {
    project: structuredClone(project),
    selectedLayerIds: [...selectedLayerIds],
    selectedLayerId: selectedLayerIds[selectedLayerIds.length - 1] ?? null,
  }
}

export function pushSnapshot(
  stacks: HistoryStacks,
  snapshot: HistorySnapshot,
): HistoryStacks {
  const past = [...stacks.past, snapshot]
  if (past.length > HISTORY_LIMIT) {
    past.shift()
  }

  return {
    past,
    future: [],
  }
}

export function undoSnapshot(
  stacks: HistoryStacks,
  current: HistorySnapshot,
): { stacks: HistoryStacks; snapshot: HistorySnapshot } | null {
  if (stacks.past.length === 0) {
    return null
  }

  const past = [...stacks.past]
  const previous = past.pop()!

  return {
    stacks: {
      past,
      future: [createSnapshot(current.project, current.selectedLayerIds), ...stacks.future],
    },
    snapshot: previous,
  }
}

export function redoSnapshot(
  stacks: HistoryStacks,
  current: HistorySnapshot,
): { stacks: HistoryStacks; snapshot: HistorySnapshot } | null {
  if (stacks.future.length === 0) {
    return null
  }

  const future = [...stacks.future]
  const next = future.shift()!

  return {
    stacks: {
      past: [...stacks.past, createSnapshot(current.project, current.selectedLayerIds)],
      future,
    },
    snapshot: next,
  }
}
