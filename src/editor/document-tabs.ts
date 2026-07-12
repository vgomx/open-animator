import { createId } from '@/editor/scene'
import type { HistoryStacks } from '@/editor/history'
import type { PlaybackState, Project } from '@/editor/types'
import { deriveProjectName } from '@/io/recent-files'

export type DocumentTabSession = {
  project: Project
  activeRecentFileId: string | null
  activeArtboardId: string | null
  selectedLayerIds: string[]
  selectedLayerId: string | null
  selectedGroupId: string | null
  currentTime: number
  playbackState: PlaybackState
  zoom: number
  panX: number
  panY: number
  history: HistoryStacks
  selectedKeyframeIds: string[]
  selectedNodeIndices: number[]
  collapsedGroupIds: string[]
}

export type DocumentTab = {
  id: string
  name: string
  session: DocumentTabSession
}

export type DocumentTabStoreSlice = {
  project: Project
  activeRecentFileId: string | null
  activeArtboardId: string | null
  selectedLayerIds: string[]
  selectedLayerId: string | null
  selectedGroupId: string | null
  currentTime: number
  playbackState: PlaybackState
  zoom: number
  panX: number
  panY: number
  history: HistoryStacks
  selectedKeyframeIds: string[]
  selectedNodeIndices: number[]
  collapsedGroupIds: string[]
}

export function captureDocumentTabSession(state: DocumentTabStoreSlice): DocumentTabSession {
  return {
    project: structuredClone(state.project),
    activeRecentFileId: state.activeRecentFileId,
    activeArtboardId: state.activeArtboardId,
    selectedLayerIds: [...state.selectedLayerIds],
    selectedLayerId: state.selectedLayerId,
    selectedGroupId: state.selectedGroupId,
    currentTime: state.currentTime,
    playbackState: state.playbackState,
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
    history: {
      past: state.history.past.map((snapshot) => structuredClone(snapshot)),
      future: state.history.future.map((snapshot) => structuredClone(snapshot)),
    },
    selectedKeyframeIds: [...state.selectedKeyframeIds],
    selectedNodeIndices: [...state.selectedNodeIndices],
    collapsedGroupIds: [...state.collapsedGroupIds],
  }
}

export function applyDocumentTabSession(session: DocumentTabSession): DocumentTabStoreSlice {
  return {
    project: structuredClone(session.project),
    activeRecentFileId: session.activeRecentFileId,
    activeArtboardId: session.activeArtboardId,
    selectedLayerIds: [...session.selectedLayerIds],
    selectedLayerId: session.selectedLayerId,
    selectedGroupId: session.selectedGroupId,
    currentTime: session.currentTime,
    playbackState: session.playbackState,
    zoom: session.zoom,
    panX: session.panX,
    panY: session.panY,
    history: {
      past: session.history.past.map((snapshot) => structuredClone(snapshot)),
      future: session.history.future.map((snapshot) => structuredClone(snapshot)),
    },
    selectedKeyframeIds: [...session.selectedKeyframeIds],
    selectedNodeIndices: [...session.selectedNodeIndices],
    collapsedGroupIds: [...session.collapsedGroupIds],
  }
}

export function createDocumentTab(session: DocumentTabSession, name?: string): DocumentTab {
  return {
    id: createId(),
    name: name ?? deriveProjectName(session.project),
    session,
  }
}

export function saveActiveDocumentTab(
  tabs: DocumentTab[],
  activeTabId: string,
  state: DocumentTabStoreSlice,
): DocumentTab[] {
  return tabs.map((tab) =>
    tab.id === activeTabId
      ? {
          ...tab,
          name: deriveProjectName(state.project, tab.name),
          session: captureDocumentTabSession(state),
        }
      : tab,
  )
}

export function findDocumentTabByRecentFileId(
  tabs: DocumentTab[],
  recentFileId: string | undefined,
): DocumentTab | undefined {
  if (!recentFileId) {
    return undefined
  }

  return tabs.find((tab) => tab.session.activeRecentFileId === recentFileId)
}
