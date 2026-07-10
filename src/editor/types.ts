export const PROJECT_VERSION = 3 as const

export type NumericAnimatableProperty = 'x' | 'y' | 'opacity' | 'scale' | 'rotation'
export type ColorAnimatableProperty = 'fill' | 'stroke'
export type AnimatableProperty = NumericAnimatableProperty | ColorAnimatableProperty

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'

export type ShapeType = 'rect' | 'ellipse'

export type BaseShape = {
  id: string
  type: ShapeType
  x: number
  y: number
  rotation: number
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
  value: number | string
  easing?: EasingType
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

export const NUMERIC_ANIMATABLE_PROPERTIES: NumericAnimatableProperty[] = [
  'x',
  'y',
  'opacity',
  'scale',
  'rotation',
]

export const COLOR_ANIMATABLE_PROPERTIES: ColorAnimatableProperty[] = ['fill', 'stroke']

export const ANIMATABLE_PROPERTIES: AnimatableProperty[] = [
  ...NUMERIC_ANIMATABLE_PROPERTIES,
  ...COLOR_ANIMATABLE_PROPERTIES,
]

export const EASING_OPTIONS: Array<{ value: EasingType; label: string }> = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease in' },
  { value: 'easeOut', label: 'Ease out' },
  { value: 'easeInOut', label: 'Ease in-out' },
]

export function isColorProperty(property: AnimatableProperty): property is ColorAnimatableProperty {
  return property === 'fill' || property === 'stroke'
}

export function isNumericProperty(
  property: AnimatableProperty,
): property is NumericAnimatableProperty {
  return !isColorProperty(property)
}
