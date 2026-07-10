import type { AnimatableProperty, Keyframe, Layer, Project } from '@/editor/types'
import { isNumericProperty, PROJECT_VERSION } from '@/editor/types'
import { createId } from '@/editor/scene'

type LottieKeyframe = {
  t: number
  s: number[]
  i?: { x: number[]; y: number[] }
  o?: { x: number[]; y: number[] }
}

type LottieAnimatedTrack = LottieKeyframe[] | number[]

function asKeyframeTrack(value: LottieAnimatedTrack | undefined): LottieKeyframe[] {
  if (!Array.isArray(value) || value.length === 0 || typeof value[0] === 'number') {
    return []
  }

  return value as LottieKeyframe[]
}

function readStaticVector(value: LottieAnimatedTrack | undefined, fallback: number[]): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fallback
  }

  if (typeof value[0] === 'number') {
    return value as number[]
  }

  return value[0].s
}

function lottieEasingHandles(easing: Keyframe['easing']): Pick<LottieKeyframe, 'i' | 'o'> {
  switch (easing) {
    case 'easeIn':
      return { i: { x: [0.42], y: [0] }, o: { x: [1], y: [1] } }
    case 'easeOut':
      return { i: { x: [0], y: [0] }, o: { x: [0.58], y: [1] } }
    case 'easeInOut':
      return { i: { x: [0.42], y: [0] }, o: { x: [0.58], y: [1] } }
    case 'bounce':
    case 'spring':
    case 'elastic':
    case 'back':
      return { i: { x: [0], y: [0] }, o: { x: [0.58], y: [1] } }
    case 'hold':
      return { i: { x: [0], y: [0] }, o: { x: [0], y: [0] } }
    default:
      return {}
  }
}

function readShapeNumericValue(shape: Layer['shape'], property: AnimatableProperty): number {
  if (property === 'width' || property === 'height') {
    return shape.type === 'rect' ? shape[property] : 0
  }

  if (property === 'rx' || property === 'ry') {
    return shape.type === 'ellipse' ? shape[property] : 0
  }

  if (
    property === 'x' ||
    property === 'y' ||
    property === 'rotation' ||
    property === 'opacity' ||
    property === 'scale'
  ) {
    return shape[property]
  }

  return 0
}

function buildPropertyKeyframes(
  layer: Layer,
  property: AnimatableProperty,
  frameRate: number,
  mapValue: (value: number, shape: Layer['shape']) => number[],
): LottieKeyframe[] {
  if (!isNumericProperty(property)) {
    return []
  }

  const baseValue = readShapeNumericValue(layer.shape, property)
  const track = layer.keyframes
    .filter((keyframe) => keyframe.property === property)
    .sort((a, b) => a.time - b.time)

  if (track.length === 0) {
    return [{ t: 0, s: mapValue(baseValue, layer.shape) }]
  }

  return track.map((keyframe) => ({
    t: Math.round(keyframe.time * frameRate),
    s: mapValue(keyframe.value as number, layer.shape),
    ...lottieEasingHandles(keyframe.easing),
  }))
}

function layerToLottieShape(layer: Layer, frameRate: number) {
  const { shape } = layer
  const position = buildPropertyKeyframes(layer, 'x', frameRate, (value, currentShape) => {
    const y = currentShape.y
    return [value, y, 0]
  }).map((keyframe, index) => {
    if (layer.keyframes.some((item) => item.property === 'y')) {
      const yTrack = buildPropertyKeyframes(layer, 'y', frameRate, (value) => [value])
      const yFrame = yTrack[index] ?? yTrack[yTrack.length - 1]
      return {
        ...keyframe,
        s: [keyframe.s[0], yFrame?.s[0] ?? shape.y, 0],
      }
    }
    return keyframe
  })

  const opacity = buildPropertyKeyframes(layer, 'opacity', frameRate, (value) => [value * 100])
  const scale = buildPropertyKeyframes(layer, 'scale', frameRate, (value) => [value * 100, value * 100, 100])
  const rotation = buildPropertyKeyframes(layer, 'rotation', frameRate, (value) => [value])

  const shapeItem =
    shape.type === 'rect'
      ? {
          ty: 'rc',
          d: 1,
          s: { a: 0, k: [shape.width, shape.height] },
          p: { a: 0, k: [shape.width / 2, shape.height / 2, 0] },
          r: { a: 0, k: 0 },
        }
      : shape.type === 'ellipse'
        ? {
          ty: 'el',
          d: 1,
          s: { a: 0, k: [shape.rx * 2, shape.ry * 2] },
          p: { a: 0, k: [0, 0, 0] },
        }
        : shape.type === 'text'
          ? {
            ty: 'rc',
            d: 1,
            s: { a: 0, k: [100, shape.fontSize] },
            p: { a: 0, k: [0, 0, 0] },
          }
          : {
            ty: 'rc',
            d: 1,
            s: { a: 0, k: [120, 120] },
            p: { a: 0, k: [0, 0, 0] },
          }

  return {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: layer.name,
    sr: 1,
    ks: {
      o: { a: opacity.length > 1 ? 1 : 0, k: opacity },
      r: { a: rotation.length > 1 ? 1 : 0, k: rotation },
      p: { a: position.length > 1 ? 1 : 0, k: position },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: scale.length > 1 ? 1 : 0, k: scale },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          shapeItem,
          {
            ty: 'fl',
            c: { a: 0, k: hexToLottieColor(shape.fill) },
            o: { a: 0, k: 100 },
            r: 1,
          },
          {
            ty: 'st',
            c: { a: 0, k: hexToLottieColor(shape.stroke) },
            o: { a: 0, k: 100 },
            w: { a: 0, k: shape.strokeWidth },
            lc: 1,
            lj: 1,
          },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ],
      },
    ],
    ip: 0,
    op: Math.round(layer.keyframes.reduce((max, keyframe) => Math.max(max, keyframe.time), 0) * frameRate) || 1,
    st: 0,
    bm: 0,
  }
}

