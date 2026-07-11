import type { Keyframe, Layer, PathPoint, Project } from '@/editor/types'
import type { ImportedGradient, ImportedGradientStop } from '@/io/svg-gradients'
import { getExportArtboard, getExportLayers, getProjectFps } from '@/editor/artboard-utils'
import { DEFAULT_ARTBOARD, DEFAULT_CANVAS, PROJECT_VERSION, createArtboard } from '@/editor/types'
import { getAnimatedShape } from '@/editor/animation'
import { createId, createPathShape } from '@/editor/scene'
import { openFilePicker } from '@/io/file-picker'

function pathPointToLottieHandles(point: PathPoint): {
  inHandle: [number, number]
  outHandle: [number, number]
} {
  const inHandle: [number, number] = point.handleIn
    ? [point.handleIn.x - point.x, point.handleIn.y - point.y]
    : [0, 0]
  const outHandle: [number, number] = point.handleOut
    ? [point.handleOut.x - point.x, point.handleOut.y - point.y]
    : [0, 0]
  return { inHandle, outHandle }
}

function lottiePathToPoints(data: {
  v: number[][]
  i: number[][]
  o: number[][]
  c: boolean
}): { points: PathPoint[]; closed: boolean } {
  const points: PathPoint[] = data.v.map((vertex, index) => {
    const incoming = data.i[index] ?? [0, 0]
    const outgoing = data.o[index] ?? [0, 0]
    const point: PathPoint = {
      x: vertex[0] ?? 0,
      y: vertex[1] ?? 0,
    }

    if (incoming[0] !== 0 || incoming[1] !== 0) {
      point.handleIn = {
        x: point.x + incoming[0]!,
        y: point.y + incoming[1]!,
      }
    }

    if (outgoing[0] !== 0 || outgoing[1] !== 0) {
      point.handleOut = {
        x: point.x + outgoing[0]!,
        y: point.y + outgoing[1]!,
      }
    }

    return point
  })

  return { points, closed: data.c }
}

