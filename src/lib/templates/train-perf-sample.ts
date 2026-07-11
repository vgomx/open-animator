import type { Keyframe, Layer } from '@/editor/types'
import { createArtboard } from '@/editor/types'
import { createId } from '@/editor/scene'
import { projectDefaults } from '@/lib/project-defaults'

const DURATION = 8
const TRAIN_TRAVEL = 720

const COLORS = {
  sky: '#8ecae6',
  sun: '#ffb703',
  hillFar: '#90be6d',
  hillMid: '#588157',
  hillNear: '#3a5a40',
  ground: '#dad7cd',
  track: '#495057',
  tie: '#6c757d',
  trainRed: '#d62828',
  trainDark: '#6a040f',
  trainWindow: '#caf0f8',
  wheel: '#212529',
  wheelHub: '#adb5bd',
  smoke: '#dee2e6',
} as const

type RectSpec = {
  name: string
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke?: string
  keyframes?: Keyframe[]
}

type EllipseSpec = {
  name: string
  x: number
  y: number
  rx: number
  ry: number
  fill: string
  stroke?: string
  keyframes?: Keyframe[]
  opacity?: number
}

function slideX(from: number, to: number, easing: Keyframe['easing'] = 'linear'): Keyframe[] {
  return [
    { id: createId(), time: 0, property: 'x', value: from, easing },
    { id: createId(), time: DURATION, property: 'x', value: to, easing },
  ]
}

function partMotion(startX: number): Keyframe[] {
  return slideX(startX, startX + TRAIN_TRAVEL)
}

function spin(revolutions = 2): Keyframe[] {
  return [
    { id: createId(), time: 0, property: 'rotation', value: 0, easing: 'linear' },
    { id: createId(), time: DURATION, property: 'rotation', value: 360 * revolutions, easing: 'linear' },
  ]
}

function smokeKeyframes(baseY: number): Keyframe[] {
  return [
    { id: createId(), time: 0, property: 'y', value: baseY, easing: 'easeOut' },
    { id: createId(), time: DURATION, property: 'y', value: baseY - 120, easing: 'easeOut' },
    { id: createId(), time: 0, property: 'opacity', value: 0.75, easing: 'linear' },
    { id: createId(), time: DURATION, property: 'opacity', value: 0, easing: 'linear' },
    { id: createId(), time: 0, property: 'scale', value: 0.6, easing: 'easeOut' },
    { id: createId(), time: DURATION, property: 'scale', value: 1.4, easing: 'easeOut' },
  ]
}

type LayerDraft = Omit<Layer, 'artboardId' | 'groupId' | 'delay'>

function rectLayer(spec: RectSpec): LayerDraft {
  return {
    id: createId(),
    name: spec.name,
    visible: true,
    locked: false,
    shape: {
      id: createId(),
      type: 'rect',
      x: spec.x,
      y: spec.y,
      rotation: 0,
      width: spec.width,
      height: spec.height,
      fill: spec.fill,
      stroke: spec.stroke ?? 'none',
      strokeWidth: spec.stroke ? 2 : 0,
      opacity: 1,
      scale: 1,
    },
    keyframes: spec.keyframes ?? [],
  }
}

function ellipseLayer(spec: EllipseSpec): LayerDraft {
  return {
    id: createId(),
    name: spec.name,
    visible: true,
    locked: false,
    shape: {
      id: createId(),
      type: 'ellipse',
      x: spec.x,
      y: spec.y,
      rotation: 0,
      rx: spec.rx,
      ry: spec.ry,
      fill: spec.fill,
      stroke: spec.stroke ?? 'none',
      strokeWidth: spec.stroke ? 2 : 0,
      opacity: spec.opacity ?? 1,
      scale: 1,
    },
    keyframes: spec.keyframes ?? [],
  }
}

function wheelLayers(prefix: string, centers: Array<{ x: number; y: number }>): LayerDraft[] {
  return centers.flatMap(({ x, y }, index) => [
    ellipseLayer({
      name: `${prefix} wheel ${index + 1}`,
      x,
      y,
      rx: 28,
      ry: 28,
      fill: COLORS.wheel,
      keyframes: [...partMotion(x), ...spin(3)],
    }),
    ellipseLayer({
      name: `${prefix} hub ${index + 1}`,
      x,
      y,
      rx: 10,
      ry: 10,
      fill: COLORS.wheelHub,
      keyframes: [...partMotion(x), ...spin(3)],
    }),
  ])
}

