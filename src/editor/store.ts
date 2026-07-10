import { create } from 'zustand'

import { getAnimatedShape } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import { applyPresetToLayers, type PresetId, type PresetOptions } from '@/editor/presets'
import {
  alignSelectionToArtboard,
  alignShapesTogether,
  distributeShapes,
  type DistributeAxis,
  type LayerAlignment,
} from '@/editor/align'
import {
  createAnimationState,
  pinLayerKeyframesAtTime,
  smartAnimateAllStates,
} from '@/editor/smart-animate'
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
  Guide,
  GuideAxis,
  Keyframe,
  Layer,
  PlaybackState,
  Project,
  Shape,
  ShapeType,
  SnapLine,
} from '@/editor/types'
import { isColorProperty, isNumericProperty } from '@/editor/types'
import { createInitialProject, saveProjectToStorage } from '@/io/project'

const animatableProperties = new Set<AnimatableProperty>([
  'x',
  'y',
  'opacity',
  'scale',
  'rotation',
  'fill',
  'stroke',
  'width',
  'height',
  'rx',
  'ry',
  'fontSize',
])

type EditorStore = {
  project: Project
  selectedLayerIds: string[]
  selectedLayerId: string | null
  currentTime: number
  playbackState: PlaybackState
  loop: boolean
  recordMode: boolean
  zoom: number
  panX: number
  panY: number
  snapEnabled: boolean
  showRulers: boolean
  onionSkinEnabled: boolean
  activeSnapLines: SnapLine[]
  guideDraft: Pick<Guide, 'axis' | 'position'> | null
  history: HistoryStacks
  keyframeClipboard: Keyframe[]
  setSelectedLayerId: (layerId: string | null) => void
  selectLayer: (layerId: string, options?: { additive?: boolean }) => void
  selectLayers: (layerIds: string[]) => void
  clearSelection: () => void
  addShape: (type: ShapeType) => void
  removeSelectedLayer: () => void
  duplicateSelectedLayer: () => void
  updateLayer: (layerId: string, patch: Partial<Layer>) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
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
  moveKeyframe: (keyframeId: string, time: number, options?: { skipHistory?: boolean }) => void
  toggleSnapEnabled: () => void
  toggleShowRulers: () => void
  toggleOnionSkinEnabled: () => void
  setActiveSnapLines: (lines: SnapLine[]) => void
  setGuideDraft: (draft: Pick<Guide, 'axis' | 'position'> | null) => void
  addGuide: (axis: GuideAxis, position: number) => void
  updateGuide: (guideId: string, position: number, options?: { skipHistory?: boolean }) => void
  removeGuide: (guideId: string) => void
  addAnimationStateAtCurrentTime: () => void
  removeAnimationState: (stateId: string) => void
  smartAnimateAll: () => void
  alignSelectedToArtboard: (alignment: LayerAlignment) => void
  alignSelectedLayers: (alignment: LayerAlignment) => void
  distributeSelectedLayers: (axis: DistributeAxis) => void
  applyAnimationPreset: (presetId: PresetId, options: PresetOptions) => void
  copyKeyframesAtCurrentTime: () => void
  pasteKeyframesAtCurrentTime: () => void
  staggerSelectedLayers: (interval: number) => void
  nudgeSelectedKeyframes: (deltaTime: number) => void
  addMarkerAtCurrentTime: () => void
  removeMarker: (markerId: string) => void
  setLoopRegion: (loopIn: number, loopOut: number) => void
  groupSelectedLayers: () => void
  ungroupSelectedLayers: () => void
  zoomToSelection: (viewportWidth: number, viewportHeight: number) => void
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
  value: number | string,
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

    if (isNumericProperty(property as AnimatableProperty) && typeof value !== 'number') {
      continue
    }

    if (isColorProperty(property as AnimatableProperty) && typeof value !== 'string') {
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

function syncSelection(selectedLayerIds: string[]): Pick<EditorStore, 'selectedLayerIds' | 'selectedLayerId'> {
  return {
    selectedLayerIds,
    selectedLayerId: selectedLayerIds[selectedLayerIds.length - 1] ?? null,
  }
}

function getSelectedAlignItems(state: EditorStore) {
  return state.project.layers
    .filter(
      (layer) =>
        state.selectedLayerIds.includes(layer.id) && layer.visible && !layer.locked,
    )
    .map((layer) => ({
      id: layer.id,
      shape: getAnimatedShape(layer, state.currentTime),
    }))
}

function applyShapePatchesToProject(
  project: Project,
  patches: Map<string, Partial<Shape>>,
  currentTime: number,
  recordMode: boolean,
): Project {
  return {
    ...project,
    layers: project.layers.map((layer) => {
      const patch = patches.get(layer.id)
      if (!patch) {
        return layer
      }

      return {
        ...layer,
        shape: { ...layer.shape, ...patch } as Shape,
        keyframes: applyAutoKeyframes(layer, patch, currentTime, recordMode),
      }
    }),
  }
}

function withHistory<T extends EditorStore>(
  state: T,
  apply: (state: T) => Partial<EditorStore>,
): Partial<EditorStore> {
  const snapshot = createSnapshot(state.project, state.selectedLayerIds)
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
    ...syncSelection(snapshot.selectedLayerIds),
    playbackState: 'idle',
  }
}

export const useEditorStore = create<EditorStore>((set) => ({
  project: createInitialProject(),
  selectedLayerIds: [],
  selectedLayerId: null,
  currentTime: 0,
  playbackState: 'idle',
  loop: true,
  recordMode: true,
  zoom: 1,
  panX: 0,
  panY: 0,
  snapEnabled: true,
  showRulers: true,
  onionSkinEnabled: false,
  activeSnapLines: [],
  guideDraft: null,
  history: { past: [], future: [] },
  keyframeClipboard: [],

  setSelectedLayerId: (layerId) =>
    set(layerId ? syncSelection([layerId]) : syncSelection([])),

  selectLayer: (layerId, options) =>
    set((state) => {
      if (!options?.additive) {
        return syncSelection([layerId])
      }

      if (state.selectedLayerIds.includes(layerId)) {
        const nextIds = state.selectedLayerIds.filter((id) => id !== layerId)
        return syncSelection(nextIds)
      }

      return syncSelection([...state.selectedLayerIds, layerId])
    }),

  clearSelection: () => set(syncSelection([])),

  selectLayers: (layerIds) => set(syncSelection([...layerIds])),

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
          ...syncSelection([layer.id]),
        }
      }),
    ),

  removeSelectedLayer: () =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.filter(
            (layer) => !current.selectedLayerIds.includes(layer.id),
          ),
        },
        ...syncSelection([]),
      }))
    }),

  duplicateSelectedLayer: () =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => {
        const duplicates = current.selectedLayerIds
          .map((layerId) => current.project.layers.find((item) => item.id === layerId))
          .filter((layer): layer is Layer => Boolean(layer))
          .map((layer) => cloneLayer(layer))

        if (duplicates.length === 0) {
          return {}
        }

        const project = {
          ...current.project,
          layers: [...current.project.layers, ...duplicates],
        }

        return {
          project,
          ...syncSelection(duplicates.map((layer) => layer.id)),
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

  reorderLayers: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.project.layers.length ||
        toIndex >= state.project.layers.length
      ) {
        return state
      }

      return withHistory(state, (current) => {
        const layers = [...current.project.layers]
        const [moved] = layers.splice(fromIndex, 1)
        layers.splice(toIndex, 0, moved)

        return {
          project: {
            ...current.project,
            layers,
          },
        }
      })
    }),

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
      ...syncSelection(project.layers[0]?.id ? [project.layers[0].id] : []),
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

        const value = selected.shape[property as keyof Shape]
        if (typeof value !== 'number' && typeof value !== 'string') {
          return {}
        }

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

  moveKeyframe: (keyframeId, time, options) =>
    set((state) => {
      const clampedTime = Math.max(0, Math.min(time, state.project.duration))

      const applyMove = (current: EditorStore): Partial<EditorStore> => {
        const project = {
          ...current.project,
          layers: current.project.layers.map((layer) => ({
            ...layer,
            keyframes: layer.keyframes.map((keyframe) =>
              keyframe.id === keyframeId ? { ...keyframe, time: clampedTime } : keyframe,
            ),
          })),
        }

        return { project }
      }

      if (options?.skipHistory) {
        const next = applyMove(state)
        const project = next.project ?? state.project
        persistProject(project)
        return next
      }

      return withHistory(state, applyMove)
    }),

  toggleSnapEnabled: () => set((state) => ({ snapEnabled: !state.snapEnabled })),

  toggleShowRulers: () => set((state) => ({ showRulers: !state.showRulers })),

  toggleOnionSkinEnabled: () => set((state) => ({ onionSkinEnabled: !state.onionSkinEnabled })),

  setActiveSnapLines: (activeSnapLines) => set({ activeSnapLines }),

  setGuideDraft: (guideDraft) => set({ guideDraft }),

  addGuide: (axis, position) =>
    set((state) =>
      withHistory(state, (current) => ({
        project: {
          ...current.project,
          guides: [
            ...current.project.guides,
            {
              id: createId(),
              axis,
              position,
            },
          ],
        },
      })),
    ),

  updateGuide: (guideId, position, options) =>
    set((state) => {
      const applyUpdate = (current: EditorStore): Partial<EditorStore> => ({
        project: {
          ...current.project,
          guides: current.project.guides.map((guide) =>
            guide.id === guideId ? { ...guide, position } : guide,
          ),
        },
      })

      if (options?.skipHistory) {
        const next = applyUpdate(state)
        const project = next.project ?? state.project
        persistProject(project)
        return next
      }

      return withHistory(state, applyUpdate)
    }),

  removeGuide: (guideId) =>
    set((state) =>
      withHistory(state, (current) => ({
        project: {
          ...current.project,
          guides: current.project.guides.filter((guide) => guide.id !== guideId),
        },
      })),
    ),

  addAnimationStateAtCurrentTime: () =>
    set((state) =>
      withHistory(state, (current) => {
        const time = current.currentTime
        const pinnedLayers = current.project.layers.map((layer) =>
          pinLayerKeyframesAtTime(layer, time),
        )
        const pinnedProject = { ...current.project, layers: pinnedLayers }
        const nextState = createAnimationState(pinnedProject, time)
        const existingIndex = current.project.states.findIndex(
          (item) => Math.abs(item.time - time) < 0.001,
        )
        const states =
          existingIndex >= 0
            ? current.project.states.map((item, index) =>
                index === existingIndex ? { ...nextState, id: item.id, name: item.name } : item,
              )
            : [...current.project.states, nextState]

        return {
          project: {
            ...pinnedProject,
            states,
          },
        }
      }),
    ),

  removeAnimationState: (stateId) =>
    set((state) =>
      withHistory(state, (current) => ({
        project: {
          ...current.project,
          states: current.project.states.filter((item) => item.id !== stateId),
        },
      })),
    ),

  smartAnimateAll: () =>
    set((state) => {
      if (state.project.states.length < 2) {
        return state
      }

      return withHistory(state, (current) => ({
        project: smartAnimateAllStates(current.project),
      }))
    }),

  alignSelectedToArtboard: (alignment) =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => {
        const items = getSelectedAlignItems(current)
        if (items.length === 0) {
          return {}
        }

        const patches = alignSelectionToArtboard(items, current.project.artboard, alignment)

        return {
          project: applyShapePatchesToProject(
            current.project,
            patches,
            current.currentTime,
            current.recordMode,
          ),
        }
      })
    }),

  alignSelectedLayers: (alignment) =>
    set((state) => {
      if (state.selectedLayerIds.length < 2) {
        return state
      }

      return withHistory(state, (current) => {
        const items = getSelectedAlignItems(current)
        if (items.length < 2) {
          return {}
        }

        const patches = alignShapesTogether(items, alignment)

        return {
          project: applyShapePatchesToProject(
            current.project,
            patches,
            current.currentTime,
            current.recordMode,
          ),
        }
      })
    }),

  distributeSelectedLayers: (axis) =>
    set((state) => {
      if (state.selectedLayerIds.length < 3) {
        return state
      }

      return withHistory(state, (current) => {
        const items = getSelectedAlignItems(current)
        const patches = distributeShapes(items, axis)
        if (patches.size === 0) {
          return {}
        }

        return {
          project: applyShapePatchesToProject(
            current.project,
            patches,
            current.currentTime,
            current.recordMode,
          ),
        }
      })
    }),

  applyAnimationPreset: (presetId, options) =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => {
        const selected = current.project.layers.filter((layer) =>
          current.selectedLayerIds.includes(layer.id),
        )

        return {
          project: {
            ...current.project,
            layers: applyPresetToLayers(
              selected,
              presetId,
              current.currentTime,
              current.project,
              options,
            ),
          },
        }
      })
    }),

  copyKeyframesAtCurrentTime: () =>
    set((state) => {
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId)
      if (!layer) {
        return state
      }

      const keyframes = layer.keyframes.filter(
        (keyframe) => Math.abs(keyframe.time - state.currentTime) < 0.001,
      )

      return {
        keyframeClipboard: keyframes.map((keyframe) => ({
          ...keyframe,
          id: createId(),
        })),
      }
    }),

  pasteKeyframesAtCurrentTime: () =>
    set((state) => {
      if (state.keyframeClipboard.length === 0 || state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) => {
            if (!current.selectedLayerIds.includes(layer.id)) {
              return layer
            }

            let keyframes = [...layer.keyframes]
            for (const clip of current.keyframeClipboard) {
              keyframes = upsertKeyframe(
                { ...layer, keyframes },
                current.currentTime,
                clip.property,
                clip.value,
              )
              const index = keyframes.findIndex(
                (item) =>
                  item.property === clip.property &&
                  Math.abs(item.time - current.currentTime) < 0.001,
              )
              if (index >= 0 && clip.easing) {
                keyframes[index] = { ...keyframes[index], easing: clip.easing }
              }
            }

            return { ...layer, keyframes }
          }),
        },
      }))
    }),

  staggerSelectedLayers: (interval) =>
    set((state) => {
      if (state.selectedLayerIds.length < 2) {
        return state
      }

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) => {
            const index = current.selectedLayerIds.indexOf(layer.id)
            if (index < 0) {
              return layer
            }

            return { ...layer, delay: index * interval }
          }),
        },
      }))
    }),

  nudgeSelectedKeyframes: (deltaTime) =>
    set((state) => {
      if (!state.selectedLayerId) {
        return state
      }

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) => {
            if (layer.id !== current.selectedLayerId) {
              return layer
            }

            const playhead = current.currentTime
            return {
              ...layer,
              keyframes: layer.keyframes.map((keyframe) =>
                Math.abs(keyframe.time - playhead) < 0.001
                  ? {
                      ...keyframe,
                      time: Math.max(
                        0,
                        Math.min(current.project.duration, keyframe.time + deltaTime),
                      ),
                    }
                  : keyframe,
              ),
            }
          }),
        },
        currentTime: Math.max(
          0,
          Math.min(current.project.duration, current.currentTime + deltaTime),
        ),
      }))
    }),

  addMarkerAtCurrentTime: () =>
    set((state) =>
      withHistory(state, (current) => {
        const markerNumber = current.project.markers.length + 1
        return {
          project: {
            ...current.project,
            markers: [
              ...current.project.markers,
              {
                id: createId(),
                name: `Marker ${markerNumber}`,
                time: current.currentTime,
                color: '#38bdf8',
              },
            ],
          },
        }
      }),
    ),

  removeMarker: (markerId) =>
    set((state) =>
      withHistory(state, (current) => ({
        project: {
          ...current.project,
          markers: current.project.markers.filter((marker) => marker.id !== markerId),
        },
      })),
    ),

  setLoopRegion: (loopIn, loopOut) =>
    set((state) =>
      withHistory(state, (current) => {
        const duration = current.project.duration
        const nextIn = Math.max(0, Math.min(loopIn, duration))
        const nextOut = Math.max(nextIn, Math.min(loopOut, duration))

        return {
          project: {
            ...current.project,
            loopIn: nextIn,
            loopOut: nextOut,
          },
        }
      }),
    ),

  groupSelectedLayers: () =>
    set((state) => {
      if (state.selectedLayerIds.length < 2) {
        return state
      }

      const groupId = createId()

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) =>
            current.selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
        },
      }))
    }),

  ungroupSelectedLayers: () =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) =>
            current.selectedLayerIds.includes(layer.id) ? { ...layer, groupId: null } : layer,
          ),
        },
      }))
    }),

  zoomToSelection: (viewportWidth, viewportHeight) =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      const boundsList = state.selectedLayerIds
        .map((id) => state.project.layers.find((layer) => layer.id === id))
        .filter((layer): layer is Layer => Boolean(layer))
        .map((layer) => getShapeBounds(getAnimatedShape(layer, state.currentTime)))

      if (boundsList.length === 0) {
        return state
      }

      const minX = Math.min(...boundsList.map((bounds) => bounds.x))
      const minY = Math.min(...boundsList.map((bounds) => bounds.y))
      const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width))
      const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height))
      const selectionWidth = maxX - minX
      const selectionHeight = maxY - minY
      const padding = 80
      const zoom = clampZoom(
        Math.min(
          (viewportWidth - padding) / Math.max(selectionWidth, 1),
          (viewportHeight - padding) / Math.max(selectionHeight, 1),
          3,
        ),
      )

      const centerX = minX + selectionWidth / 2
      const centerY = minY + selectionHeight / 2
      const artboardCenterX = state.project.artboard.width / 2
      const artboardCenterY = state.project.artboard.height / 2

      return {
        zoom,
        panX: (artboardCenterX - centerX) * zoom,
        panY: (artboardCenterY - centerY) * zoom,
      }
    }),

  undo: () =>
    set((state) => {
      const result = undoSnapshot(state.history, createSnapshot(state.project, state.selectedLayerIds))
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
      const result = redoSnapshot(state.history, createSnapshot(state.project, state.selectedLayerIds))
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
      history: pushSnapshot(state.history, createSnapshot(state.project, state.selectedLayerIds)),
    })),

  getAnimatedShape,
}))

export function useSelectedLayerIds(): string[] {
  return useEditorStore((state) => state.selectedLayerIds)
}

export function useSelectedLayer(): Layer | null {
  return useEditorStore((state) => {
    if (!state.selectedLayerId) {
      return null
    }

    return state.project.layers.find((layer) => layer.id === state.selectedLayerId) ?? null
  })
}