function hexToLottieColor(hex: string): number[] {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized.padStart(6, '0')

  const r = Number.parseInt(value.slice(0, 2), 16) / 255
  const g = Number.parseInt(value.slice(2, 4), 16) / 255
  const b = Number.parseInt(value.slice(4, 6), 16) / 255
  return [r, g, b, 1]
}

export function exportLottie(project: Project): object {
  const frameRate = 30
  const width = project.artboard.width
  const height = project.artboard.height

  return {
    v: '5.7.4',
    fr: frameRate,
    ip: 0,
    op: Math.round(project.duration * frameRate),
    w: width,
    h: height,
    nm: 'Open Animator Export',
    ddd: 0,
    assets: [],
    layers: [...project.layers]
      .filter((layer) => layer.visible)
      .reverse()
      .map((layer) => layerToLottieShape(layer, frameRate)),
  }
}

export function downloadLottie(project: Project, filename = 'animation.json'): void {
  const blob = new Blob([JSON.stringify(exportLottie(project), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

// Minimal import for rect/ellipse shape layers with basic transform keyframes.
export function importLottie(raw: string): Project | null {
  try {
    const data = JSON.parse(raw) as {
      w?: number
      h?: number
      fr?: number
      op?: number
      layers?: Array<{
        nm?: string
        ks?: {
          p?: { k?: LottieAnimatedTrack }
          o?: { k?: LottieAnimatedTrack }
          s?: { k?: LottieAnimatedTrack }
        }
        shapes?: Array<{
          it?: Array<{
            ty?: string
            s?: { k?: number[] }
            c?: { k?: number[] }
            w?: { k?: number }
          }>
        }>
      }>
    }

    const frameRate = data.fr ?? 30
    const duration = (data.op ?? frameRate) / frameRate
    const layers: Layer[] = []

    for (const lottieLayer of data.layers ?? []) {
      const group = lottieLayer.shapes?.[0]?.it ?? []
      const shapeNode = group.find((item) => item.ty === 'rc' || item.ty === 'el')
      const fillNode = group.find((item) => item.ty === 'fl')
      const strokeNode = group.find((item) => item.ty === 'st')
      if (!shapeNode) {
        continue
      }

      const positionTrack = asKeyframeTrack(lottieLayer.ks?.p?.k)
      const opacityTrack = asKeyframeTrack(lottieLayer.ks?.o?.k)
      const scaleTrack = asKeyframeTrack(lottieLayer.ks?.s?.k)

      const firstPosition = readStaticVector(lottieLayer.ks?.p?.k, [0, 0, 0])
      const fill = lottieColorToHex(fillNode?.c?.k ?? [0, 0, 0, 1])
      const stroke = lottieColorToHex(strokeNode?.c?.k ?? [0, 0, 0, 1])

      const layerId = createId()
      const shapeId = createId()
      const base =
        shapeNode.ty === 'el'
          ? {
              id: shapeId,
              type: 'ellipse' as const,
              x: firstPosition[0],
              y: firstPosition[1],
              rotation: 0,
              rx: (shapeNode.s?.k?.[0] ?? 100) / 2,
              ry: (shapeNode.s?.k?.[1] ?? 100) / 2,
              fill,
              stroke,
              strokeWidth: strokeNode?.w?.k ?? 0,
              opacity: (readStaticVector(lottieLayer.ks?.o?.k, [100])[0] ?? 100) / 100,
              scale: (readStaticVector(lottieLayer.ks?.s?.k, [100, 100, 100])[0] ?? 100) / 100,
            }
          : {
              id: shapeId,
              type: 'rect' as const,
              x: firstPosition[0],
              y: firstPosition[1],
              rotation: 0,
              width: shapeNode.s?.k?.[0] ?? 100,
              height: shapeNode.s?.k?.[1] ?? 100,
              fill,
              stroke,
              strokeWidth: strokeNode?.w?.k ?? 0,
              opacity: (readStaticVector(lottieLayer.ks?.o?.k, [100])[0] ?? 100) / 100,
              scale: (readStaticVector(lottieLayer.ks?.s?.k, [100, 100, 100])[0] ?? 100) / 100,
            }

      const keyframes: Keyframe[] = []
      for (const frame of positionTrack) {
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'x',
          value: frame.s[0],
          easing: 'linear',
        })
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'y',
          value: frame.s[1],
          easing: 'linear',
        })
      }
      for (const frame of opacityTrack) {
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'opacity',
          value: frame.s[0] / 100,
          easing: 'linear',
        })
      }
      for (const frame of scaleTrack) {
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'scale',
          value: frame.s[0] / 100,
          easing: 'linear',
        })
      }

      layers.push({
        id: layerId,
        name: lottieLayer.nm ?? `Layer ${layers.length + 1}`,
        visible: true,
        locked: false,
        groupId: null,
        delay: 0,
        shape: base,
        keyframes,
      })
    }

    return {
      version: PROJECT_VERSION,
      artboard: {
        width: data.w ?? 800,
        height: data.h ?? 600,
      },
      duration,
      loopIn: 0,
      loopOut: duration,
      layers,
      guides: [],
      states: [],
      markers: [],
    }
  } catch {
    return null
  }
}

function lottieColorToHex(color: number[]): string {
  const [r, g, b] = color
  const toHex = (value: number) =>
    Math.round(Math.max(0, Math.min(1, value)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export async function openLottieFile(): Promise<Project | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const text = await file.text()
        resolve(importLottie(text))
      } catch {
        resolve(null)
      }
    })

    input.click()
  })
}
