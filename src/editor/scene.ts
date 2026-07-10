import type {
  EllipseShape,
  Layer,
  PathPoint,
  PathShape,
  Project,
  RectShape,
  Shape,
  ShapeType,
  TextShape,
} from '@/editor/types'
import { PROJECT_VERSION } from '@/editor/types'
import {
  BRAND,
  SHAPE_FILL_PRIMARY,
  SHAPE_FILL_SECONDARY,
  SHAPE_STROKE_PRIMARY,
  SHAPE_STROKE_SECONDARY,
  UI_PATH_STROKE,
} from '@/lib/brand-colors'

export function createId(): string {
  return crypto.randomUUID()
}

export function createDefaultProject(): Project {
  return {
    version: PROJECT_VERSION,
    artboard: {
      width: 800,
      height: 600,
    },
    duration: 3,
    loopIn: 0,
    loopOut: 3,
    layers: [],
    guides: [],
    states: [],
    markers: [],
  }
}

function baseShape(type: ShapeType): Shape {
  const id = createId()

  if (type === 'ellipse') {
    const shape: EllipseShape = {
      id,
      type: 'ellipse',
      x: 280,
      y: 180,
      rotation: 0,
      rx: 120,
      ry: 80,
      fill: SHAPE_FILL_PRIMARY,
      stroke: SHAPE_STROKE_PRIMARY,
      strokeWidth: 2,
      opacity: 1,
      scale: 1,
    }
    return shape
  }

  if (type === 'text') {
    const shape: TextShape = {
      id,
      type: 'text',
      x: 280,
      y: 280,
      rotation: 0,
      text: 'Hello',
      fontSize: 48,
      fontFamily: 'Geist, system-ui, sans-serif',
      fill: BRAND.fgDark,
      stroke: 'none',
      strokeWidth: 0,
      opacity: 1,
      scale: 1,
    }
    return shape
  }

  if (type === 'path') {
    const shape: PathShape = {
      id,
      type: 'path',
      x: 0,
      y: 0,
      rotation: 0,
      points: [],
      closed: false,
      fill: 'none',
      stroke: UI_PATH_STROKE,
      strokeWidth: 2,
      opacity: 1,
      scale: 1,
    }
    return shape
  }

  const shape: RectShape = {
    id,
    type: 'rect',
    x: 240,
    y: 160,
    rotation: 0,
    width: 200,
    height: 140,
    fill: SHAPE_FILL_SECONDARY,
    stroke: SHAPE_STROKE_SECONDARY,
    strokeWidth: 2,
    opacity: 1,
    scale: 1,
  }
  return shape
}

export function createLayerFromShape(shape: Shape, index: number, name?: string): Layer {
  return {
    id: createId(),
    name: name ?? getLayerName(shape.type, index),
    visible: true,
    locked: false,
    groupId: null,
    delay: 0,
    shape,
    keyframes: [],
  }
}

export function createRectShape(x: number, y: number, width: number, height: number): RectShape {
  return {
    id: createId(),
    type: 'rect',
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    rotation: 0,
    fill: SHAPE_FILL_SECONDARY,
    stroke: SHAPE_STROKE_SECONDARY,
    strokeWidth: 2,
    opacity: 1,
    scale: 1,
  }
}

export function createEllipseShape(
  x: number,
  y: number,
  width: number,
  height: number,
): EllipseShape {
  return {
    id: createId(),
    type: 'ellipse',
    x: x + width / 2,
    y: y + height / 2,
    rotation: 0,
    rx: Math.max(1, width / 2),
    ry: Math.max(1, height / 2),
    fill: SHAPE_FILL_PRIMARY,
    stroke: SHAPE_STROKE_PRIMARY,
    strokeWidth: 2,
    opacity: 1,
    scale: 1,
  }
}

export function createTextShape(x: number, y: number): TextShape {
  return {
    id: createId(),
    type: 'text',
    x,
    y,
    rotation: 0,
    text: 'Text',
    fontSize: 48,
    fontFamily: 'Geist, system-ui, sans-serif',
    fill: BRAND.fgDark,
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
    scale: 1,
  }
}

export function createPathShape(points: PathPoint[], closed = false): PathShape {
  return {
    id: createId(),
    type: 'path',
    x: 0,
    y: 0,
    rotation: 0,
    points,
    closed,
    fill: 'none',
    stroke: UI_PATH_STROKE,
    strokeWidth: 2,
    opacity: 1,
    scale: 1,
  }
}

export function createLayer(type: ShapeType, index: number): Layer {
  const shape = baseShape(type)

  return {
    id: createId(),
    name: getLayerName(type, index),
    visible: true,
    locked: false,
    groupId: null,
    delay: 0,
    shape,
    keyframes: [],
  }
}

export function cloneLayer(layer: Layer, offset = 20): Layer {
  const shape = layer.shape

  const clonedShape = (() => {
    if (shape.type === 'path') {
      return {
        ...shape,
        id: createId(),
        points: shape.points.map((point) => ({
          ...point,
          x: point.x + offset,
          y: point.y + offset,
          handleIn: point.handleIn
            ? { x: point.handleIn.x + offset, y: point.handleIn.y + offset }
            : point.handleIn,
          handleOut: point.handleOut
            ? { x: point.handleOut.x + offset, y: point.handleOut.y + offset }
            : point.handleOut,
        })),
      }
    }

    return {
      ...shape,
      id: createId(),
      x: shape.x + offset,
      y: shape.y + offset,
    } as Shape
  })()

  return {
    id: createId(),
    name: `${layer.name} copy`,
    visible: layer.visible,
    locked: layer.locked,
    groupId: layer.groupId,
    delay: layer.delay,
    shape: clonedShape,
    keyframes: layer.keyframes.map((keyframe) => ({
      ...keyframe,
      id: createId(),
    })),
  }
}

export function getLayerName(type: ShapeType, index: number): string {
  if (type === 'rect') {
    return `Rectangle ${index + 1}`
  }
  if (type === 'text') {
    return `Text ${index + 1}`
  }
  if (type === 'path') {
    return `Path ${index + 1}`
  }
  return `Ellipse ${index + 1}`
}
