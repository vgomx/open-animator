import { describe, expect, it } from 'vitest'

import { countAnimatedLayers } from '@/editor/layer-animation'
import {
  TRAIN_PERF_SAMPLE_ANIMATED_LAYER_COUNT,
  TRAIN_PERF_SAMPLE_LAYER_COUNT,
  trainPerfSampleProject,
} from '@/lib/templates/train-perf-sample'

describe('train perf sample template', () => {
  it('builds a multi-layer parallax train scene for playback benchmarking', () => {
    const project = trainPerfSampleProject()

    expect(project.duration).toBe(8)
    expect(project.artboards[0]).toMatchObject({ width: 1080, height: 1080 })
    expect(project.layers).toHaveLength(TRAIN_PERF_SAMPLE_LAYER_COUNT)
    expect(countAnimatedLayers(project.layers)).toBe(TRAIN_PERF_SAMPLE_ANIMATED_LAYER_COUNT)
  })
})
