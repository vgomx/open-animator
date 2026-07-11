import { BRAND, UI_PATH_STROKE } from '@/lib/brand-colors'

export const PROJECT_VERSION = 9 as const

export type CanvasSettings = {
  backgroundColor: string
}

export const DEFAULT_CANVAS: CanvasSettings = {
  backgroundColor: BRAND.canvasLight,
}

export type Artboard = {
  name: string
  width: number
  height: number
  backgroundColor: string
}

export const DEFAULT_ARTBOARD: Artboard = {
  name: 'Artboard',
  width: 800,
  height: 600,
  backgroundColor: '#fdfcf9',
}

export function createArtboard(
  partial: Partial<Artboard> & Pick<Artboard, 'width' | 'height'>,
): Artboard {
  return { ...DEFAULT_ARTBOARD, ...partial }
}

export type GuideAxis = 'x' | 'y'

export type Guide = {
  id: string
  axis: GuideAxis
  position: number
}

export type SnapLine = {
  axis: GuideAxis
  position: number
}

export type NumericAnimatableProperty =
  | 'x'
  | 'y'
  | 'opacity'
  | 'scale'
  | 'rotation'
  | 'width'
  | 'height'
  | 'rx'
  | 'ry'
  | 'fontSize'

export type ColorAnimatableProperty = 'fill' | 'stroke'
export type AnimatableProperty = NumericAnimatableProperty | ColorAnimatableProperty

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'spring'
  | 'bounce'
  | 'elastic'
  | 'back'
  | 'hold'
  | 'custom'

/** CSS cubic-bezier control points: x1, y1, x2, y2 */
export type BezierHandle = [number, number, number, number]

export type OnionSkinSettings = {
  framesBefore: number
  framesAfter: number
  opacityBefore: number
  opacityAfter: number
  tintBefore: string
  tintAfter: string
}

export const DEFAULT_ONION_SKIN_SETTINGS: OnionSkinSettings = {
  framesBefore: 1,
  framesAfter: 1,
  opacityBefore: 0.28,
  opacityAfter: 0.18,
  tintBefore: BRAND.accent,
  tintAfter: UI_PATH_STROKE,
}

export type ShapeType = 'rect' | 'ellipse' | 'text' | 'path'

export type PathPoint = {
  x: number
  y: number
  handleIn?: { x: number; y: number } | null
  handleOut?: { x: number; y: number } | null
}

export type PathShape = BaseShape & {
  type: 'path'
  points: PathPoint[]
  closed: boolean
}

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

export type TextShape = BaseShape & {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
}

export type Shape = RectShape | EllipseShape | TextShape | PathShape

export type Keyframe = {
  id: string
  time: number
  property: AnimatableProperty
  value: number | string
  easing?: EasingType
  bezier?: BezierHandle
}

export type Layer = {
  id: string
  name: string
  visible: boolean
  locked: boolean
  groupId: string | null
  delay: number
  shape: Shape
  keyframes: Keyframe[]
}

export type Marker = {
  id: string
  name: string
  time: number
  color?: string
}

export type LayerStateSnapshot = {
  layerId: string
  layerName: string
  shapeType: ShapeType
  visible: boolean
  x: number
  y: number
  rotation: number
  opacity: number
  scale: number
  fill: string
  stroke: string
  strokeWidth: number
  width?: number
  height?: number
  rx?: number
  ry?: number
  text?: string
  fontSize?: number
  fontFamily?: string
}

export type AnimationState = {
  id: string
  name: string
  time: number
  snapshots: LayerStateSnapshot[]
}

export type Project = {
  version: typeof PROJECT_VERSION
  canvas: CanvasSettings
  artboard: Artboard
  duration: number
  loopIn: number
  loopOut: number
  layers: Layer[]
  guides: Guide[]
  states: AnimationState[]
  markers: Marker[]
}

export type PlaybackState = 'idle' | 'playing' | 'paused'

export const NUMERIC_ANIMATABLE_PROPERTIES: NumericAnimatableProperty[] = [
  'x',
  'y',
  'opacity',
  'scale',
  'rotation',
  'width',
  'height',
  'rx',
  'ry',
  'fontSize',
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
  { value: 'spring', label: 'Spring' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'elastic', label: 'Elastic' },
  { value: 'back', label: 'Back' },
  { value: 'hold', label: 'Hold (step)' },
  { value: 'custom', label: 'Custom bezier' },
]

export function isColorProperty(property: AnimatableProperty): property is ColorAnimatableProperty {
  return property === 'fill' || property === 'stroke'
}

export function isNumericProperty(
  property: AnimatableProperty,
): property is NumericAnimatableProperty {
  return !isColorProperty(property)
}

export function isTextShape(shape: Shape): shape is TextShape {
  return shape.type === 'text'
}
