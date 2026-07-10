export const PROJECT_VERSION = 1 as const

export type AnimatableProperty = 'x' | 'y' | 'opacity' | 'scale'

export type ShapeType = 'rect' | 'ellipse'

export type BaseShape = {
  id: string
  type: ShapeType
  x: number
  y: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  scale: number
}

export type RectShape = BaseShape & {
  type: 'rect'
  width: number
  height: number
}

export type EllipseShape = BaseShape & {
  type: 'ellipse'
  rx: number
  ry: number
}

export type Shape = RectShape | EllipseShape

export type Keyframe = {
  id: string
  time: number
  property: AnimatableProperty
  value: number
}

export type Layer = {
  id: string
  name: string
  visible: boolean
  shape: Shape
  keyframes: Keyframe[]
}

export type Project = {
  version: typeof PROJECT_VERSION
  artboard: {
    width: number
    height: number
  }
  duration: number
  layers: Layer[]
}

export type PlaybackState = 'idle' | 'playing' | 'paused'
