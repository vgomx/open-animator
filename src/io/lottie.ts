import type { Keyframe, Layer, Project } from '@/editor/types'
import { getExportArtboard, getExportLayers, getProjectFps } from '@/editor/artboard-utils'
import { DEFAULT_ARTBOARD, DEFAULT_CANVAS, PROJECT_VERSION, createArtboard } from '@/editor/types'
import { getAnimatedShape } from '@/editor/animation'
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

function lottieEasingHandles(
  easing: Keyframe['easing'],
  bezier?: Keyframe['bezier'],
): Pick<LottieKeyframe, 'i' | 'o'> {
  if (easing === 'custom' && bezier) {
    const [x1, y1, x2, y2] = bezier
    return {
      o: { x: [x1], y: [y1] },
      i: { x: [x2], y: [y2] },
    }
  }

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

function collectAnimatedTimes(layer: Layer): number[] {
  const times = new Set<number>([0])
  for (const keyframe of layer.keyframes) {
    times.add(keyframe.time)
  }

  return [...times].sort((a, b) => a - b)
}

function layerPosition(shape: Layer['shape']): [number, number, number] {
  if (shape.type === 'rect') {
    return [shape.x + shape.width / 2, shape.y + shape.height / 2, 0]
  }

  return [shape.x, shape.y, 0]
}

function toLottieTransformProperty(
  keyframes: LottieKeyframe[],
  staticValue: number | number[],
): { a: 0 | 1; k: LottieKeyframe[] | number | number[] } {
  if (keyframes.length > 1) {
    return { a: 1, k: keyframes }
  }

  if (keyframes.length === 1) {
    const sample = keyframes[0]!.s
    if (sample.length === 1) {
      return { a: 0, k: sample[0]! }
    }

    return { a: 0, k: sample }
  }

  return { a: 0, k: staticValue }
}

function buildTransformKeyframes(layer: Layer, frameRate: number) {
  const times = collectAnimatedTimes(layer)
  const position: LottieKeyframe[] = []
  const rotation: LottieKeyframe[] = []
  const opacity: LottieKeyframe[] = []
  const scale: LottieKeyframe[] = []

  for (const time of times) {
    const shape = getAnimatedShape(layer, time)
    const frame = Math.round(time * frameRate)
    const easing = layer.keyframes.find((keyframe) => keyframe.time === time)?.easing
    const bezier = layer.keyframes.find((keyframe) => keyframe.time === time)?.bezier
    const easingHandles = lottieEasingHandles(easing, bezier)

    position.push({
      t: frame,
      s: layerPosition(shape),
      ...easingHandles,
    })
    rotation.push({
      t: frame,
      s: [shape.rotation],
      ...easingHandles,
    })
    opacity.push({
      t: frame,
      s: [shape.opacity * 100],
      ...easingHandles,
    })
    scale.push({
      t: frame,
      s: [shape.scale * 100, shape.scale * 100, 100],
      ...easingHandles,
    })
  }

  return {
    position: toLottieTransformProperty(position, layerPosition(layer.shape)),
    rotation: toLottieTransformProperty(rotation, layer.shape.rotation),
    opacity: toLottieTransformProperty(opacity, layer.shape.opacity * 100),
    scale: toLottieTransformProperty(scale, [
      layer.shape.scale * 100,
      layer.shape.scale * 100,
      100,
    ]),
  }
}

function layerToLottieShape(layer: Layer, frameRate: number, layerIndex: number) {
  const { shape } = layer
  const transform = buildTransformKeyframes(layer, frameRate)

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
          : shape.type === 'path'
            ? {
              ty: 'sh',
              ks: {
                a: 0,
                k: {
                  i: shape.points.map(() => [0, 0]),
                  o: shape.points.map(() => [0, 0]),
                  v: shape.points.map((point) => [point.x, point.y]),
                  c: shape.closed,
                },
              },
            }
            : {
            ty: 'rc',
            d: 1,
            s: { a: 0, k: [120, 120] },
            p: { a: 0, k: [0, 0, 0] },
          }

  return {
    ddd: 0,
    ind: layerIndex + 1,
    ty: 4,
    nm: layer.name,
    sr: 1,
    ks: {
      o: transform.opacity,
      r: transform.rotation,
      p: transform.position,
      a: { a: 0, k: [0, 0, 0] },
      s: transform.scale,
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        nm: `${layer.name} Group`,
        it: [
          shapeItem,
          {
            ty: 'fl',
            nm: 'Fill',
            c: { a: 0, k: hexToLottieColor(shape.fill) },
            o: { a: 0, k: 100 },
            r: 1,
          },
          {
            ty: 'st',
            nm: 'Stroke',
            c: { a: 0, k: hexToLottieColor(shape.stroke) },
            o: { a: 0, k: 100 },
            w: { a: 0, k: shape.strokeWidth },
            lc: 1,
            lj: 1,
          },
          {
            ty: 'tr',
            nm: 'Transform',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
          },
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
  if (hex === 'none' || hex === 'transparent' || !hex.startsWith('#')) {
    return [0, 0, 0, 0]
  }

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

export function exportLottie(project: Project, artboardId?: string): object {
  const artboard = getExportArtboard(project, artboardId)
  const layers = getExportLayers(project, artboardId)
  const frameRate = getProjectFps(project)
  const width = artboard.width
  const height = artboard.height

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
    layers: [...layers]
      .filter((layer) => layer.visible)
      .reverse()
      .map((layer, index) => layerToLottieShape(layer, frameRate, index)),
  }
}

export function downloadLottie(project: Project, filename = 'animation.json', artboardId?: string): void {
  const blob = new Blob([JSON.stringify(exportLottie(project, artboardId), null, 2)], {
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
    const artboard = createArtboard({
      name: DEFAULT_ARTBOARD.name,
      width: data.w ?? DEFAULT_ARTBOARD.width,
      height: data.h ?? DEFAULT_ARTBOARD.height,
      backgroundColor: DEFAULT_ARTBOARD.backgroundColor,
    })
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
      const rectWidth = shapeNode.s?.k?.[0] ?? 100
      const rectHeight = shapeNode.s?.k?.[1] ?? 100

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
              rx: rectWidth / 2,
              ry: rectHeight / 2,
              fill,
              stroke,
              strokeWidth: strokeNode?.w?.k ?? 0,
              opacity: (readStaticVector(lottieLayer.ks?.o?.k, [100])[0] ?? 100) / 100,
              scale: (readStaticVector(lottieLayer.ks?.s?.k, [100, 100, 100])[0] ?? 100) / 100,
            }
          : {
              id: shapeId,
              type: 'rect' as const,
              x: firstPosition[0] - rectWidth / 2,
              y: firstPosition[1] - rectHeight / 2,
              rotation: 0,
              width: rectWidth,
              height: rectHeight,
              fill,
              stroke,
              strokeWidth: strokeNode?.w?.k ?? 0,
              opacity: (readStaticVector(lottieLayer.ks?.o?.k, [100])[0] ?? 100) / 100,
              scale: (readStaticVector(lottieLayer.ks?.s?.k, [100, 100, 100])[0] ?? 100) / 100,
            }

      const keyframes: Keyframe[] = []
      for (const frame of positionTrack) {
        const x =
          shapeNode.ty === 'el' ? frame.s[0] : frame.s[0] - rectWidth / 2
        const y =
          shapeNode.ty === 'el' ? frame.s[1] : frame.s[1] - rectHeight / 2
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'x',
          value: x,
          easing: 'linear',
        })
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'y',
          value: y,
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
        artboardId: artboard.id,
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
      canvas: { ...DEFAULT_CANVAS },
      artboards: [artboard],
      fps: frameRate,
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
