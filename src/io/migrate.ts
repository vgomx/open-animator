import type { Keyframe, Layer, Project, Shape } from '@/editor/types'
import { DEFAULT_ARTBOARD, DEFAULT_CANVAS, PROJECT_VERSION } from '@/editor/types'

type LegacyKeyframe = Omit<Keyframe, 'easing' | 'value'> & {
  easing?: Keyframe['easing']
  value: number | string
}

type LegacyLayer = Omit<Layer, 'shape' | 'keyframes' | 'locked' | 'groupId' | 'delay'> & {
  locked?: boolean
  groupId?: string | null
  delay?: number
  shape: Shape & { rotation?: number }
  keyframes: LegacyKeyframe[]
}

type LegacyProject = Omit<
  Project,
  'version' | 'layers' | 'guides' | 'states' | 'loopIn' | 'loopOut' | 'markers' | 'canvas'
> & {
  version: number
  layers: LegacyLayer[]
  guides?: Project['guides']
  states?: Project['states']
  loopIn?: number
  loopOut?: number
  markers?: Project['markers']
  canvas?: Project['canvas']
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
  const artboard = (project as Project).artboard ?? { width: 800, height: 600 }
  return {
    ...(project as Project),
    version: 8,
    artboard: {
      name: (artboard as Project['artboard']).name ?? DEFAULT_ARTBOARD.name,
      width: artboard.width ?? DEFAULT_ARTBOARD.width,
      height: artboard.height ?? DEFAULT_ARTBOARD.height,
      backgroundColor:
        (artboard as Project['artboard']).backgroundColor ?? DEFAULT_ARTBOARD.backgroundColor,
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

function migrateV8toV9(project: LegacyProject): Project {
  const duration = (project as Project).duration ?? 3
  const artboard = (project as Project).artboard ?? { width: 800, height: 600 }
  return {
    ...(project as Project),
    version: PROJECT_VERSION,
    canvas: {
      backgroundColor:
        (project as Project).canvas?.backgroundColor ?? DEFAULT_CANVAS.backgroundColor,
    },
    artboard: {
      name: (artboard as Project['artboard']).name ?? DEFAULT_ARTBOARD.name,
      width: artboard.width ?? DEFAULT_ARTBOARD.width,
      height: artboard.height ?? DEFAULT_ARTBOARD.height,
      backgroundColor:
        (artboard as Project['artboard']).backgroundColor ?? DEFAULT_ARTBOARD.backgroundColor,
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
    return migrateV8toV9(project)
  }

  if (project.version === PROJECT_VERSION) {
    const duration = (project as Project).duration ?? 3
    const artboard = (project as Project).artboard ?? { width: 800, height: 600 }
    return {
      ...(project as Project),
      canvas: {
        backgroundColor:
          (project as Project).canvas?.backgroundColor ?? DEFAULT_CANVAS.backgroundColor,
      },
      artboard: {
        name: (artboard as Project['artboard']).name ?? DEFAULT_ARTBOARD.name,
        width: artboard.width ?? DEFAULT_ARTBOARD.width,
        height: artboard.height ?? DEFAULT_ARTBOARD.height,
        backgroundColor:
          (artboard as Project['artboard']).backgroundColor ?? DEFAULT_ARTBOARD.backgroundColor,
      },
      loopIn: (project as Project).loopIn ?? 0,
      loopOut: (project as Project).loopOut ?? duration,
      markers: (project as Project).markers ?? [],
      states: (project as Project).states ?? [],
      layers: project.layers.map((layer) => ({
        ...layer,
        groupId: (layer as Layer).groupId ?? null,
        delay: (layer as Layer).delay ?? 0,
        locked: (layer as Layer).locked ?? false,
      })),
    }
  }

  throw new Error(`Unsupported project version: ${String(project.version)}`)
}
