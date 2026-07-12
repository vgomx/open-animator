import { describe, expect, it } from 'vitest'

import { createDefaultProject } from '@/editor/scene'
import {
  applyDocumentTabSession,
  captureDocumentTabSession,
  createDocumentTab,
  saveActiveDocumentTab,
} from '@/editor/document-tabs'

describe('document tabs', () => {
  it('captures and restores a document session', () => {
    const project = createDefaultProject()
    const session = captureDocumentTabSession({
      project,
      activeRecentFileId: 'recent-1',
      activeArtboardId: project.artboards[0]?.id ?? null,
      selectedLayerIds: [],
      selectedLayerId: null,
      selectedGroupId: null,
      currentTime: 1.5,
      playbackState: 'paused',
      zoom: 1.25,
      panX: 12,
      panY: -8,
      history: { past: [], future: [] },
      selectedKeyframeIds: [],
      selectedNodeIndices: [],
      collapsedGroupIds: [],
    })

    const restored = applyDocumentTabSession(session)
    expect(restored.currentTime).toBe(1.5)
    expect(restored.playbackState).toBe('paused')
    expect(restored.zoom).toBe(1.25)
    expect(restored.activeRecentFileId).toBe('recent-1')
  })

  it('updates the active tab snapshot', () => {
    const project = createDefaultProject()
    const tab = createDocumentTab(
      captureDocumentTabSession({
        project,
        activeRecentFileId: null,
        activeArtboardId: project.artboards[0]?.id ?? null,
        selectedLayerIds: [],
        selectedLayerId: null,
        selectedGroupId: null,
        currentTime: 0,
        playbackState: 'idle',
        zoom: 1,
        panX: 0,
        panY: 0,
        history: { past: [], future: [] },
        selectedKeyframeIds: [],
        selectedNodeIndices: [],
        collapsedGroupIds: [],
      }),
      'Untitled project',
    )

    const next = saveActiveDocumentTab([tab], tab.id, {
      project: { ...project, duration: 6 },
      activeRecentFileId: 'recent-2',
      activeArtboardId: project.artboards[0]?.id ?? null,
      selectedLayerIds: [],
      selectedLayerId: null,
      selectedGroupId: null,
      currentTime: 2,
      playbackState: 'playing',
      zoom: 2,
      panX: 0,
      panY: 0,
      history: { past: [], future: [] },
      selectedKeyframeIds: [],
      selectedNodeIndices: [],
      collapsedGroupIds: [],
    })

    expect(next[0]?.session.project.duration).toBe(6)
    expect(next[0]?.session.currentTime).toBe(2)
    expect(next[0]?.session.playbackState).toBe('playing')
  })
})
