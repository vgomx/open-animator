// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { importSvg } from '@/io/svg-import'
import { collectMatrixKeyframesForNode, effectiveMatrixAtTime } from '@/io/svg-smil'
import { matrixKeyframesHaveMotion } from '@/editor/layer-animation'

function matrixDiff(a: ReturnType<typeof effectiveMatrixAtTime>, b: ReturnType<typeof effectiveMatrixAtTime>) {
  return (
    Math.abs(a.a - b.a) +
    Math.abs(a.b - b.b) +
    Math.abs(a.c - b.c) +
    Math.abs(a.d - b.d) +
    Math.abs(a.e - b.e) +
    Math.abs(a.f - b.f)
  )
}

describe('balloon source motion audit', () => {
  it('counts how many source paths should animate', { timeout: 30000 }, () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const sourcePaths = [...doc.querySelectorAll('path')].filter((path) => path.getAttribute('d'))

    let sourceMoves = 0
    let importedMoves = 0
    let sourceMovesImportedStatic = 0
    const samples: string[] = []

    const imported = importSvg(balloonSvg)!

    for (const sourcePath of sourcePaths) {
      const diff = matrixDiff(
        effectiveMatrixAtTime(sourcePath, 0),
        effectiveMatrixAtTime(sourcePath, 6),
      )
      if (diff <= 0.5) {
        continue
      }
      sourceMoves += 1

      const collected = collectMatrixKeyframesForNode(sourcePath)
      const hasMotion = matrixKeyframesHaveMotion(collected.keyframes)
      if (hasMotion) {
        importedMoves += 1
      } else {
        sourceMovesImportedStatic += 1
        if (samples.length < 5) {
          const parent = sourcePath.parentElement
          samples.push(
            JSON.stringify({
              id: sourcePath.getAttribute('id'),
              parentTag: parent?.tagName,
              parentTransform: parent?.getAttribute('transform')?.slice(0, 40),
              parentSmil: parent?.querySelector('animateTransform')?.getAttribute('type'),
              collectedLen: collected.keyframes.length,
              collectedDuration: collected.duration,
              kf0e: collected.keyframes[0]?.e,
              kfLastE: collected.keyframes[collected.keyframes.length - 1]?.e,
            }),
          )
        }
      }
    }

    console.log({
      sourcePaths: sourcePaths.length,
      sourceMoves,
      importedMoves,
      sourceMovesImportedStatic,
      importedLayerMotion: imported.layers.filter((l) =>
        matrixKeyframesHaveMotion(l.matrixKeyframes),
      ).length,
      samples,
    })

    expect(sourceMoves).toBeGreaterThan(50)
    expect(importedMoves).toBe(sourceMoves)
  })
})
