import type { Keyframe, Layer, Project, Shape } from '@/editor/types'
import {
  createArtboard,
  DEFAULT_CANVAS,
  DEFAULT_PROJECT_FPS,
  PROJECT_VERSION,
} from '@/editor/types'
import { createId } from '@/editor/scene'

type LegacyKeyframe = Omit<Keyframe, 'easing' | 'value'> & {
  easing?: Keyframe['easing']
  value: number | string
}

type LegacyLayer = Omit<Layer, 'shape' | 'keyframes' | 'locked' | 'groupId' | 'delay' | 'artboardId'> & {
  locked?: boolean
  groupId?: string | null
  delay?: number
  artboardId?: string
  shape: Shape & { rotation?: number }
  keyframes: LegacyKeyframe[]
}

type LegacyProject = Omit<
  Project,
  'version' | 'layers' | 'guides' | 'states' | 'loopIn' | 'loopOut' | 'markers' | 'canvas' | 'artboards' | 'fps'
> & {
  version: number
  layers: LegacyLayer[]
  guides?: Project['guides']
  states?: Project['states']
  loopIn?: number
  loopOut?: number
  markers?: Project['markers']
  canvas?: Project['canvas']
  artboard?: {
    id?: string
    name?: string
    width: number
    height: number
    backgroundColor?: string
  }
  artboards?: Project['artboards']
  fps?: number
}

