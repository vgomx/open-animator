import { create } from 'zustand'

import { DEFAULT_CUSTOM_BEZIER } from '@/editor/easing'
import { getAnimatedShape as resolveAnimatedShape } from '@/editor/animation'
import { getGroupPropertyValue, GROUP_ANIMATABLE_PROPERTIES } from '@/editor/group-animation'
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
import { cloneLayer, createId, createLayer, createLayerFromShape, createPathShape, createRectShape, createEllipseShape, createTextShape } from '@/editor/scene'
import { loadLayerClipboard, saveLayerClipboard } from '@/lib/layer-clipboard-storage'
import {
  ensureActiveArtboardId,
  getActiveArtboard,
  getArtboardLayers,
} from '@/editor/artboard-utils'
import { createArtboard } from '@/editor/types'
import type { EditorTool } from '@/editor/tools'
import { deletePathNodes } from '@/editor/path-nodes'
import type { PathPoint } from '@/editor/types'
import { clampZoom, computeFitZoom, zoomAtPoint } from '@/editor/viewport'
import type {
  AnimatableProperty,
  Artboard,
  CanvasSettings,
  BezierHandle,
  EasingType,
  Guide,
  GuideAxis,
  Keyframe,
  Layer,
  OnionSkinSettings,
  PlaybackState,
  Project,
  Shape,
  ShapeType,
  SnapLine,
} from '@/editor/types'
import { isColorProperty, isNumericProperty, DEFAULT_ONION_SKIN_SETTINGS } from '@/editor/types'
import { UI_STROKE } from '@/lib/brand-colors'
import { extractShapeStyle, type ShapeStylePatch } from '@/editor/selection-utils'
import { createInitialProject, flushProjectSave, saveProjectToStorage, scheduleProjectSave } from '@/io/project'
import {
  clampExportFps,
  clampPanelWidth,
  loadEditorPreferences,
  saveEditorPreferences,
} from '@/lib/preferences'

const initialPreferences = loadEditorPreferences()
const initialProject = createInitialProject()

function resolveArtboardId(state: Pick<EditorStore, 'project' | 'activeArtboardId'>): string {
  return ensureActiveArtboardId(state.project, state.activeArtboardId)
}

function createLayerForActiveArtboard(
  state: Pick<EditorStore, 'project' | 'activeArtboardId'>,
  create: (index: number, artboardId: string) => Layer,
): Layer {
  const artboardId = resolveArtboardId(state)
  const index = getArtboardLayers(state.project, artboardId).length
  return create(index, artboardId)
}

