import type { Keyframe, Layer, Project } from '@/editor/types'
import { PROJECT_VERSION } from '@/editor/types'

type LegacyProject = Omit<Project, 'version'> & {
  version: number
  layers: Array<Omit<Layer, 'keyframes'> & { keyframes: Array<Omit<Keyframe, 'easing'> & { easing?: Keyframe['easing'] }> }>
}

export function migrateProject(parsed: LegacyProject): Project {
  return {
    ...parsed,
    version: PROJECT_VERSION,
    layers: parsed.layers.map((layer) => ({
      ...layer,
      keyframes: layer.keyframes.map((keyframe) => ({
        ...keyframe,
        easing: keyframe.easing ?? 'linear',
      })),
    })),
  }
}
