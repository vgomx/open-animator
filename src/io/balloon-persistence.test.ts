// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getBalloonProject } from '@/io/fixtures/balloon-fixture'
import { serializeProject, deserializeProject } from '@/io/project'
import { getAnimatedShape } from '@/editor/animation'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'

describe('balloon roundtrip persistence', () => {
  it('preserves matrixKeyframes through serialize/deserialize', () => {
    const project = getBalloonProject()
    const roundtripped = deserializeProject(serializeProject(project))

    const beforeMotion = project.layers.filter((l) => matrixKeyframesHaveMotion(l.matrixKeyframes)).length
    const afterMotion = roundtripped.layers.filter((l) => matrixKeyframesHaveMotion(l.matrixKeyframes)).length
    const beforeWithKf = project.layers.filter((l) => (l.matrixKeyframes?.length ?? 0) > 0).length
    const afterWithKf = roundtripped.layers.filter((l) => (l.matrixKeyframes?.length ?? 0) > 0).length

    let playbackOk = 0
    for (const layer of roundtripped.layers) {
      if (!matrixKeyframesHaveMotion(layer.matrixKeyframes)) continue
      const s0 = getAnimatedShape(layer, 0)
      const s6 = getAnimatedShape(layer, 6)
      if (s0.type === 'path' && s6.type === 'path' && s0.transformMatrix && s6.transformMatrix) {
        if (s0.transformMatrix.e !== s6.transformMatrix.e || s0.transformMatrix.f !== s6.transformMatrix.f) {
          playbackOk += 1
        }
      }
    }

    console.log({ beforeMotion, afterMotion, beforeWithKf, afterWithKf, playbackOk })

    expect(afterWithKf).toBe(beforeWithKf)
    expect(afterMotion).toBe(beforeMotion)
    expect(playbackOk).toBe(beforeMotion)
  })
})