const animatableProperties = new Set<AnimatableProperty>([
  'x',
  'y',
  'opacity',
  'scaleX',
  'scaleY',
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
  activeArtboardId: string | null
  selectedLayerIds: string[]
  selectedLayerId: string | null
  selectedGroupId: string | null
  currentTime: number
  playbackState: PlaybackState
  loop: boolean
  recordMode: boolean
  zoom: number
  panX: number
  panY: number
  snapEnabled: boolean
  showRulers: boolean
  showLayersPanel: boolean
  showPropertiesPanel: boolean
  layersPanelWidth: number
  propertiesPanelWidth: number
  onionSkinEnabled: boolean
  experimentalWebGlViewport: boolean
  onionSkinSettings: OnionSkinSettings
  activeSnapLines: SnapLine[]
  guideDraft: Pick<Guide, 'axis' | 'position'> | null
  history: HistoryStacks
  keyframeClipboard: Keyframe[]
  layerClipboard: Layer[]
  selectedKeyframeIds: string[]
  timelineSnapTime: number | null
  activeTool: EditorTool
  selectedNodeIndices: number[]
  penDraft: PathPoint[] | null
  eyedropperActive: boolean
  eyedropperHandler: ((color: string) => void) | null
  styleClipboard: ShapeStylePatch | null
  collapsedGroupIds: string[]
  editingTextLayerId: string | null
  setSelectedLayerId: (layerId: string | null) => void
  selectLayer: (layerId: string, options?: { additive?: boolean }) => void
  selectGroup: (groupId: string) => void
  selectLayers: (layerIds: string[]) => void
  clearSelection: () => void
  addShape: (type: ShapeType) => void
  removeSelectedLayer: () => void
  duplicateSelectedLayer: () => void
  duplicateSelectedLayerInPlace: () => string[]
  copySelectedLayers: () => void
  pasteSelectedLayers: () => void
  updateSelectedShapes: (patch: Partial<Shape>, options?: { skipHistory?: boolean }) => void
  copyStyleFromSelection: () => void
  pasteStyleToSelection: () => void
  toggleLockSelectedLayers: () => void
  toggleVisibilitySelectedLayers: () => void
  toggleGroupCollapsed: (groupId: string) => void
  setEditingTextLayerId: (layerId: string | null) => void
  updateLayer: (layerId: string, patch: Partial<Layer>) => void
  updateArtboard: (artboardId: string, patch: Partial<Artboard>) => void
  updateCanvas: (patch: Partial<CanvasSettings>) => void
  updateProjectTiming: (patch: {
    duration?: number
    fps?: number
    loopIn?: number
    loopOut?: number
  }) => void
  setActiveArtboardId: (artboardId: string) => void
  addArtboard: () => void
  removeArtboard: (artboardId: string) => void
  duplicateArtboard: (artboardId: string) => void
  setLayersPanelWidth: (width: number) => void
  setPropertiesPanelWidth: (width: number) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
  updateShape: (layerId: string, patch: Partial<Shape>, options?: { skipHistory?: boolean }) => void
  setCurrentTime: (time: number) => void
  setPlaybackState: (state: PlaybackState) => void
  toggleLoop: () => void
  toggleRecordMode: () => void
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  setViewport: (viewport: { zoom: number; panX: number; panY: number }) => void
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
  setProject: (
    project: Project,
    options?: {
      fitViewport?: { width: number; height: number }
      /** Keep document properties visible instead of selecting the first layer. */
      clearLayerSelection?: boolean
    },
  ) => void
  importSvgLayers: (
    layers: Layer[],
    options?: {
      artboard?: Partial<Artboard>
      duration?: number
      importedSvg?: Project['importedSvg']
      layerGroups?: Project['layerGroups']
    },
  ) => void
  addKeyframeAtCurrentTime: (property: AnimatableProperty) => void
  setKeyframeEasing: (property: AnimatableProperty, easing: EasingType, bezier?: BezierHandle) => void
  moveKeyframe: (keyframeId: string, time: number, options?: { skipHistory?: boolean }) => void
  moveKeyframesAtAnchor: (
    anchorKeyframeId: string,
    anchorTime: number,
    keyframeIds: string[],
    options?: { skipHistory?: boolean },
  ) => void
  selectKeyframe: (keyframeId: string, options?: { additive?: boolean }) => void
  clearKeyframeSelection: () => void
  removeSelectedKeyframes: () => void
  setTimelineSnapTime: (time: number | null) => void
  toggleSnapEnabled: () => void
  toggleShowRulers: () => void
  toggleLayersPanel: () => void
  togglePropertiesPanel: () => void
  toggleOnionSkinEnabled: () => void
  toggleExperimentalWebGlViewport: () => void
  setOnionSkinSettings: (patch: Partial<OnionSkinSettings>) => void
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
  setLoopRegion: (loopIn: number, loopOut: number, options?: { skipHistory?: boolean }) => void
  groupSelectedLayers: () => void
  ungroupSelectedLayers: () => void
  zoomToSelection: (viewportWidth: number, viewportHeight: number) => void
  setActiveTool: (tool: EditorTool) => void
  selectNodes: (indices: number[], options?: { additive?: boolean }) => void
  clearNodeSelection: () => void
  addPenDraftPoint: (point: PathPoint) => void
  finishPenPath: (closed?: boolean) => void
  cancelPenDraft: () => void
  deleteSelectedNodes: () => void
  addLayerWithShape: (shape: Shape) => void
  createShapeInBounds: (
    type: 'rect' | 'ellipse',
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void
  createTextAt: (x: number, y: number) => void
  startEyedropper: (handler: (color: string) => void) => void
  cancelEyedropper: () => void
  completeEyedropper: (color: string) => void
  undo: () => void
  redo: () => void
  beginHistoryTransaction: () => void
  getAnimatedShape: (layer: Layer, time: number) => Shape
}

function persistProject(project: Project, immediate = false): void {
  if (immediate) {
    flushProjectSave()
    saveProjectToStorage(project)
    return
  }

  scheduleProjectSave(project)
}

function findKeyframeTime(project: Project, keyframeId: string): number | null {
  for (const layer of project.layers) {
    const keyframe = layer.keyframes.find((item) => item.id === keyframeId)
    if (keyframe) {
      return keyframe.time
    }
  }

  for (const group of Object.values(project.layerGroups ?? {})) {
    const keyframe = group.keyframes?.find((item) => item.id === keyframeId)
    if (keyframe) {
      return keyframe.time
    }
  }

  return null
}

function applyKeyframeTimeDelta(project: Project, keyframeIds: string[], delta: number): Project {
  const ids = new Set(keyframeIds)
  const duration = project.duration

  const layerGroups = project.layerGroups
    ? Object.fromEntries(
        Object.entries(project.layerGroups).map(([groupId, group]) => [
          groupId,
          {
            ...group,
            keyframes: (group.keyframes ?? []).map((keyframe) =>
              ids.has(keyframe.id)
                ? {
                    ...keyframe,
                    time: Math.max(0, Math.min(keyframe.time + delta, duration)),
                  }
                : keyframe,
            ),
          },
        ]),
      )
    : project.layerGroups

  return {
    ...project,
    layerGroups,
    layers: project.layers.map((layer) => ({
      ...layer,
      keyframes: layer.keyframes.map((keyframe) =>
        ids.has(keyframe.id)
          ? {
              ...keyframe,
              time: Math.max(0, Math.min(keyframe.time + delta, duration)),
            }
          : keyframe,
      ),
    })),
  }
}

function upsertKeyframeList(
  keyframes: Keyframe[],
  time: number,
  property: AnimatableProperty,
  value: number | string,
): Keyframe[] {
  const existingIndex = keyframes.findIndex(
    (keyframe) =>
      keyframe.property === property && Math.abs(keyframe.time - time) < 0.001,
  )

  const nextKeyframes = [...keyframes]
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

function upsertKeyframe(
  layer: Layer,
  time: number,
  property: AnimatableProperty,
  value: number | string,
): Keyframe[] {
  return upsertKeyframeList(layer.keyframes, time, property, value)
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

    if (typeof value !== 'number' && typeof value !== 'string') {
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
      shape: resolveAnimatedShape(layer, state.currentTime, {
        layerGroups: state.project.layerGroups,
      }),
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

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: initialProject,
  activeArtboardId: initialProject.artboards[0]?.id ?? null,
  selectedLayerIds: [],
  selectedLayerId: null,
  currentTime: 0,
  playbackState: 'idle',
  loop: initialPreferences.loop,
  recordMode: initialPreferences.recordMode,
  zoom: 1,
  panX: 0,
  panY: 0,
  snapEnabled: initialPreferences.snapEnabled,
  showRulers: initialPreferences.showRulers,
  showLayersPanel: initialPreferences.showLayersPanel,
  showPropertiesPanel: initialPreferences.showPropertiesPanel,
  layersPanelWidth: initialPreferences.layersPanelWidth,
  propertiesPanelWidth: initialPreferences.propertiesPanelWidth,
  onionSkinEnabled: initialPreferences.onionSkinEnabled,
  experimentalWebGlViewport: initialPreferences.experimentalWebGlViewport,
  onionSkinSettings: { ...DEFAULT_ONION_SKIN_SETTINGS },
  activeSnapLines: [],
  guideDraft: null,
  history: { past: [], future: [] },
  keyframeClipboard: [],
  layerClipboard: loadLayerClipboard(),
  selectedKeyframeIds: [],
  timelineSnapTime: null,
  activeTool: 'select',
  selectedNodeIndices: [],
  penDraft: null,
  eyedropperActive: false,
  eyedropperHandler: null,
  styleClipboard: null,
  collapsedGroupIds: [],
  editingTextLayerId: null,
  selectedGroupId: null,

  setSelectedLayerId: (layerId) =>
    set(layerId ? { ...syncSelection([layerId]), selectedGroupId: null } : { ...syncSelection([]), selectedGroupId: null }),

  selectLayer: (layerId, options) =>
    set((state) => {
      const layer = state.project.layers.find((item) => item.id === layerId)
      const groupedIds =
        !options?.additive && layer?.groupId
          ? state.project.layers
              .filter((item) => item.groupId === layer.groupId)
              .map((item) => item.id)
          : [layerId]

      const next =
        !options?.additive
          ? syncSelection(groupedIds)
          : state.selectedLayerIds.includes(layerId)
            ? syncSelection(state.selectedLayerIds.filter((id) => id !== layerId))
            : syncSelection([...state.selectedLayerIds, layerId])

      return { ...next, selectedGroupId: null, selectedNodeIndices: [], selectedKeyframeIds: [] }
    }),

  selectGroup: (groupId) =>
    set({
      selectedGroupId: groupId,
      ...syncSelection([]),
      selectedNodeIndices: [],
      selectedKeyframeIds: [],
    }),

  clearSelection: () =>
    set({ ...syncSelection([]), selectedGroupId: null, selectedNodeIndices: [], selectedKeyframeIds: [] }),

  selectLayers: (layerIds) =>
    set({ ...syncSelection([...layerIds]), selectedGroupId: null, selectedNodeIndices: [], selectedKeyframeIds: [] }),

  setActiveTool: (tool) =>
    set((state) => ({
      activeTool: tool,
      selectedNodeIndices: tool === 'node' ? state.selectedNodeIndices : [],
      penDraft: tool === 'pen' ? state.penDraft : null,
    })),

  selectNodes: (indices, options) =>
    set((state) => {
      if (!options?.additive) {
        return { selectedNodeIndices: [...indices] }
      }

      const next = new Set(state.selectedNodeIndices)
      for (const index of indices) {
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }
      }

      return { selectedNodeIndices: [...next] }
    }),

  clearNodeSelection: () => set({ selectedNodeIndices: [] }),

  addPenDraftPoint: (point) =>
    set((state) => ({
      penDraft: [...(state.penDraft ?? []), point],
    })),

  finishPenPath: (closed = false) =>
    set((state) => {
      if (!state.penDraft || state.penDraft.length < 2) {
        return { penDraft: null }
      }

      const shape = createPathShape(state.penDraft, closed)
      const layer = createLayerForActiveArtboard(state, (index, artboardId) =>
        createLayerFromShape(shape, index, artboardId),
      )

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: [...current.project.layers, layer],
        },
        ...syncSelection([layer.id]),
        penDraft: null,
        activeTool: 'select',
      }))
    }),

  cancelPenDraft: () => set({ penDraft: null }),

  deleteSelectedNodes: () =>
    set((state) => {
      if (!state.selectedLayerId || state.selectedNodeIndices.length === 0) {
        return state
      }

      return withHistory(state, (current) => {
        const layer = current.project.layers.find((item) => item.id === current.selectedLayerId)
        if (!layer || layer.shape.type !== 'path') {
          return {}
        }

        const patch = deletePathNodes(layer.shape, current.selectedNodeIndices)
        if (!patch) {
          return {
            project: {
              ...current.project,
              layers: current.project.layers.filter((item) => item.id !== layer.id),
            },
            ...syncSelection([]),
            selectedNodeIndices: [],
          }
        }

        return {
          project: {
            ...current.project,
            layers: current.project.layers.map((item) =>
              item.id === layer.id
                ? { ...item, shape: { ...item.shape, ...patch } as Shape }
                : item,
            ),
          },
          selectedNodeIndices: [],
        }
      })
    }),

  addLayerWithShape: (shape) =>
    set((state) =>
      withHistory(state, (current) => {
        const layer = createLayerForActiveArtboard(current, (index, artboardId) =>
          createLayerFromShape(shape, index, artboardId),
        )
        return {
          project: {
            ...current.project,
            layers: [...current.project.layers, layer],
          },
          ...syncSelection([layer.id]),
          activeTool: 'select',
        }
      }),
    ),

  createShapeInBounds: (type, x, y, width, height) => {
    const shape =
      type === 'rect'
        ? createRectShape(x, y, width, height)
        : createEllipseShape(x, y, width, height)
    useEditorStore.getState().addLayerWithShape(shape)
  },

  createTextAt: (x, y) => {
    useEditorStore.getState().addLayerWithShape(createTextShape(x, y))
  },

  startEyedropper: (handler) =>
    set({
      eyedropperActive: true,
      eyedropperHandler: handler,
    }),

  cancelEyedropper: () =>
    set({
      eyedropperActive: false,
      eyedropperHandler: null,
    }),

  completeEyedropper: (color) =>
    set((state) => {
      state.eyedropperHandler?.(color)
      return {
        eyedropperActive: false,
        eyedropperHandler: null,
      }
    }),

  addShape: (type) =>
    set((state) =>
      withHistory(state, (current) => {
        const layer = createLayerForActiveArtboard(current, (index, artboardId) =>
          createLayer(type, index, artboardId),
        )
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

  duplicateSelectedLayerInPlace: () => {
    let createdIds: string[] = []

    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => {
        const duplicates = current.selectedLayerIds
          .map((layerId) => current.project.layers.find((item) => item.id === layerId))
          .filter((layer): layer is Layer => Boolean(layer))
          .map((layer) => cloneLayer(layer, 0))

        if (duplicates.length === 0) {
          return {}
        }

        createdIds = duplicates.map((layer) => layer.id)

        return {
          project: {
            ...current.project,
            layers: [...current.project.layers, ...duplicates],
          },
          ...syncSelection(createdIds),
        }
      })
    })

    return createdIds
  },

  copySelectedLayers: () =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      const layers = state.selectedLayerIds
        .map((layerId) => state.project.layers.find((item) => item.id === layerId))
        .filter((layer): layer is Layer => Boolean(layer))
        .map((layer) => cloneLayer(layer, 0))

      saveLayerClipboard(layers)

      return {
        layerClipboard: layers,
      }
    }),

  pasteSelectedLayers: () =>
    set((state) => {
      const clipboard =
        state.layerClipboard.length > 0 ? state.layerClipboard : loadLayerClipboard()
      if (clipboard.length === 0) {
        return state
      }

      return withHistory(state, (current) => {
        const artboardId = resolveArtboardId(current)
        const pasted = clipboard.map((layer) => {
          const copy = cloneLayer(layer, 20)
          return {
            ...copy,
            artboardId,
            name: layer.name.replace(/ copy$/, '') + ' copy',
          }
        })

        return {
          layerClipboard: clipboard,
          project: {
            ...current.project,
            layers: [...current.project.layers, ...pasted],
          },
          ...syncSelection(pasted.map((layer) => layer.id)),
        }
      })
    }),

  updateSelectedShapes: (patch, options) =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      const applyUpdate = (current: EditorStore): Partial<EditorStore> => {
        const project = {
          ...current.project,
          layers: current.project.layers.map((layer) => {
            if (!current.selectedLayerIds.includes(layer.id)) {
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

  copyStyleFromSelection: () =>
    set((state) => {
      const layer = state.project.layers.find((item) => item.id === state.selectedLayerId)
      if (!layer) {
        return state
      }

      return {
        styleClipboard: extractShapeStyle(layer.shape),
      }
    }),

  pasteStyleToSelection: () =>
    set((state) => {
      if (!state.styleClipboard || state.selectedLayerIds.length === 0) {
        return state
      }

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) => {
            if (!current.selectedLayerIds.includes(layer.id)) {
              return layer
            }

            const shape = { ...layer.shape, ...current.styleClipboard! } as Shape
            const keyframes = applyAutoKeyframes(
              layer,
              current.styleClipboard!,
              current.currentTime,
              current.recordMode,
            )

            return {
              ...layer,
              shape,
              keyframes,
            }
          }),
        },
      }))
    }),

  toggleLockSelectedLayers: () =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      const shouldLock = state.selectedLayerIds.some((id) => {
        const layer = state.project.layers.find((item) => item.id === id)
        return layer && !layer.locked
      })

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) =>
            current.selectedLayerIds.includes(layer.id)
              ? { ...layer, locked: shouldLock }
              : layer,
          ),
        },
      }))
    }),

  toggleVisibilitySelectedLayers: () =>
    set((state) => {
      if (state.selectedLayerIds.length === 0) {
        return state
      }

      const shouldHide = state.selectedLayerIds.some((id) => {
        const layer = state.project.layers.find((item) => item.id === id)
        return layer?.visible ?? false
      })

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layers: current.project.layers.map((layer) =>
            current.selectedLayerIds.includes(layer.id)
              ? { ...layer, visible: !shouldHide }
              : layer,
          ),
        },
      }))
    }),

  toggleGroupCollapsed: (groupId) =>
    set((state) => ({
      collapsedGroupIds: state.collapsedGroupIds.includes(groupId)
        ? state.collapsedGroupIds.filter((id) => id !== groupId)
        : [...state.collapsedGroupIds, groupId],
    })),

  setEditingTextLayerId: (layerId) => set({ editingTextLayerId: layerId }),

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

  updateArtboard: (artboardId, patch) =>
    set((state) =>
      withHistory(state, (current) => ({
        project: {
          ...current.project,
          artboards: current.project.artboards.map((artboard) =>
            artboard.id === artboardId
              ? {
                  ...artboard,
                  ...patch,
                  width:
                    patch.width !== undefined
                      ? Math.max(1, Math.round(patch.width))
                      : artboard.width,
                  height:
                    patch.height !== undefined
                      ? Math.max(1, Math.round(patch.height))
                      : artboard.height,
                }
              : artboard,
          ),
        },
      })),
    ),

  updateCanvas: (patch) =>
    set((state) =>
      withHistory(state, (current) => ({
        project: {
          ...current.project,
          canvas: {
            ...current.project.canvas,
            ...patch,
          },
        },
      })),
    ),

  updateProjectTiming: (patch) =>
    set((state) =>
      withHistory(state, (current) => {
        const duration = patch.duration ?? current.project.duration
        const loopIn = patch.loopIn ?? current.project.loopIn
        const loopOut = patch.loopOut ?? current.project.loopOut

        return {
          project: {
            ...current.project,
            duration: Math.max(0.1, duration),
            fps: patch.fps !== undefined ? clampExportFps(patch.fps) : current.project.fps,
            loopIn: Math.max(0, Math.min(loopIn, duration)),
            loopOut: Math.max(0, Math.min(loopOut, duration)),
          },
        }
      }),
    ),

  setActiveArtboardId: (artboardId) =>
    set((state) => {
      if (!getActiveArtboard(state.project, artboardId)) {
        return state
      }

      const visibleLayers = getArtboardLayers(state.project, artboardId)
      return {
        activeArtboardId: artboardId,
        ...syncSelection(visibleLayers[0]?.id ? [visibleLayers[0].id] : []),
      }
    }),

  addArtboard: () =>
    set((state) =>
      withHistory(state, (current) => {
        const source = getActiveArtboard(current.project, current.activeArtboardId)
        const artboard = createArtboard({
          name: `Artboard ${current.project.artboards.length + 1}`,
          width: source.width,
          height: source.height,
          backgroundColor: source.backgroundColor,
        })

        return {
          project: {
            ...current.project,
            artboards: [...current.project.artboards, artboard],
          },
          activeArtboardId: artboard.id,
          ...syncSelection([]),
        }
      }),
    ),

  removeArtboard: (artboardId) =>
    set((state) => {
      if (state.project.artboards.length <= 1) {
        return state
      }

      return withHistory(state, (current) => {
        const nextArtboards = current.project.artboards.filter((item) => item.id !== artboardId)
        const nextActiveId =
          current.activeArtboardId === artboardId
            ? nextArtboards[0]?.id ?? null
            : current.activeArtboardId

        return {
          project: {
            ...current.project,
            artboards: nextArtboards,
            layers: current.project.layers.filter((layer) => layer.artboardId !== artboardId),
          },
          activeArtboardId: nextActiveId,
          ...syncSelection([]),
        }
      })
    }),

  duplicateArtboard: (artboardId) =>
    set((state) =>
      withHistory(state, (current) => {
        const source = getActiveArtboard(current.project, artboardId)
        const duplicate = createArtboard({
          name: `${source.name} copy`,
          width: source.width,
          height: source.height,
          backgroundColor: source.backgroundColor,
        })
        const duplicatedLayers = getArtboardLayers(current.project, artboardId).map((layer) => ({
          ...cloneLayer(layer),
          artboardId: duplicate.id,
        }))

        return {
          project: {
            ...current.project,
            artboards: [...current.project.artboards, duplicate],
            layers: [...current.project.layers, ...duplicatedLayers],
          },
          activeArtboardId: duplicate.id,
          ...syncSelection(duplicatedLayers[0]?.id ? [duplicatedLayers[0].id] : []),
        }
      }),
    ),

  setLayersPanelWidth: (width) => {
    const next = clampPanelWidth(width)
    saveEditorPreferences({ layersPanelWidth: next })
    set({ layersPanelWidth: next })
  },

  setPropertiesPanelWidth: (width) => {
    const next = clampPanelWidth(width)
    saveEditorPreferences({ propertiesPanelWidth: next })
    set({ propertiesPanelWidth: next })
  },

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
    set((state) => {
      const nextTime = Math.max(0, Math.min(time, state.project.duration))
      if (Math.abs(nextTime - state.currentTime) < 0.00001) {
        return state
      }

      return { currentTime: nextTime }
    }),

  setPlaybackState: (playbackState) => set({ playbackState }),

  toggleLoop: () =>
    set((state) => {
      const loop = !state.loop
      saveEditorPreferences({ loop })
      return { loop }
    }),

  toggleRecordMode: () =>
    set((state) => {
      const recordMode = !state.recordMode
      saveEditorPreferences({ recordMode })
      return { recordMode }
    }),

  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  setPan: (panX, panY) => set({ panX, panY }),

  setViewport: ({ zoom, panX, panY }) => set({ zoom: clampZoom(zoom), panX, panY }),

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
      const { width, height } = getActiveArtboard(state.project, state.activeArtboardId)

      return {
        zoom: computeFitZoom(width, height, viewportWidth, viewportHeight),
        panX: 0,
        panY: 0,
      }
    }),

  resetViewport: () => set({ zoom: 1, panX: 0, panY: 0 }),

  setProject: (project, options) => {
    persistProject(project, true)
    const activeArtboardId = project.artboards[0]?.id ?? null
    const visibleLayers = activeArtboardId
      ? getArtboardLayers(project, activeArtboardId)
      : project.layers
    const artboard = project.artboards[0]
    const zoom =
      options?.fitViewport && artboard
        ? computeFitZoom(
            artboard.width,
            artboard.height,
            options.fitViewport.width,
            options.fitViewport.height,
          )
        : 1

    set({
      project,
      activeArtboardId,
      ...(options?.clearLayerSelection
        ? { ...syncSelection([]), selectedNodeIndices: [], selectedKeyframeIds: [], selectedGroupId: null }
        : syncSelection(visibleLayers[0]?.id ? [visibleLayers[0].id] : [])),
      currentTime: 0,
      playbackState: 'idle',
      history: { past: [], future: [] },
      panX: 0,
      panY: 0,
      zoom,
    })
  },

  addKeyframeAtCurrentTime: (property) =>
    set((state) => {
      if (state.selectedGroupId) {
        const group = state.project.layerGroups?.[state.selectedGroupId]
        if (!group) {
          return state
        }

        return withHistory(state, (current) => {
          const selectedGroup = current.project.layerGroups?.[current.selectedGroupId!]
          if (!selectedGroup) {
            return {}
          }

          if (!GROUP_ANIMATABLE_PROPERTIES.includes(property as (typeof GROUP_ANIMATABLE_PROPERTIES)[number])) {
            return {}
          }

          const value = getGroupPropertyValue(
            current.selectedGroupId!,
            property as (typeof GROUP_ANIMATABLE_PROPERTIES)[number],
            current.project.layerGroups,
            current.currentTime,
          )

          const layerGroups = {
            ...(current.project.layerGroups ?? {}),
            [current.selectedGroupId!]: {
              ...selectedGroup,
              keyframes: upsertKeyframeList(
                selectedGroup.keyframes ?? [],
                current.currentTime,
                property,
                value,
              ),
            },
          }

          return { project: { ...current.project, layerGroups } }
        })
      }

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

  setKeyframeEasing: (property, easing, bezier) =>
    set((state) => {
      if (state.selectedGroupId) {
        const group = state.project.layerGroups?.[state.selectedGroupId]
        if (!group) {
          return state
        }

        return withHistory(state, (current) => {
          const selectedGroup = current.project.layerGroups?.[current.selectedGroupId!]
          if (!selectedGroup) {
            return {}
          }

          const keyframes = [...(selectedGroup.keyframes ?? [])]
          const existingIndex = keyframes.findIndex(
            (keyframe) =>
              keyframe.property === property &&
              Math.abs(keyframe.time - current.currentTime) < 0.001,
          )

          if (existingIndex < 0) {
            return {}
          }

          const nextKeyframe = {
            ...keyframes[existingIndex]!,
            easing,
          }

          if (easing === 'custom') {
            nextKeyframe.bezier = bezier ?? DEFAULT_CUSTOM_BEZIER
          } else {
            delete nextKeyframe.bezier
          }

          keyframes[existingIndex] = nextKeyframe

          const layerGroups = {
            ...(current.project.layerGroups ?? {}),
            [current.selectedGroupId!]: {
              ...selectedGroup,
              keyframes,
            },
          }

          return { project: { ...current.project, layerGroups } }
        })
      }

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
            const nextKeyframe = {
              ...keyframes[existingIndex],
              easing,
            }

            if (easing === 'custom') {
              nextKeyframe.bezier = bezier ?? DEFAULT_CUSTOM_BEZIER
            } else {
              delete nextKeyframe.bezier
            }

            keyframes[existingIndex] = nextKeyframe

            return { ...item, keyframes }
          }),
        }

        return { project }
      })
    }),

  importSvgLayers: (layers, options) =>
    set((state) => {
      if (layers.length === 0) {
        return state
      }

      return withHistory(state, (current) => {
        const activeArtboardId = resolveArtboardId(current)
        const nextDuration =
          options?.duration && options.duration > 0
            ? options.duration
            : current.project.duration
        const project = {
          ...current.project,
          duration: nextDuration,
          loopOut: Math.max(current.project.loopIn, nextDuration),
          importedSvg: options?.importedSvg ?? current.project.importedSvg,
          layerGroups: options?.layerGroups ?? current.project.layerGroups,
          layers: [
            ...current.project.layers,
            ...layers.map((layer) => ({ ...layer, artboardId: layer.artboardId ?? activeArtboardId })),
          ],
          artboards: options?.artboard
            ? current.project.artboards.map((item) =>
                item.id === activeArtboardId ? { ...item, ...options.artboard } : item,
              )
            : current.project.artboards,
        }

        return {
          project,
          currentTime: 0,
          playbackState: 'idle' as const,
          ...syncSelection(layers.map((layer) => layer.id)),
        }
      })
    }),

  moveKeyframe: (keyframeId, time, options) =>
    set((state) => {
      const clampedTime = Math.max(0, Math.min(time, state.project.duration))

      const applyMove = (current: EditorStore): Partial<EditorStore> => {
        const layerGroups = current.project.layerGroups
          ? Object.fromEntries(
              Object.entries(current.project.layerGroups).map(([groupId, group]) => [
                groupId,
                {
                  ...group,
                  keyframes: (group.keyframes ?? []).map((keyframe) =>
                    keyframe.id === keyframeId ? { ...keyframe, time: clampedTime } : keyframe,
                  ),
                },
              ]),
            )
          : current.project.layerGroups

        const project = {
          ...current.project,
          layerGroups,
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

  moveKeyframesAtAnchor: (anchorKeyframeId, anchorTime, keyframeIds, options) =>
    set((state) => {
      const originalTime = findKeyframeTime(state.project, anchorKeyframeId)
      if (originalTime === null) {
        return state
      }

      const delta = anchorTime - originalTime
      if (Math.abs(delta) < 0.0001) {
        return state
      }

      const applyMove = (current: EditorStore): Partial<EditorStore> => ({
        project: applyKeyframeTimeDelta(current.project, keyframeIds, delta),
      })

      if (options?.skipHistory) {
        const next = applyMove(state)
        const project = next.project ?? state.project
        persistProject(project)
        return next
      }

      return withHistory(state, applyMove)
    }),

  selectKeyframe: (keyframeId, options) =>
    set((state) => {
      if (!options?.additive) {
        return { selectedKeyframeIds: [keyframeId] }
      }

      return {
        selectedKeyframeIds: state.selectedKeyframeIds.includes(keyframeId)
          ? state.selectedKeyframeIds.filter((id) => id !== keyframeId)
          : [...state.selectedKeyframeIds, keyframeId],
      }
    }),

  clearKeyframeSelection: () => set({ selectedKeyframeIds: [] }),

  removeSelectedKeyframes: () =>
    set((state) => {
      if (state.selectedKeyframeIds.length === 0) {
        return state
      }

      const selected = new Set(state.selectedKeyframeIds)

      return withHistory(state, (current) => {
        const layerGroups = current.project.layerGroups
          ? Object.fromEntries(
              Object.entries(current.project.layerGroups).map(([groupId, group]) => [
                groupId,
                {
                  ...group,
                  keyframes: (group.keyframes ?? []).filter((keyframe) => !selected.has(keyframe.id)),
                },
              ]),
            )
          : current.project.layerGroups

        return {
          project: {
            ...current.project,
            layerGroups,
            layers: current.project.layers.map((layer) => ({
              ...layer,
              keyframes: layer.keyframes.filter((keyframe) => !selected.has(keyframe.id)),
            })),
          },
          selectedKeyframeIds: [],
        }
      })
    }),

  setTimelineSnapTime: (time) => set({ timelineSnapTime: time }),

  toggleSnapEnabled: () =>
    set((state) => {
      const snapEnabled = !state.snapEnabled
      saveEditorPreferences({ snapEnabled })
      return { snapEnabled }
    }),

  toggleShowRulers: () =>
    set((state) => {
      const showRulers = !state.showRulers
      saveEditorPreferences({ showRulers })
      return { showRulers }
    }),

  toggleLayersPanel: () =>
    set((state) => {
      const showLayersPanel = !state.showLayersPanel
      saveEditorPreferences({ showLayersPanel })
      return { showLayersPanel }
    }),

  togglePropertiesPanel: () =>
    set((state) => {
      const showPropertiesPanel = !state.showPropertiesPanel
      saveEditorPreferences({ showPropertiesPanel })
      return { showPropertiesPanel }
    }),

  toggleOnionSkinEnabled: () =>
    set((state) => {
      const onionSkinEnabled = !state.onionSkinEnabled
      saveEditorPreferences({ onionSkinEnabled })
      return { onionSkinEnabled }
    }),

  toggleExperimentalWebGlViewport: () =>
    set((state) => {
      const experimentalWebGlViewport = !state.experimentalWebGlViewport
      saveEditorPreferences({ experimentalWebGlViewport })
      return { experimentalWebGlViewport }
    }),

  setOnionSkinSettings: (patch) =>
    set((state) => ({
      onionSkinSettings: {
        ...state.onionSkinSettings,
        ...patch,
      },
    })),

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

        const patches = alignSelectionToArtboard(
          items,
          getActiveArtboard(current.project, current.activeArtboardId),
          alignment,
        )

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
      if (state.selectedKeyframeIds.length > 0) {
        return withHistory(state, (current) => ({
          project: applyKeyframeTimeDelta(
            current.project,
            current.selectedKeyframeIds,
            deltaTime,
          ),
        }))
      }

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
                color: UI_STROKE,
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

  setLoopRegion: (loopIn, loopOut, options) =>
    set((state) => {
      const applyLoop = (current: EditorStore): Partial<EditorStore> => {
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
      }

      if (options?.skipHistory) {
        const next = applyLoop(state)
        const project = next.project ?? state.project
        persistProject(project)
        return next
      }

      return withHistory(state, applyLoop)
    }),

  groupSelectedLayers: () =>
    set((state) => {
      if (state.selectedLayerIds.length < 2) {
        return state
      }

      const groupId = createId()
      const groupCount = Object.keys(state.project.layerGroups ?? {}).length

      return withHistory(state, (current) => ({
        project: {
          ...current.project,
          layerGroups: {
            ...(current.project.layerGroups ?? {}),
            [groupId]: {
              name: `Group ${groupCount + 1}`,
              parentGroupId: null,
              keyframes: [],
            },
          },
          layers: current.project.layers.map((layer) =>
            current.selectedLayerIds.includes(layer.id) ? { ...layer, groupId } : layer,
          ),
        },
        selectedGroupId: groupId,
        ...syncSelection([]),
        selectedKeyframeIds: [],
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
        .map((layer) => getShapeBounds(resolveAnimatedShape(layer, state.currentTime, {
          layerGroups: state.project.layerGroups,
        })))

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
      const artboard = getActiveArtboard(state.project, state.activeArtboardId)
      const artboardCenterX = artboard.width / 2
      const artboardCenterY = artboard.height / 2

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

  getAnimatedShape: (layer, time) => {
    const { project } = get()
    return resolveAnimatedShape(layer, time, { layerGroups: project.layerGroups })
  },
}))

export function useActiveArtboard(): Artboard {
  return useEditorStore((state) => getActiveArtboard(state.project, state.activeArtboardId))
}

export function useSelectedLayerIds(): string[] {
  return useEditorStore((state) => state.selectedLayerIds)
}

export function useSelectedLayer(): Layer | null {
  return useEditorStore((state) => {
    if (state.selectedGroupId || !state.selectedLayerId) {
      return null
    }

    return state.project.layers.find((layer) => layer.id === state.selectedLayerId) ?? null
  })
}

export function useSelectedGroup() {
  return useEditorStore((state) => {
    if (!state.selectedGroupId) {
      return null
    }

    return state.project.layerGroups?.[state.selectedGroupId] ?? null
  })
}
