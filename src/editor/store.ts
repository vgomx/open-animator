import { create } from 'zustand'

import { samplePropertyAtTime } from '@/editor/animation'
import {
  createSnapshot,
  pushSnapshot,
  redoSnapshot,
  undoSnapshot,
  type HistoryStacks,
} from '@/editor/history'
import { cloneLayer, createId, createLayer } from '@/editor/scene'
import { clampZoom, zoomAtPoint } from '@/editor/viewport'
import type {
  AnimatableProperty,
  EasingType,
  Keyframe,
  Layer,
  PlaybackState,
  Project,
  Shape,
  ShapeType,
} from '@/editor/types'
import { createInitialProject, saveProjectToStorage } from '@/io/project'

const animatableProperties = new Set<AnimatableProperty>(['x', 'y', 'opacity', 'scale'])

type EditorStore = {
  project: Project
  selectedLayerId: string | null
  currentTime: number
  playbackState: PlaybackState
  loop: boolean
  recordMode: boolean
  zoom: number
  panX: number
  panY: number
  history: HistoryStacks
  setSelectedLayerId: (layerId: string | null) => void
  addShape: (type: ShapeType) => void
  removeSelectedLayer: () => void
  duplicateSelectedLayer: () => void
  updateLayer: (layerId: string, patch: Partial<Layer>) => void
  updateShape: (layerId: string, patch: Partial<Shape>, options?: { skipHistory?: boolean }) => void
  setCurrentTime: (time: number) => void
  setPlaybackState: (state: PlaybackState) => void
  toggleLoop: () => void
  toggleRecordMode: () => void
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  panBy: (deltaX: number, deltaY: number) => void
  zoomAtPoint: (
    factor: number,
    pointX: number,
    pointY: number,
    viewportWidth: number,
    viewportHeight: number,
  ) => void
  fitToScreen: (viewportWidth: number, viewportHeight: number) => void
  resetViewport: () => void
  setProject: (project: Project) => void
  addKeyframeAtCurrentTime: (property: AnimatableProperty) => void
  setKeyframeEasing: (property: AnimatableProperty, easing: EasingType) => void
  undo: () => void
  redo: () => void
  beginHistoryTransaction: () => void
  getAnimatedShape: (layer: Layer, time: number) => Shape
}

function persistProject(project: Project): void {
  saveProjectToStorage(project)
}

function upsertKeyframe(
  layer: Layer,
  time: number,
  property: AnimatableProperty,
  value: number,
): Keyframe[] {
  const existingIndex = layer.keyframes.findIndex(
    (keyframe) =>
      keyframe.property === property && Math.abs(keyframe.time - time) < 0.001,
  )

  const nextKeyframes = [...layer.keyframes]
  if (existingIndex >= 0) {
    nextKeyframes[existingIndex] = {
      ...nextKeyframes[existingIndex],
      value,
    }
  } else {
    nextKeyframes.push({
      id: createId(),
      time,
      property,
      value,
    })
  }

  return nextKeyframes
}

function applyAutoKeyframes(
  layer: Layer,
  patch: Partial<Shape>,
  currentTime: number,
  recordMode: boolean,
): Keyframe[] {
  if (!recordMode) {
    return layer.keyframes
  }

  let keyframes = layer.keyframes
  for (const [property, value] of Object.entries(patch)) {
    if (!animatableProperties.has(property as AnimatableProperty)) {
      continue
    }

    if (typeof value !== 'number') {
      continue
    }

    keyframes = upsertKeyframe(
      { ...layer, keyframes },
      currentTime,
      property as AnimatableProperty,
      value,
    )
  }

  return keyframes
}

function withHistory<T extends EditorStore>(
  state: T,
  apply: (state: T) => Partial<EditorStore>,
): Partial<EditorStore> {
  const snapshot = createSnapshot(state.project, state.selectedLayerId)
  const next = apply(state)
  const project = next.project ?? state.project

  persistProject(project)

  return {
    ...next,
    history: pushSnapshot(state.history, snapshot),
  }
}

function restoreSnapshot(snapshot: ReturnType<typeof createSnapshot>): Partial<EditorStore> {
  persistProject(snapshot.project)

  return {
    project: snapshot.project,
    selectedLayerId: snapshot.selectedLayerId,
    playbackState: 'idle',
  }
}

