import type { Layer, Project } from '@/editor/types'
import { DEFAULT_ARTBOARD, DEFAULT_CANVAS, PROJECT_VERSION } from '@/editor/types'

type LayerInput = Omit<Layer, 'groupId' | 'delay'> & Partial<Pick<Layer, 'groupId' | 'delay'>>

export function projectDefaults(
  partial: {
    duration: number
    layers: LayerInput[]
  } & Partial<Omit<Project, 'duration' | 'layers'>>,
): Project {
  return {
    version: PROJECT_VERSION,
    canvas: partial.canvas ?? { ...DEFAULT_CANVAS },
    artboard: partial.artboard ?? { ...DEFAULT_ARTBOARD },
    duration: partial.duration,
    loopIn: partial.loopIn ?? 0,
    loopOut: partial.loopOut ?? partial.duration,
    guides: partial.guides ?? [],
    states: partial.states ?? [],
    markers: partial.markers ?? [],
    layers: partial.layers.map((layer) => ({
      ...layer,
      groupId: layer.groupId ?? null,
      delay: layer.delay ?? 0,
    })),
  }
}
