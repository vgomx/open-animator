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

type LegacyProject = Omit<Project, 'version' | 'layers'> & {
  version: number
  layers: LegacyLayer[]
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

function migrateV2toV3(project: LegacyProject): Project {
  return {
    ...project,
    version: PROJECT_VERSION,
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
    return migrateV2toV3(project)
  }

  if (project.version === PROJECT_VERSION) {
    return project as Project
  }

  throw new Error(`Unsupported project version: ${String(project.version)}`)
}