export const useEditorStore = create<EditorStore>((set) => ({
  project: createInitialProject(),
  selectedLayerId: null,
  currentTime: 0,
  playbackState: 'idle',
  loop: true,
  recordMode: true,
  zoom: 1,
  panX: 0,
  panY: 0,
  history: { past: [], future: [] },

  setSelectedLayerId: (layerId) => set({ selectedLayerId: layerId }),

  addShape: (type) =>
    set((state) =>
      withHistory(state, (current) => {
        const layer = createLayer(type, current.project.layers.length)
        const project = {
          ...current.project,
          layers: [...current.project.layers, layer],
        }

        return {
          project,
          selectedLayerId: layer.id,
        }
      }),
    ),

  removeSelectedLayer: () =>
    set((state) => {
      if (!state.selectedLayerId) {
        return state
      }

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.filter((layer) => layer.id !== current.selectedLayerId),
        },
        selectedLayerId: null,
      }))
    }),

  duplicateSelectedLayer: () =>
    set((state) => {
      if (!state.selectedLayerId) {
        return state
      }

      return withHistory(state, (current) => {
        const layer = current.project.layers.find((item) => item.id === current.selectedLayerId)
        if (!layer) {
          return {}
        }

        const duplicate = cloneLayer(layer)
        const project = {
          ...current.project,
          layers: [...current.project.layers, duplicate],
        }

        return {
          project,
          selectedLayerId: duplicate.id,
        }
      })
    }),

  updateLayer: (layerId, patch) =>
    set((state) =>
      withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) =>
            layer.id === layerId ? { ...layer, ...patch } : layer,
          ),
        },
      })),
    ),

  updateShape: (layerId, patch, options) =>
    set((state) => {
      const applyUpdate = (current: EditorStore): Partial<EditorStore> => {
        const project = {
          ...current.project,
          layers: current.project.layers.map((layer) => {
            if (layer.id !== layerId) {
              return layer
            }

            const shape = { ...layer.shape, ...patch } as Shape
            const keyframes = applyAutoKeyframes(
              layer,
              patch,
              current.currentTime,
              current.recordMode,
            )

            return {
              ...layer,
              shape,
              keyframes,
            }
          }),
        }

        return { project }
      }

      if (options?.skipHistory) {
        const next = applyUpdate(state)
        const project = next.project ?? state.project
        persistProject(project)
        return next
      }

      return withHistory(state, applyUpdate)
    }),

  setCurrentTime: (time) =>
    set((state) => ({
      currentTime: Math.max(0, Math.min(time, state.project.duration)),
    })),

  setPlaybackState: (playbackState) => set({ playbackState }),

  toggleLoop: () => set((state) => ({ loop: !state.loop })),

  toggleRecordMode: () => set((state) => ({ recordMode: !state.recordMode })),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  setPan: (panX, panY) => set({ panX, panY }),

  panBy: (deltaX, deltaY) =>
    set((state) => ({
      panX: state.panX - deltaX,
      panY: state.panY - deltaY,
    })),

  zoomAtPoint: (factor, pointX, pointY, viewportWidth, viewportHeight) =>
    set((state) =>
      zoomAtPoint({
        zoom: state.zoom,
        panX: state.panX,
        panY: state.panY,
        factor,
        pointX,
        pointY,
        viewportWidth,
        viewportHeight,
      }),
    ),

  fitToScreen: (viewportWidth, viewportHeight) =>
    set((state) => {
      const { width, height } = state.project.artboard
      const padding = 80
      const zoom = Math.min(
        (viewportWidth - padding) / width,
        (viewportHeight - padding) / height,
        3,
      )

      return {
        zoom: clampZoom(zoom),
        panX: 0,
        panY: 0,
      }
    }),

  resetViewport: () => set({ zoom: 1, panX: 0, panY: 0 }),

  setProject: (project) => {
    persistProject(project)
    set({
      project,
      selectedLayerId: project.layers[0]?.id ?? null,
      currentTime: 0,
      playbackState: 'idle',
      history: { past: [], future: [] },
      panX: 0,
      panY: 0,
    })
  },

  addKeyframeAtCurrentTime: (property) =>
    set((state) => {
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId)
      if (!layer) {
        return state
      }

      return withHistory(state, (current) => {
        const selected = current.project.layers.find((item) => item.id === current.selectedLayerId)
        if (!selected) {
          return {}
        }

        const value = selected.shape[property]
        const project = {
          ...current.project,
          layers: current.project.layers.map((item) =>
            item.id === selected.id
              ? {
                  ...item,
                  keyframes: upsertKeyframe(item, current.currentTime, property, value),
                }
              : item,
          ),
        }

        return { project }
      })
    }),

  setKeyframeEasing: (property, easing) =>
    set((state) => {
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId)
      if (!layer) {
        return state
      }

      return withHistory(state, (current) => {
        const selected = current.project.layers.find((item) => item.id === current.selectedLayerId)
        if (!selected) {
          return {}
        }

        const project = {
          ...current.project,
          layers: current.project.layers.map((item) => {
            if (item.id !== selected.id) {
              return item
            }

            const existingIndex = item.keyframes.findIndex(
              (keyframe) =>
                keyframe.property === property &&
                Math.abs(keyframe.time - current.currentTime) < 0.001,
            )

            if (existingIndex < 0) {
              return item
            }

            const keyframes = [...item.keyframes]
            keyframes[existingIndex] = {
              ...keyframes[existingIndex],
              easing,
            }

            return { ...item, keyframes }
          }),
        }

        return { project }
      })
    }),

  undo: () =>
    set((state) => {
      const result = undoSnapshot(state.history, createSnapshot(state.project, state.selectedLayerId))
      if (!result) {
        return state
      }

      return {
        ...restoreSnapshot(result.snapshot),
        history: result.stacks,
      }
    }),

  redo: () =>
    set((state) => {
      const result = redoSnapshot(state.history, createSnapshot(state.project, state.selectedLayerId))
      if (!result) {
        return state
      }

      return {
        ...restoreSnapshot(result.snapshot),
        history: result.stacks,
      }
    }),

  beginHistoryTransaction: () =>
    set((state) => ({
      history: pushSnapshot(state.history, createSnapshot(state.project, state.selectedLayerId)),
    })),

  getAnimatedShape: (layer, time) => {
    const { shape, keyframes } = layer
    return {
      ...shape,
      x: samplePropertyAtTime(keyframes, 'x', time, shape.x),
      y: samplePropertyAtTime(keyframes, 'y', time, shape.y),
      opacity: samplePropertyAtTime(keyframes, 'opacity', time, shape.opacity),
      scale: samplePropertyAtTime(keyframes, 'scale', time, shape.scale),
    }
  },
}))

export function useSelectedLayer(): Layer | null {
  return useEditorStore((state) => {
    if (!state.selectedLayerId) {
      return null
    }

    return state.project.layers.find((layer) => layer.id === state.selectedLayerId) ?? null
  })
}
