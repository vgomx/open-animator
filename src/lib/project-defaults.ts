import type { Layer, Project } from '@/editor/types'
import { createArtboard, DEFAULT_CANVAS, DEFAULT_PROJECT_FPS, PROJECT_VERSION } from '@/editor/types'

type LayerInput = Omit<Layer, 'groupId' | 'delay' | 'artboardId'> &
  Partial<Pick<Layer, 'groupId' | 'delay' | 'artboardId'>>

export function projectDefaults(
  partial: {
    duration: number
    layers: LayerInput[]
  } & Partial<Omit<Project, 'duration' | 'layers'>>,
): Project {
  const artboards = partial.artboards ?? [createArtboard({ width: 800, height: 600 })]
  const defaultArtboardId = artboards[0]!.id

  return {
    version: PROJECT_VERSION,
    canvas: partial.canvas ?? { ...DEFAULT_CANVAS },
    artboards,
    fps: partial.fps ?? DEFAULT_PROJECT_FPS,
    duration: partial.duration,
    loopIn: partial.loopIn ?? 0,
    loopOut: partial.loopOut ?? partial.duration,
    guides: partial.guides ?? [],
    states: partial.states ?? [],
    markers: partial.markers ?? [],
    layers: partial.layers.map((layer) => ({
      ...layer,
      artboardId: layer.artboardId ?? defaultArtboardId,
      groupId: layer.groupId ?? null,
      delay: layer.delay ?? 0,
    })),
  }
}
