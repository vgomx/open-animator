import { create } from 'zustand'

import { samplePropertyAtTime } from '@/editor/animation'
import { createId, createLayer } from '@/editor/scene'
import type {
  AnimatableProperty,
  Layer,
  PlaybackState,
  Project,
  Shape,
  ShapeType,
} from '@/editor/types'
import { createInitialProject, saveProjectToStorage } from '@/io/project'

type EditorStore = {
  project: Project
  selectedLayerId: string | null
  currentTime: number
  playbackState: PlaybackState
  loop: boolean
  zoom: number
  setSelectedLayerId: (layerId: string | null) => void
  addShape: (type: ShapeType) => void
  removeSelectedLayer: () => void
  updateLayer: (layerId: string, patch: Partial<Layer>) => void
  updateShape: (layerId: string, patch: Partial<Shape>) => void
  setCurrentTime: (time: number) => void
  setPlaybackState: (state: PlaybackState) => void
  toggleLoop: () => void
  setZoom: (zoom: number) => void
  setProject: (project: Project) => void
  addKeyframeAtCurrentTime: (property: AnimatableProperty) => void
  getAnimatedShape: (layer: Layer, time: number) => Shape
}

function persistProject(project: Project): void {
  saveProjectToStorage(project)
}

export const useEditorStore = create<EditorStore>((set) => ({
  project: createInitialProject(),
  selectedLayerId: null,
  currentTime: 0,
  playbackState: 'idle',
  loop: true,
  zoom: 1,

  setSelectedLayerId: (layerId) => set({ selectedLayerId: layerId }),

  addShape: (type) =>
    set((state) => {
      const layer = createLayer(type, state.project.layers.length)
      const project = {
        ...state.project,
        layers: [...state.project.layers, layer],
      }
      persistProject(project)
      return {
        project,
        selectedLayerId: layer.id,
      }
    }),

  removeSelectedLayer: () =>
    set((state) => {
      if (!state.selectedLayerId) {
        return state
      }

      const project = {
        ...state.project,
        layers: state.project.layers.filter((layer) => layer.id !== state.selectedLayerId),
      }
      persistProject(project)

      return {
        project,
        selectedLayerId: null,
      }
    }),

  updateLayer: (layerId, patch) =>
    set((state) => {
      const project = {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId ? { ...layer, ...patch } : layer,
        ),
      }
      persistProject(project)
      return { project }
    }),

  updateShape: (layerId, patch) =>
    set((state) => {
      const project = {
        ...state.project,
        layers: state.project.layers.map((layer) =>
          layer.id === layerId
            ? {
                ...layer,
                shape: { ...layer.shape, ...patch } as Shape,
              }
            : layer,
        ),
      }
      persistProject(project)
      return { project }
    }),

  setCurrentTime: (time) =>
    set((state) => ({
      currentTime: Math.max(0, Math.min(time, state.project.duration)),
    })),

  setPlaybackState: (playbackState) => set({ playbackState }),

  toggleLoop: () => set((state) => ({ loop: !state.loop })),

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(zoom, 3)) }),

  setProject: (project) => {
    persistProject(project)
    set({
      project,
      selectedLayerId: project.layers[0]?.id ?? null,
      currentTime: 0,
      playbackState: 'idle',
    })
  },

  addKeyframeAtCurrentTime: (property) =>
    set((state) => {
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId)
      if (!layer) {
        return state
      }

      const value = layer.shape[property]
      const existingIndex = layer.keyframes.findIndex(
        (keyframe) =>
          keyframe.property === property &&
          Math.abs(keyframe.time - state.currentTime) < 0.001,
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
          time: state.currentTime,
          property,
          value,
        })
      }

      const project = {
        ...state.project,
        layers: state.project.layers.map((item) =>
          item.id === layer.id ? { ...item, keyframes: nextKeyframes } : item,
        ),
      }
      persistProject(project)
      return { project }
    }),

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