function migrateV1toV2(project: LegacyProject): LegacyProject {
  return {
    ...project,
    version: 2,
    layers: project.layers.map((layer) => ({
      ...layer,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV2toV3(project: LegacyProject): LegacyProject {
  return {
    ...project,
    version: 3,
    layers: project.layers.map((layer) => ({
      ...layer,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV3toV4(project: LegacyProject): LegacyProject {
  return {
    ...project,
    version: 4,
    guides: project.guides ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV4toV5(project: LegacyProject): LegacyProject {
  return {
    ...project,
    version: 5,
    guides: project.guides ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      locked: (layer as Layer).locked ?? false,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV5toV6(project: LegacyProject): LegacyProject {
  return {
    ...project,
    version: 6,
    guides: project.guides ?? [],
    states: (project as Project).states ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      locked: (layer as Layer).locked ?? false,
      groupId: (layer as Layer).groupId ?? null,
      delay: (layer as Layer).delay ?? 0,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV6toV7(project: LegacyProject): LegacyProject {
  const duration = project.duration ?? 3
  return {
    ...project,
    version: 7,
    loopIn: (project as Project).loopIn ?? 0,
    loopOut: (project as Project).loopOut ?? duration,
    markers: (project as Project).markers ?? [],
    guides: project.guides ?? [],
    states: (project as Project).states ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      groupId: (layer as Layer).groupId ?? null,
      delay: (layer as Layer).delay ?? 0,
      locked: (layer as Layer).locked ?? false,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV7toV8(project: LegacyProject): LegacyProject {
  const artboard = (project as LegacyProject).artboard ?? { width: 800, height: 600 }
  return {
    ...(project as Project),
    version: 8,
    artboard: {
      name: artboard.name ?? 'Artboard',
      width: artboard.width ?? 800,
      height: artboard.height ?? 600,
      backgroundColor: artboard.backgroundColor ?? '#fdfcf9',
    },
    loopIn: (project as Project).loopIn ?? 0,
    loopOut: (project as Project).loopOut ?? (project.duration ?? 3),
    markers: (project as Project).markers ?? [],
    guides: project.guides ?? [],
    states: (project as Project).states ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      groupId: (layer as Layer).groupId ?? null,
      delay: (layer as Layer).delay ?? 0,
      locked: (layer as Layer).locked ?? false,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV8toV9(project: LegacyProject): LegacyProject {
  const duration = (project as Project).duration ?? 3
  const artboard = (project as LegacyProject).artboard ?? { width: 800, height: 600 }
  return {
    ...(project as Project),
    version: 9,
    canvas: {
      backgroundColor:
        (project as Project).canvas?.backgroundColor ?? DEFAULT_CANVAS.backgroundColor,
    },
    artboard: {
      name: artboard.name ?? 'Artboard',
      width: artboard.width ?? 800,
      height: artboard.height ?? 600,
      backgroundColor: artboard.backgroundColor ?? '#fdfcf9',
    },
    loopIn: (project as Project).loopIn ?? 0,
    loopOut: (project as Project).loopOut ?? duration,
    markers: (project as Project).markers ?? [],
    guides: project.guides ?? [],
    states: (project as Project).states ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      groupId: (layer as Layer).groupId ?? null,
      delay: (layer as Layer).delay ?? 0,
      locked: (layer as Layer).locked ?? false,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function migrateV9toV10(project: LegacyProject): LegacyProject {
  const duration = (project as Project).duration ?? 3
  const legacyArtboard = (project as LegacyProject).artboard ?? { width: 800, height: 600 }
  const artboardId = legacyArtboard.id ?? createId()
  const artboard = createArtboard({
    id: artboardId,
    name: legacyArtboard.name ?? 'Artboard',
    width: legacyArtboard.width ?? 800,
    height: legacyArtboard.height ?? 600,
    backgroundColor: legacyArtboard.backgroundColor ?? '#fdfcf9',
  })

  return {
    ...(project as Project),
    version: 10,
    canvas: {
      backgroundColor:
        (project as Project).canvas?.backgroundColor ?? DEFAULT_CANVAS.backgroundColor,
    },
    artboards: [artboard],
    fps: (project as LegacyProject).fps ?? DEFAULT_PROJECT_FPS,
    loopIn: (project as Project).loopIn ?? 0,
    loopOut: (project as Project).loopOut ?? duration,
    markers: (project as Project).markers ?? [],
    guides: project.guides ?? [],
    states: (project as Project).states ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      artboardId: (layer as Layer).artboardId ?? artboardId,
      groupId: (layer as Layer).groupId ?? null,
      delay: (layer as Layer).delay ?? 0,
      locked: (layer as Layer).locked ?? false,
      shape: {
        ...layer.shape,
        rotation: layer.shape.rotation ?? 0,
      } as Shape,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}

function normalizeProject(project: Project): Project {
  const duration = project.duration ?? 3
  const artboards =
    project.artboards.length > 0
      ? project.artboards
      : [createArtboard({ width: 800, height: 600 })]
  const defaultArtboardId = artboards[0]!.id

  return {
    ...project,
    canvas: {
      backgroundColor: project.canvas?.backgroundColor ?? DEFAULT_CANVAS.backgroundColor,
    },
    artboards,
    fps: project.fps ?? DEFAULT_PROJECT_FPS,
    loopIn: project.loopIn ?? 0,
    loopOut: project.loopOut ?? duration,
    markers: project.markers ?? [],
    states: project.states ?? [],
    layers: project.layers.map((layer) => ({
      ...layer,
      artboardId: layer.artboardId ?? defaultArtboardId,
      groupId: layer.groupId ?? null,
      delay: layer.delay ?? 0,
      locked: layer.locked ?? false,
    })),
  }
}

function migrateV10toV11(project: Project): Project {
  return {
    ...project,
    version: PROJECT_VERSION,
    importedSvg: project.importedSvg,
    layerGroups: project.layerGroups,
  }
}

export function migrateProject(parsed: LegacyProject): Project {
  let project: LegacyProject = parsed

  if (project.version === 1) {
    project = migrateV1toV2(project)
  }

  if (project.version === 2) {
    project = migrateV2toV3(project)
  }

  if (project.version === 3) {
    project = migrateV3toV4(project)
  }

  if (project.version === 4) {
    project = migrateV4toV5(project)
  }

  if (project.version === 5) {
    project = migrateV5toV6(project)
  }

  if (project.version === 6) {
    project = migrateV6toV7(project)
  }

  if (project.version === 7) {
    project = migrateV7toV8(project)
  }

  if (project.version === 8) {
    project = migrateV8toV9(project)
  }

  if (project.version === 9) {
    project = migrateV9toV10(project)
  }

  if (project.version === 10) {
    return migrateV10toV11(project as Project)
  }

  if (project.version === PROJECT_VERSION) {
    return normalizeProject(project as Project)
  }

  throw new Error(`Unsupported project version: ${String(project.version)}`)
}
