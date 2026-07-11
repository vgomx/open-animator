import { createId } from '@/editor/scene'
import type { Keyframe, Layer, MatrixKeyframe } from '@/editor/types'
import { decomposeMatrix, invertMatrix, multiplyMatrix } from '@/io/svg-transform'

export function matrixKeyframesHaveMotion(matrixKeyframes: MatrixKeyframe[] | undefined): boolean {
  if (!matrixKeyframes || matrixKeyframes.length <= 1) {
    return false
  }

  const first = matrixKeyframes[0]!
  return matrixKeyframes.some(
    (keyframe) =>
      Math.abs(keyframe.a - first.a) > 0.001 ||
      Math.abs(keyframe.b - first.b) > 0.001 ||
      Math.abs(keyframe.c - first.c) > 0.001 ||
      Math.abs(keyframe.d - first.d) > 0.001 ||
      Math.abs(keyframe.e - first.e) > 0.5 ||
      Math.abs(keyframe.f - first.f) > 0.5,
  )
}

export function layerHasAnimation(layer: Layer): boolean {
  return layer.keyframes.length > 0 || matrixKeyframesHaveMotion(layer.matrixKeyframes)
}

export function countAnimatedLayers(layers: Layer[]): number {
  return layers.filter(layerHasAnimation).length
}

export function matrixKeyframesToDisplayKeyframes(matrixKeyframes: MatrixKeyframe[]): Keyframe[] {
  if (!matrixKeyframesHaveMotion(matrixKeyframes)) {
    return []
  }

  const base = matrixKeyframes[0]!
  const baseInverse = invertMatrix({
    a: base.a,
    b: base.b,
    c: base.c,
    d: base.d,
    e: base.e,
    f: base.f,
  })

  if (!baseInverse) {
    return []
  }

  const keyframes: Keyframe[] = []

  const addKeyframe = (
    time: number,
    property: 'x' | 'y' | 'rotation' | 'scale',
    value: number,
  ) => {
    const existing = keyframes.find(
      (keyframe) => keyframe.time === time && keyframe.property === property,
    )
    if (existing) {
      existing.value = value
      return
    }

    keyframes.push({
      id: createId(),
      time,
      property,
      value,
      easing: 'linear',
    })
  }

  for (const sample of matrixKeyframes) {
    if (sample.time === 0) {
      continue
    }

    const delta = multiplyMatrix(
      { a: sample.a, b: sample.b, c: sample.c, d: sample.d, e: sample.e, f: sample.f },
      baseInverse,
    )
    const decomposed = decomposeMatrix(delta)

    if (Math.abs(decomposed.x) > 0.001) {
      addKeyframe(0, 'x', 0)
      addKeyframe(sample.time, 'x', decomposed.x)
    }
    if (Math.abs(decomposed.y) > 0.001) {
      addKeyframe(0, 'y', 0)
      addKeyframe(sample.time, 'y', decomposed.y)
    }
    if (Math.abs(decomposed.rotation) > 0.001) {
      addKeyframe(0, 'rotation', 0)
      addKeyframe(sample.time, 'rotation', decomposed.rotation)
    }
    if (Math.abs(decomposed.scale - 1) > 0.001) {
      addKeyframe(0, 'scale', 1)
      addKeyframe(sample.time, 'scale', decomposed.scale)
    }
  }

  return keyframes
}

export function attachMatrixDisplayKeyframes(layer: Layer): Layer {
  if (!matrixKeyframesHaveMotion(layer.matrixKeyframes)) {
    return layer
  }

  const displayKeyframes = matrixKeyframesToDisplayKeyframes(layer.matrixKeyframes!)
  if (displayKeyframes.length === 0) {
    return layer
  }

  return {
    ...layer,
    keyframes: [...layer.keyframes, ...displayKeyframes],
  }
}

export function collectAllKeyframeTimes(
  layers: Array<{
    keyframes: Array<{ id: string; time: number }>
    matrixKeyframes?: Array<{ time: number }>
  }>,
  excludeIds: string[] = [],
): number[] {
  const excluded = new Set(excludeIds)
  const times = new Set<number>()

  for (const layer of layers) {
    for (const keyframe of layer.keyframes) {
      if (!excluded.has(keyframe.id)) {
        times.add(keyframe.time)
      }
    }

    for (const keyframe of layer.matrixKeyframes ?? []) {
      times.add(keyframe.time)
    }
  }

  return [...times]
}
