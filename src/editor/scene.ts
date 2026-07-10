import type {
  EllipseShape,
  Layer,
  Project,
  RectShape,
  Shape,
  ShapeType,
} from '@/editor/types'
import { PROJECT_VERSION } from '@/editor/types'

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
    layers: [],
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
      rx: 120,
      ry: 80,
      fill: '#6366f1',
      stroke: '#312e81',
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
    width: 200,
    height: 140,
    fill: '#22d3ee',
    stroke: '#155e75',
    strokeWidth: 2,
    opacity: 1,
    scale: 1,
  }
  return shape
}

export function createLayer(type: ShapeType, index: number): Layer {
  const shape = baseShape(type)

  return {
    id: createId(),
    name: `${type === 'rect' ? 'Rectangle' : 'Ellipse'} ${index + 1}`,
    visible: true,
    shape,
    keyframes: [],
  }
}

export function getLayerName(type: ShapeType, index: number): string {
  return `${type === 'rect' ? 'Rectangle' : 'Ellipse'} ${index + 1}`
}
