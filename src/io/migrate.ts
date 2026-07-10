import type { Keyframe, Layer, Project, Shape } from '@/editor/types'
import { PROJECT_VERSION } from '@/editor/types'

type LegacyKeyframe = Omit<Keyframe, 'easing' | 'value'> & {
  easing?: Keyframe['easing']
  value: number | string
}

type LegacyLayer = Omit<Layer, 'shape' | 'keyframes'> & {
  shape: Shape & { rotation?: number }
  keyframes: LegacyKeyframe[]
}

type LegacyProject = Omit<Project, 'version' | 'layers' | 'guides'> & {
  version: number
  layers: LegacyLayer[]
  guides?: Project['guides']
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

function migrateV3toV4(project: LegacyProject): Project {
  return {
    ...project,
    version: PROJECT_VERSION,
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

export function migrateProject(parsed: LegacyProject): Project {
  let project: LegacyProject = parsed

  if (project.version === 1) {
    project = migrateV1toV2(project)
  }

  if (project.version === 2) {
    project = migrateV2toV3(project)
  }

  if (project.version === 3) {
    return migrateV3toV4(project)
  }

  if (project.version === PROJECT_VERSION) {
    return project as Project
  }

  throw new Error(`Unsupported project version: ${String(project.version)}`)
}
