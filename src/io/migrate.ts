import type { Keyframe, Layer, Project, Shape } from '@/editor/types'
import { PROJECT_VERSION } from '@/editor/types'

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

type LegacyProject = Omit<Project, 'version' | 'layers' | 'guides' | 'states' | 'loopIn' | 'loopOut' | 'markers'> & {
  version: number
  layers: LegacyLayer[]
  guides?: Project['guides']
  states?: Project['states']
  loopIn?: number
  loopOut?: number
  markers?: Project['markers']
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

function migrateV6toV7(project: LegacyProject): Project {
  const duration = project.duration ?? 3
  return {
    ...project,
    version: PROJECT_VERSION,
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
    return migrateV6toV7(project)
  }

  if (project.version === PROJECT_VERSION) {
    const duration = (project as Project).duration ?? 3
    return {
      ...(project as Project),
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