export function trainPerfSampleProject() {
  const artboard = createArtboard({ name: 'Train scene', width: 1080, height: 1080 })
  const locomotiveBodyX = 120
  const locomotiveCabX = 250
  const locomotiveNoseX = 90
  const chimneyX = 200

  const layers = [
    rectLayer({
      name: 'Sky',
      x: 0,
      y: 0,
      width: 1080,
      height: 1080,
      fill: COLORS.sky,
    }),
    ellipseLayer({
      name: 'Sun',
      x: 860,
      y: 120,
      rx: 56,
      ry: 56,
      fill: COLORS.sun,
      keyframes: slideX(860, 842, 'linear'),
    }),
    rectLayer({
      name: 'Hill far 1',
      x: -40,
      y: 520,
      width: 520,
      height: 180,
      fill: COLORS.hillFar,
      keyframes: slideX(-40, -120),
    }),
    rectLayer({
      name: 'Hill far 2',
      x: 360,
      y: 500,
      width: 620,
      height: 210,
      fill: COLORS.hillFar,
      keyframes: slideX(360, 240),
    }),
    rectLayer({
      name: 'Hill far 3',
      x: 820,
      y: 540,
      width: 420,
      height: 160,
      fill: COLORS.hillFar,
      keyframes: slideX(820, 700),
    }),
    rectLayer({
      name: 'Hill mid 1',
      x: -80,
      y: 610,
      width: 460,
      height: 170,
      fill: COLORS.hillMid,
      keyframes: slideX(-80, -220),
    }),
    rectLayer({
      name: 'Hill mid 2',
      x: 300,
      y: 590,
      width: 560,
      height: 210,
      fill: COLORS.hillMid,
      keyframes: slideX(300, 80),
    }),
    rectLayer({
      name: 'Hill near 1',
      x: -120,
      y: 690,
      width: 520,
      height: 220,
      fill: COLORS.hillNear,
      keyframes: slideX(-120, -320),
    }),
    rectLayer({
      name: 'Hill near 2',
      x: 360,
      y: 710,
      width: 860,
      height: 240,
      fill: COLORS.hillNear,
      keyframes: slideX(360, 40),
    }),
    rectLayer({
      name: 'Ground',
      x: 0,
      y: 820,
      width: 1080,
      height: 260,
      fill: COLORS.ground,
    }),
    rectLayer({
      name: 'Track bed',
      x: 0,
      y: 860,
      width: 1080,
      height: 36,
      fill: COLORS.tie,
    }),
    ...Array.from({ length: 18 }, (_, index) => {
      const tieX = index * 64 - 32
      return rectLayer({
        name: `Tie ${index + 1}`,
        x: tieX,
        y: 852,
        width: 24,
        height: 48,
        fill: COLORS.tie,
        keyframes: slideX(tieX, tieX - 640),
      })
    }),
    rectLayer({
      name: 'Rail top',
      x: 0,
      y: 848,
      width: 1080,
      height: 6,
      fill: COLORS.track,
    }),
    rectLayer({
      name: 'Rail bottom',
      x: 0,
      y: 878,
      width: 1080,
      height: 6,
      fill: COLORS.track,
    }),
    rectLayer({
      name: 'Locomotive body',
      x: locomotiveBodyX,
      y: 730,
      width: 220,
      height: 90,
      fill: COLORS.trainRed,
      stroke: COLORS.trainDark,
      keyframes: partMotion(locomotiveBodyX),
    }),
    rectLayer({
      name: 'Locomotive cab',
      x: locomotiveCabX,
      y: 690,
      width: 90,
      height: 70,
      fill: COLORS.trainDark,
      keyframes: partMotion(locomotiveCabX),
    }),
    rectLayer({
      name: 'Locomotive nose',
      x: locomotiveNoseX,
      y: 760,
      width: 70,
      height: 50,
      fill: COLORS.trainDark,
      keyframes: partMotion(locomotiveNoseX),
    }),
    rectLayer({
      name: 'Chimney',
      x: chimneyX,
      y: 650,
      width: 36,
      height: 70,
      fill: COLORS.trainDark,
      keyframes: partMotion(chimneyX),
    }),
    ...wheelLayers('Locomotive', [
      { x: locomotiveBodyX + 40, y: 840 },
      { x: locomotiveBodyX + 140, y: 840 },
    ]),
    ...Array.from({ length: 3 }, (_, carIndex) => {
      const carX = 360 + carIndex * 180

      return [
        rectLayer({
          name: `Car ${carIndex + 1} body`,
          x: carX,
          y: 745,
          width: 150,
          height: 75,
          fill: COLORS.trainRed,
          stroke: COLORS.trainDark,
          keyframes: partMotion(carX),
        }),
        rectLayer({
          name: `Car ${carIndex + 1} roof`,
          x: carX + 10,
          y: 720,
          width: 130,
          height: 24,
          fill: COLORS.trainDark,
          keyframes: partMotion(carX + 10),
        }),
        ...Array.from({ length: 3 }, (_, windowIndex) => {
          const windowX = carX + 18 + windowIndex * 42
          return rectLayer({
            name: `Car ${carIndex + 1} window ${windowIndex + 1}`,
            x: windowX,
            y: 760,
            width: 28,
            height: 34,
            fill: COLORS.trainWindow,
            keyframes: partMotion(windowX),
          })
        }),
        ...wheelLayers(`Car ${carIndex + 1}`, [
          { x: carX + 36, y: 840 },
          { x: carX + 114, y: 840 },
        ]),
      ]
    }).flat(),
    ...Array.from({ length: 6 }, (_, index) => {
      const smokeX = chimneyX + 18 + index * 8
      const smokeY = 620 - index * 16
      return ellipseLayer({
        name: `Smoke ${index + 1}`,
        x: smokeX,
        y: smokeY,
        rx: 18 + index * 4,
        ry: 18 + index * 4,
        fill: COLORS.smoke,
        opacity: 0.7,
        keyframes: [...partMotion(smokeX), ...smokeKeyframes(smokeY)],
      })
    }),
  ].map((layer) => ({
    ...layer,
    artboardId: artboard.id,
    groupId: null,
    delay: 0,
  }))

  return projectDefaults({
    duration: DURATION,
    loopOut: DURATION,
    artboards: [artboard],
    layers,
  })
}

export const TRAIN_PERF_SAMPLE_LAYER_COUNT = 72
export const TRAIN_PERF_SAMPLE_ANIMATED_LAYER_COUNT = 67