function resolveGradientFromFill(
  fill: string,
  importedGradients?: Record<string, ImportedGradient>,
): ImportedGradient | null {
  if (!importedGradients) {
    return null
  }

  const match = fill.match(/^url\(\s*#imported-grad-([^'")]+)\s*\)$/i)
  if (!match) {
    return null
  }

  return importedGradients[match[1]!] ?? null
}

function gradientToLottieFill(gradient: ImportedGradient) {
  const stops = gradient.stops
  const positions = stops.map((stop: ImportedGradientStop) => stop.offset)
  const colors = stops.map((stop: ImportedGradientStop) => hexToLottieColor(stop.color))

  if (gradient.kind === 'linear') {
    return {
      ty: 'gf',
      o: { a: 0, k: 100 },
      r: 1,
      bm: 0,
      g: {
        p: stops.length,
        k: {
          a: 0,
          k: {
            p: positions,
            k: colors,
          },
        },
      },
      s: { a: 0, k: [gradient.x1, gradient.y1] },
      e: { a: 0, k: [gradient.x2, gradient.y2] },
      t: 1,
    }
  }

  return {
    ty: 'gf',
    o: { a: 0, k: 100 },
    r: 1,
    bm: 0,
    g: {
      p: stops.length,
      k: {
        a: 0,
        k: {
          p: positions,
          k: colors,
        },
      },
    },
    s: { a: 0, k: [gradient.cx, gradient.cy] },
    e: { a: 0, k: [gradient.cx + gradient.r, gradient.cy] },
    t: 2,
  }
}

function buildFillItem(shape: Layer['shape'], importedGradients?: Record<string, ImportedGradient>) {
  const gradient = resolveGradientFromFill(shape.fill, importedGradients)
  if (gradient) {
    return {
      ...gradientToLottieFill(gradient),
      nm: 'Fill',
    }
  }

  return {
    ty: 'fl',
    nm: 'Fill',
    c: { a: 0, k: hexToLottieColor(shape.fill) },
    o: { a: 0, k: 100 },
    r: 1,
  }
}

function findLottieShapeItems(shapes: Array<{ ty?: string; it?: Array<Record<string, unknown>> }> | undefined) {
  for (const group of shapes ?? []) {
    if (group.ty !== 'gr' || !group.it) {
      continue
    }

    const shapeNode = group.it.find((item) =>
      ['rc', 'el', 'sh'].includes(String(item.ty)),
    )
    const fillNode = group.it.find((item) => item.ty === 'fl' || item.ty === 'gf')
    const strokeNode = group.it.find((item) => item.ty === 'st')

    if (shapeNode) {
      return { shapeNode, fillNode, strokeNode }
    }
  }

  return null
}

function lottieFillToHex(fillNode?: Record<string, unknown>): string {
  if (!fillNode) {
    return '#000000'
  }

  if (fillNode.ty === 'gf') {
    const gradient = fillNode.g as { k?: { k?: { k?: number[][] } } } | undefined
    const firstColor = gradient?.k?.k?.k?.[0]
    if (firstColor) {
      return lottieColorToHex(firstColor)
    }
  }

  const color = (fillNode.c as { k?: number[] } | undefined)?.k
  return lottieColorToHex(color ?? [0, 0, 0, 1])
}

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

function layerToLottieShape(
  layer: Layer,
  frameRate: number,
  layerIndex: number,
  importedGradients?: Record<string, ImportedGradient>,
) {
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
                  i: shape.points.map((point) => pathPointToLottieHandles(point).inHandle),
                  o: shape.points.map((point) => pathPointToLottieHandles(point).outHandle),
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
          buildFillItem(shape, importedGradients),
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
  const importedGradients = project.importedSvg?.gradients

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
      .map((layer, index) => layerToLottieShape(layer, frameRate, index, importedGradients)),
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

// Import for rect/ellipse/path shape layers with basic transform keyframes.
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
          r?: { k?: LottieAnimatedTrack }
        }
        shapes?: Array<{
          ty?: string
          it?: Array<Record<string, unknown>>
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
      const items = findLottieShapeItems(lottieLayer.shapes)
      if (!items) {
        continue
      }

      const { shapeNode, fillNode, strokeNode } = items
      const shapeType = String(shapeNode.ty)

      const positionTrack = asKeyframeTrack(lottieLayer.ks?.p?.k)
      const opacityTrack = asKeyframeTrack(lottieLayer.ks?.o?.k)
      const scaleTrack = asKeyframeTrack(lottieLayer.ks?.s?.k)
      const rotationTrack = asKeyframeTrack(lottieLayer.ks?.r?.k)

      const firstPosition = readStaticVector(lottieLayer.ks?.p?.k, [0, 0, 0])
      const fill = lottieFillToHex(fillNode)
      const stroke = lottieColorToHex((strokeNode?.c as { k?: number[] } | undefined)?.k ?? [0, 0, 0, 1])
      const strokeWidth = (strokeNode?.w as { k?: number } | undefined)?.k ?? 0
      const opacity = (readStaticVector(lottieLayer.ks?.o?.k, [100])[0] ?? 100) / 100
      const scale = (readStaticVector(lottieLayer.ks?.s?.k, [100, 100, 100])[0] ?? 100) / 100
      const rotation = readStaticVector(lottieLayer.ks?.r?.k, [0])[0] ?? 0

      const layerId = createId()
      const shapeId = createId()

      let base: Layer['shape']
      if (shapeType === 'sh') {
        const pathData = (shapeNode.ks as { k?: { v?: number[][]; i?: number[][]; o?: number[][]; c?: boolean } })
          ?.k
        if (!pathData?.v || pathData.v.length < 2) {
          continue
        }

        const { points, closed } = lottiePathToPoints({
          v: pathData.v,
          i: pathData.i ?? pathData.v.map(() => [0, 0]),
          o: pathData.o ?? pathData.v.map(() => [0, 0]),
          c: pathData.c ?? false,
        })
        base = {
          ...createPathShape(points, closed),
          id: shapeId,
          x: firstPosition[0] ?? 0,
          y: firstPosition[1] ?? 0,
          rotation,
          fill,
          stroke,
          strokeWidth,
          opacity,
          scale,
        }
      } else if (shapeType === 'el') {
        const rectWidth = (shapeNode.s as { k?: number[] } | undefined)?.k?.[0] ?? 100
        const rectHeight = (shapeNode.s as { k?: number[] } | undefined)?.k?.[1] ?? 100
        base = {
          id: shapeId,
          type: 'ellipse',
          x: firstPosition[0] ?? 0,
          y: firstPosition[1] ?? 0,
          rotation,
          rx: rectWidth / 2,
          ry: rectHeight / 2,
          fill,
          stroke,
          strokeWidth,
          opacity,
          scale,
        }
      } else {
        const rectWidth = (shapeNode.s as { k?: number[] } | undefined)?.k?.[0] ?? 100
        const rectHeight = (shapeNode.s as { k?: number[] } | undefined)?.k?.[1] ?? 100
        base = {
          id: shapeId,
          type: 'rect',
          x: (firstPosition[0] ?? 0) - rectWidth / 2,
          y: (firstPosition[1] ?? 0) - rectHeight / 2,
          rotation,
          width: rectWidth,
          height: rectHeight,
          fill,
          stroke,
          strokeWidth,
          opacity,
          scale,
        }
      }

      const keyframes: Keyframe[] = []
      const rectWidth =
        base.type === 'rect' ? base.width : base.type === 'ellipse' ? base.rx * 2 : 0
      const rectHeight =
        base.type === 'rect' ? base.height : base.type === 'ellipse' ? base.ry * 2 : 0

      for (const frame of positionTrack) {
        const x =
          base.type === 'path' || base.type === 'ellipse'
            ? frame.s[0]
            : frame.s[0] - rectWidth / 2
        const y =
          base.type === 'path' || base.type === 'ellipse'
            ? frame.s[1]
            : frame.s[1] - rectHeight / 2
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'x',
          value: x ?? 0,
          easing: 'linear',
        })
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'y',
          value: y ?? 0,
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
      for (const frame of rotationTrack) {
        keyframes.push({
          id: createId(),
          time: frame.t / frameRate,
          property: 'rotation',
          value: frame.s[0] ?? 0,
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

export async function readLottieFromFile(file: File): Promise<Project | null> {
  try {
    return importLottie(await file.text())
  } catch {
    return null
  }
}

export async function openLottieFile(): Promise<Project | null> {
  const picked = await openFilePicker({
    accept: 'application/json,.json',
    isAccepted: (file) =>
      file.name.toLowerCase().endsWith('.json') || file.type === 'application/json',
  })

  if (picked.status !== 'ok') {
    return null
  }

  try {
    return importLottie(picked.text)
  } catch {
    return null
  }
}
