import { createId } from '@/editor/scene'
import { getShapeBounds } from '@/editor/bounds'
import type { AnimatableProperty, Keyframe, Layer, Shape } from '@/editor/types'
import {
  applyMatrixToPoint,
  IDENTITY_MATRIX,
  multiplyMatrix,
  type AffineMatrix,
} from '@/io/svg-transform'
import { yieldToUi } from '@/lib/yield-to-ui'

function roundCoord(value: number): number {
  return Math.round(value * 10) / 10
}

export function shapeMatchKey(shape: Shape): string {
  const parts = [
    shape.type,
    String(roundCoord(shape.x)),
    String(roundCoord(shape.y)),
    shape.fill,
    shape.stroke,
    String(roundCoord(shape.strokeWidth)),
    String(roundCoord(shape.opacity)),
  ]

  if (shape.type === 'rect') {
    parts.push(String(roundCoord(shape.width)), String(roundCoord(shape.height)))
  }

  if (shape.type === 'ellipse') {
    parts.push(String(roundCoord(shape.rx)), String(roundCoord(shape.ry)))
  }

  if (shape.type === 'path' && shape.points.length > 0) {
    parts.push(String(shape.points.length))
    parts.push(String(roundCoord(shape.points[0]!.x)), String(roundCoord(shape.points[0]!.y)))
    const last = shape.points[shape.points.length - 1]!
    parts.push(String(roundCoord(last.x)), String(roundCoord(last.y)))
  }

  return parts.join('|')
}

export function mergeAnimatedKeyframesIntoStaticLayers(
  staticLayers: Layer[],
  animatedLayers: Layer[],
): Layer[] {
  const animatedByKey = new Map<string, Layer[]>()

  for (const layer of animatedLayers) {
    if (layer.keyframes.length === 0) {
      continue
    }

    const key = shapeMatchKey(layer.shape)
    const bucket = animatedByKey.get(key) ?? []
    bucket.push(layer)
    animatedByKey.set(key, bucket)
  }

  const usedAnimated = new Set<Layer>()

  return staticLayers.map((staticLayer) => {
    const candidates = animatedByKey.get(shapeMatchKey(staticLayer.shape))
    if (!candidates || candidates.length === 0) {
      return staticLayer
    }

    const match = candidates.find((candidate) => !usedAnimated.has(candidate)) ?? candidates[0]!
    usedAnimated.add(match)

    return {
      ...staticLayer,
      keyframes: match.keyframes,
    }
  })
}

export type CssKeyframeStep = {
  percent: number
  transform?: string
  opacity?: number
  fill?: string
  stroke?: string
}

export type CssAnimationTrack = {
  duration: number
  steps: CssKeyframeStep[]
}

const SHAPE_TAGS = new Set([
  'rect',
  'circle',
  'ellipse',
  'path',
  'text',
  'line',
  'polyline',
  'polygon',
])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractKeyframesBlocks(css: string): Array<{ name: string; body: string }> {
  const blocks: Array<{ name: string; body: string }> = []
  const startPattern = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{/g
  let match: RegExpExecArray | null

  while ((match = startPattern.exec(css)) !== null) {
    const name = match[1]!
    let depth = 1
    let index = startPattern.lastIndex
    let body = ''

    while (index < css.length && depth > 0) {
      const char = css[index]!
      if (char === '{') {
        depth += 1
      } else if (char === '}') {
        depth -= 1
      }

      if (depth > 0) {
        body += char
      }

      index += 1
    }

    blocks.push({ name, body })
  }

  return blocks
}

function selectorToPercent(selector: string): number | null {
  const trimmed = selector.trim()
  if (trimmed === 'from') {
    return 0
  }
  if (trimmed === 'to') {
    return 100
  }

  const percentMatch = trimmed.match(/^([0-9.]+)%$/)
  if (percentMatch) {
    const percent = Number.parseFloat(percentMatch[1]!)
    return Number.isFinite(percent) ? percent : null
  }

  return null
}

function parseStepDeclarations(declarations: string): Omit<CssKeyframeStep, 'percent'> {
  const step: Omit<CssKeyframeStep, 'percent'> = {}

  const transform = declarations.match(/transform:\s*([^;]+)/)?.[1]?.trim()
  if (transform) {
    step.transform = transform
  }

  const opacity = declarations.match(/opacity:\s*([^;]+)/)?.[1]?.trim()
  if (opacity) {
    step.opacity = Number.parseFloat(opacity)
  }

  const fill = declarations.match(/fill:\s*([^;]+)/)?.[1]?.trim()
  if (fill) {
    step.fill = fill
  }

  const stroke = declarations.match(/stroke:\s*([^;]+)/)?.[1]?.trim()
  if (stroke) {
    step.stroke = stroke
  }

  return step
}

function parseKeyframeSteps(body: string): CssKeyframeStep[] {
  const steps: CssKeyframeStep[] = []
  const stepPattern =
    /((?:from|to|[0-9.]+%(?:\s*,\s*(?:from|to|[0-9.]+%))*))\s*\{([^}]+)\}/g
  let stepMatch: RegExpExecArray | null

  while ((stepMatch = stepPattern.exec(body)) !== null) {
    const selectors = stepMatch[1]!.split(',').map((value) => value.trim())
    const declarations = stepMatch[2]!
    const parsed = parseStepDeclarations(declarations)

    for (const selector of selectors) {
      const percent = selectorToPercent(selector)
      if (percent === null || !Number.isFinite(percent)) {
        continue
      }

      steps.push({ percent, ...parsed })
    }
  }

  steps.sort((a, b) => a.percent - b.percent)
  return steps
}

export function parseCssVariables(css: string): Map<string, string> {
  const variables = new Map<string, string>()
  const blockPattern = /[^{}]+\{([^}]*--[\w-]+:[^}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = blockPattern.exec(css)) !== null) {
    const body = match[1]!
    const varPattern = /(--[\w-]+)\s*:\s*([^;]+)/g
    let varMatch: RegExpExecArray | null

    while ((varMatch = varPattern.exec(body)) !== null) {
      variables.set(varMatch[1]!, varMatch[2]!.trim())
    }
  }

  return variables
}

export function resolveCssVar(value: string, variables: Map<string, string>): string {
  return value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (full, name: string) => {
    return variables.get(name) ?? full
  })
}

function parseDurationSeconds(value: string): number | null {
  const trimmed = value.trim()
  const secondsMatch = trimmed.match(/^([0-9.]+)s$/)
  if (secondsMatch) {
    const duration = Number.parseFloat(secondsMatch[1]!)
    return Number.isFinite(duration) && duration > 0 ? duration : null
  }

  const msMatch = trimmed.match(/^([0-9.]+)ms$/)
  if (msMatch) {
    const duration = Number.parseFloat(msMatch[1]!) / 1000
    return Number.isFinite(duration) && duration > 0 ? duration : null
  }

  return null
}

export function parseAnimationClassMap(
  css: string,
  _variables: Map<string, string>,
): Map<string, string> {
  const map = new Map<string, string>()
  const classPattern = /\.([a-zA-Z_][\w-]*)\s*\{([^}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = classPattern.exec(css)) !== null) {
    const className = match[1]!
    const body = match[2]!
    const animationDecl = body.match(/animation:\s*([^;]+)/)?.[1]?.trim()
    if (!animationDecl) {
      continue
    }

    const parts = animationDecl.split(/\s+/).filter(Boolean)
    const animationName = parts[0]
    if (!animationName) {
      continue
    }

    map.set(animationName, className)
  }

  return map
}

function resolveTrackDuration(
  css: string,
  animationName: string,
  className: string | undefined,
  variables: Map<string, string>,
): number {
  const candidates: string[] = []

  if (className) {
    const escapedClass = escapeRegExp(className)
    candidates.push(`\\.${escapedClass}\\s*\\{[^}]*animation:\\s*([^;]+)`)
  }

  const escapedName = escapeRegExp(animationName)
  candidates.push(`animation:\\s*${escapedName}\\s+([^;\\s]+)`)

  for (const pattern of candidates) {
    const match = css.match(new RegExp(pattern))
    const animationDecl = match?.[1]?.trim()
    if (!animationDecl) {
      continue
    }

    const parts = animationDecl.split(/\s+/).filter(Boolean)
    const durationToken = parts.find((part, index) => index > 0 && part !== 'linear' && part !== 'infinite')
    if (!durationToken) {
      continue
    }

    const resolved = resolveCssVar(durationToken, variables)
    const duration = parseDurationSeconds(resolved)
    if (duration !== null) {
      return duration
    }
  }

  return 3
}

export function parseCssKeyframeTracks(css: string): Map<string, CssAnimationTrack> {
  const variables = parseCssVariables(css)
  const classMap = parseAnimationClassMap(css, variables)
  const tracks = new Map<string, CssAnimationTrack>()

  for (const block of extractKeyframesBlocks(css)) {
    const steps = parseKeyframeSteps(block.body)
    if (steps.length === 0) {
      continue
    }

    const className = classMap.get(block.name)
    tracks.set(block.name, {
      duration: resolveTrackDuration(css, block.name, className, variables),
      steps,
    })
  }

  return tracks
}

export function applyCssTransformToShape(shape: Shape, transformCss: string): Shape {
  const rotationMatch = transformCss.match(/rotate\(([-0-9.]+)deg\)/)
  const scaleMatch = transformCss.match(/scale\(([-0-9.]+)(?:,\s*([-0-9.]+))?\)/)
  const translateXMatch = transformCss.match(/translateX\(([-0-9.]+)px\)/)
  const translateYMatch = transformCss.match(/translateY\(([-0-9.]+)px\)/)
  const translates = [
    ...transformCss.matchAll(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/g),
  ]

  const rotation = rotationMatch ? Number.parseFloat(rotationMatch[1]!) : shape.rotation
  const scaleX = scaleMatch ? Number.parseFloat(scaleMatch[1]!) : shape.scaleX
  const scaleY = scaleMatch
    ? Number.parseFloat(scaleMatch[2] ?? scaleMatch[1]!)
    : shape.scaleY

  if (translates.length >= 1) {
    if (shape.type === 'rect' && translates.length >= 2) {
      const centerX = Number.parseFloat(translates[0]![1]!)
      const centerY = Number.parseFloat(translates[0]![2]!)
      return {
        ...shape,
        x: centerX - shape.width / 2,
        y: centerY - shape.height / 2,
        rotation,
        scaleX,
        scaleY,
      }
    }

    return {
      ...shape,
      x: Number.parseFloat(translates[0]![1]!),
      y: Number.parseFloat(translates[0]![2]!),
      rotation,
      scaleX,
      scaleY,
    }
  }

  let x = shape.x
  let y = shape.y

  if (translateXMatch) {
    x = shape.x + Number.parseFloat(translateXMatch[1]!)
  }

  if (translateYMatch) {
    y = shape.y + Number.parseFloat(translateYMatch[1]!)
  }

  return {
    ...shape,
    x,
    y,
    rotation,
    scaleX,
    scaleY,
  }
}

function addKeyframe(
  keyframes: Keyframe[],
  time: number,
  property: AnimatableProperty,
  value: number | string,
) {
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

export function collectShapeElements(element: Element): Element[] {
  const tag = element.tagName.toLowerCase()
  if (SHAPE_TAGS.has(tag)) {
    return [element]
  }

  const shapes: Element[] = []
  const walk = (node: Element) => {
    const nodeTag = node.tagName.toLowerCase()
    if (SHAPE_TAGS.has(nodeTag)) {
      shapes.push(node)
      return
    }

    for (const child of node.children) {
      walk(child)
    }
  }

  walk(element)
  return shapes
}

export function parseClassToAnimationMap(css: string): Map<string, string> {
  const variables = parseCssVariables(css)
  const animationToClass = parseAnimationClassMap(css, variables)
  const classToAnimation = new Map<string, string>()

  for (const [animationName, className] of animationToClass) {
    classToAnimation.set(className, animationName)
  }

  return classToAnimation
}

export function getApplicableTracksForShape(
  shapeElement: Element,
  css: string,
): CssAnimationTrack[] {
  return getAnimatedAncestorChain(shapeElement, css).map((entry) => entry.track)
}

type AnimatedAncestor = {
  element: Element
  track: CssAnimationTrack
  className: string
}

function getElementClassNames(element: Element): string[] {
  if (element.classList && element.classList.length > 0) {
    return [...element.classList]
  }

  const classAttribute = element.getAttribute('class')
  if (classAttribute) {
    return classAttribute.split(/\s+/).filter(Boolean)
  }

  const className = (element as SVGElement).className
  if (className && typeof className === 'object' && 'baseVal' in className) {
    return className.baseVal.split(/\s+/).filter(Boolean)
  }

  if (typeof className === 'string' && className.length > 0) {
    return className.split(/\s+/).filter(Boolean)
  }

  return []
}

function elementHasAnimationClass(element: Element, classToAnimation: Map<string, string>): boolean {
  return getElementClassNames(element).some((className) => classToAnimation.has(className))
}

function getAnimatedAncestorChain(shapeElement: Element, css: string): AnimatedAncestor[] {
  const classToAnimation = parseClassToAnimationMap(css)
  const tracks = parseCssKeyframeTracks(css)
  const chain: AnimatedAncestor[] = []

  let current: Element | null = shapeElement
  while (current) {
    const tag = current.tagName.toLowerCase()
    if (tag === 'html' || tag === 'body' || tag === 'div') {
      break
    }

    const classes = getElementClassNames(current)
    for (const className of classes) {
      const animationName = classToAnimation.get(className)
      if (!animationName) {
        continue
      }

      const track = tracks.get(animationName)
      if (track) {
        chain.push({ element: current, track, className })
      }
    }

    if (tag === 'svg') {
      break
    }

    current = current.parentElement
  }

  return chain.reverse()
}

function collectShapesUntilNestedAnimation(
  root: Element,
  classToAnimation: Map<string, string>,
): Element[] {
  const tag = root.tagName.toLowerCase()
  if (SHAPE_TAGS.has(tag)) {
    return [root]
  }

  const shapes: Element[] = []
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (child !== root && elementHasAnimationClass(child, classToAnimation)) {
        continue
      }

      const childTag = child.tagName.toLowerCase()
      if (SHAPE_TAGS.has(childTag)) {
        shapes.push(child)
      } else {
        walk(child)
      }
    }
  }

  walk(root)
  return shapes
}

function getShapeCenter(shape: Shape): { x: number; y: number } {
  const bounds = getShapeBounds(shape)
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }
}

function getBoundsForElements(
  elements: Element[],
  parseShape: (element: Element) => Shape | null,
): { x: number; y: number; width: number; height: number } {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const element of elements) {
    const shape = parseShape(element)
    if (!shape) {
      continue
    }

    const bounds = getShapeBounds(shape)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  }

  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function parseTransformOriginForClass(css: string, className: string): string | undefined {
  const escaped = escapeRegExp(className)
  const match = css.match(new RegExp(`\\.${escaped}\\s*\\{[^}]*transform-origin:\\s*([^;\\}]+)`))
  return match?.[1]?.trim()
}

function resolveTransformOrigin(
  originValue: string | undefined,
  bounds: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  const normalized = (originValue ?? 'center').trim().toLowerCase()

  if (normalized.includes('bottom')) {
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }
  }

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

type TransformComponents = {
  translateX: number
  translateY: number
  rotate: number
  scaleX: number
  scaleY: number
}

function parseTransformComponents(transform: string): TransformComponents {
  const translateXMatch = transform.match(/translateX\(([-0-9.]+)px\)/)
  const translateYMatch = transform.match(/translateY\(([-0-9.]+)px\)/)
  const translateMatch = transform.match(/translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/)
  const rotateMatch = transform.match(/rotate\(([-0-9.]+)deg\)/)
  const scaleMatch = transform.match(/scale\(([-0-9.]+)(?:,\s*([-0-9.]+))?\)/)

  return {
    translateX: translateXMatch
      ? Number.parseFloat(translateXMatch[1]!)
      : translateMatch
        ? Number.parseFloat(translateMatch[1]!)
        : 0,
    translateY: translateYMatch
      ? Number.parseFloat(translateYMatch[1]!)
      : translateMatch
        ? Number.parseFloat(translateMatch[2]!)
        : 0,
    rotate: rotateMatch ? Number.parseFloat(rotateMatch[1]!) : 0,
    scaleX: scaleMatch ? Number.parseFloat(scaleMatch[1]!) : 1,
    scaleY: scaleMatch
      ? Number.parseFloat(scaleMatch[2] ?? scaleMatch[1]!)
      : 1,
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function cssStepToMatrix(step: CssKeyframeStep, originX: number, originY: number): AffineMatrix {
  const components = parseTransformComponents(step.transform ?? '')
  let matrix = IDENTITY_MATRIX

  if (components.translateX !== 0 || components.translateY !== 0) {
    matrix = multiplyMatrix(matrix, {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: components.translateX,
      f: components.translateY,
    })
  }

  if (components.rotate !== 0) {
    const angle = (components.rotate * Math.PI) / 180
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const rotate = { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }
    const toOrigin = { a: 1, b: 0, c: 0, d: 1, e: -originX, f: -originY }
    const back = { a: 1, b: 0, c: 0, d: 1, e: originX, f: originY }
    matrix = multiplyMatrix(matrix, multiplyMatrix(back, multiplyMatrix(rotate, toOrigin)))
  }

  if (components.scaleX !== 1 || components.scaleY !== 1) {
    const toOrigin = { a: 1, b: 0, c: 0, d: 1, e: -originX, f: -originY }
    const scale = {
      a: components.scaleX,
      b: 0,
      c: 0,
      d: components.scaleY,
      e: 0,
      f: 0,
    }
    const back = { a: 1, b: 0, c: 0, d: 1, e: originX, f: originY }
    matrix = multiplyMatrix(matrix, multiplyMatrix(back, multiplyMatrix(scale, toOrigin)))
  }

  return matrix
}

function formatTransformComponents(components: TransformComponents): string {
  const parts: string[] = []

  if (components.translateX !== 0) {
    parts.push(`translateX(${components.translateX}px)`)
  }

  if (components.translateY !== 0) {
    parts.push(`translateY(${components.translateY}px)`)
  }

  if (components.rotate !== 0) {
    parts.push(`rotate(${components.rotate}deg)`)
  }

  if (components.scaleX !== 1 || components.scaleY !== 1) {
    parts.push(`scale(${components.scaleX}, ${components.scaleY})`)
  }

  return parts.join(' ')
}

function interpolateTransformCss(from: string | undefined, to: string | undefined, t: number): string {
  const start = parseTransformComponents(from ?? '')
  const end = parseTransformComponents(to ?? '')

  return formatTransformComponents({
    translateX: lerp(start.translateX, end.translateX, t),
    translateY: lerp(start.translateY, end.translateY, t),
    rotate: lerp(start.rotate, end.rotate, t),
    scaleX: lerp(start.scaleX, end.scaleX, t),
    scaleY: lerp(start.scaleY, end.scaleY, t),
  })
}

function ensureTrackSteps(steps: CssKeyframeStep[]): CssKeyframeStep[] {
  const sorted = [...steps].sort((a, b) => a.percent - b.percent)
  if (sorted.length === 0 || sorted[0]!.percent > 0) {
    sorted.unshift({ percent: 0 })
  }

  return sorted
}

function sampleTrackAtTime(track: CssAnimationTrack, time: number): CssKeyframeStep {
  const steps = ensureTrackSteps(track.steps)
  let loopTime = 0
  if (track.duration > 0) {
    loopTime = time % track.duration
    if (time > 0 && loopTime === 0) {
      loopTime = track.duration
    }
  }
  const percent = track.duration > 0 ? (loopTime / track.duration) * 100 : 0

  let previous = steps[0]!
  for (let index = 1; index < steps.length; index += 1) {
    const next = steps[index]!
    if (percent <= next.percent) {
      const range = next.percent - previous.percent
      const amount = range > 0 ? (percent - previous.percent) / range : 0
      return {
        percent,
        transform: interpolateTransformCss(previous.transform, next.transform, amount),
        opacity:
          previous.opacity !== undefined || next.opacity !== undefined
            ? lerp(previous.opacity ?? 1, next.opacity ?? 1, amount)
            : undefined,
        fill: amount < 0.5 ? previous.fill : next.fill,
        stroke: amount < 0.5 ? previous.stroke : next.stroke,
      }
    }

    previous = next
  }

  return steps[steps.length - 1]!
}

function roundTime(time: number): number {
  return Math.round(time * 1000) / 1000
}

function collectSparseSampleTimes(tracks: CssAnimationTrack[], projectDuration: number): number[] {
  const localDuration = Math.max(...tracks.map((track) => track.duration), 0)
  const cycleTimes = new Set<number>([0])

  for (const track of tracks) {
    for (const step of ensureTrackSteps(track.steps)) {
      cycleTimes.add(roundTime((step.percent / 100) * track.duration))
    }
  }

  if (localDuration > 0) {
    cycleTimes.add(localDuration)
  }

  const sortedCycleTimes = [...cycleTimes].sort((a, b) => a - b)
  const times = new Set<number>()

  if (localDuration > 0 && localDuration < projectDuration) {
    for (let offset = 0; offset < projectDuration; offset += localDuration) {
      for (const time of sortedCycleTimes) {
        const absolute = roundTime(offset + time)
        if (absolute <= projectDuration) {
          times.add(absolute)
        }
      }
    }
  } else {
    for (const time of sortedCycleTimes) {
      times.add(time)
    }
    times.add(projectDuration)
  }

  return [...times].sort((a, b) => a - b)
}

type ShapeAnimationSample = {
  time: number
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  opacity: number
}

function sampleOpacityFromAncestors(
  ancestors: AnimatedAncestor[],
  time: number,
  fallback: number,
): number {
  let opacity = fallback

  for (const { track } of ancestors) {
    const step = sampleTrackAtTime(track, time)
    if (step.opacity !== undefined && Number.isFinite(step.opacity)) {
      opacity = step.opacity
    }
  }

  return opacity
}

function rotatePointAround(
  point: { x: number; y: number },
  pivot: { x: number; y: number },
  angleDeg: number,
): { x: number; y: number } {
  if (angleDeg === 0) {
    return point
  }

  const angle = (angleDeg * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - pivot.x
  const dy = point.y - pivot.y

  return {
    x: pivot.x + cos * dx - sin * dy,
    y: pivot.y + sin * dx + cos * dy,
  }
}

function shouldApplyRotationToLayer(
  ancestor: AnimatedAncestor,
  step: CssKeyframeStep,
): boolean {
  if (ancestor.className === 'vg-wheel') {
    return true
  }

  const components = parseTransformComponents(step.transform ?? '')
  return (
    components.rotate !== 0 && components.translateX === 0 && components.translateY === 0
  )
}

function buildShapeAnimationKeyframes(
  baseShape: Shape,
  ancestors: AnimatedAncestor[],
  css: string,
  projectDuration: number,
  parseShape: (element: Element) => Shape | null,
): Keyframe[] {
  if (ancestors.length === 0) {
    return []
  }

  const classToAnimation = parseClassToAnimationMap(css)
  const tracks = ancestors.map((entry) => entry.track)
  const sampleTimes = collectSparseSampleTimes(tracks, projectDuration)
  const bounds = getShapeBounds(baseShape)
  const samples: ShapeAnimationSample[] = []

  for (const time of sampleTimes) {
    let center = getShapeCenter(baseShape)
    let matrix = IDENTITY_MATRIX
    let rotation = baseShape.rotation
    let scaleX = baseShape.scaleX
    let scaleY = baseShape.scaleY

    for (const { element, track, className } of ancestors) {
      const step = sampleTrackAtTime(track, time)
      const components = parseTransformComponents(step.transform ?? '')
      const scopedShapes = collectShapesUntilNestedAnimation(element, classToAnimation)
      const originBounds = getBoundsForElements(scopedShapes, parseShape)
      const origin = resolveTransformOrigin(
        parseTransformOriginForClass(css, className),
        originBounds,
      )

      if (shouldApplyRotationToLayer({ element, track, className }, step)) {
        if (components.rotate !== 0) {
          center = rotatePointAround(center, origin, components.rotate)
          rotation += components.rotate
        }

        if (components.translateX !== 0 || components.translateY !== 0) {
          center = {
            x: center.x + components.translateX,
            y: center.y + components.translateY,
          }
        }
      } else {
        matrix = multiplyMatrix(matrix, cssStepToMatrix(step, origin.x, origin.y))
      }

      scaleX *= components.scaleX
      scaleY *= components.scaleY
    }

    const transformedCenter = applyMatrixToPoint(matrix, center.x, center.y)
    const position =
      baseShape.type === 'ellipse'
        ? transformedCenter
        : {
            x: transformedCenter.x - bounds.width / 2,
            y: transformedCenter.y - bounds.height / 2,
          }

    samples.push({
      time,
      x: position.x,
      y: position.y,
      rotation,
      scaleX,
      scaleY,
      opacity: sampleOpacityFromAncestors(ancestors, time, baseShape.opacity),
    })
  }

  const keyframes: Keyframe[] = []
  const base = samples[0]
  if (!base) {
    return keyframes
  }

  const maybeAdd = (
    property: AnimatableProperty,
    values: Array<number | string>,
    compare: (value: number | string) => boolean,
  ) => {
    if (!values.some(compare)) {
      return
    }

    for (const sample of samples) {
      const value = sample[property as keyof ShapeAnimationSample]
      if (typeof value === 'number' || typeof value === 'string') {
        addKeyframe(keyframes, sample.time, property, value)
      }
    }
  }

  maybeAdd('x', samples.map((sample) => sample.x), (value) => Math.abs((value as number) - baseShape.x) > 0.01)
  maybeAdd('y', samples.map((sample) => sample.y), (value) => Math.abs((value as number) - baseShape.y) > 0.01)
  maybeAdd(
    'rotation',
    samples.map((sample) => sample.rotation),
    (value) => Math.abs((value as number) - baseShape.rotation) > 0.01,
  )
  maybeAdd(
    'scaleX',
    samples.map((sample) => sample.scaleX),
    (value) => Math.abs((value as number) - baseShape.scaleX) > 0.001,
  )
  maybeAdd(
    'scaleY',
    samples.map((sample) => sample.scaleY),
    (value) => Math.abs((value as number) - baseShape.scaleY) > 0.001,
  )
  maybeAdd(
    'opacity',
    samples.map((sample) => sample.opacity),
    (value) => Math.abs((value as number) - baseShape.opacity) > 0.001,
  )

  return keyframes
}

function collectAnimatedShapeElements(svg: Element, css: string): Element[] {
  const shapes: Element[] = []

  for (const tag of SHAPE_TAGS) {
    for (const element of svg.querySelectorAll(tag)) {
      if (getAnimatedAncestorChain(element, css).length > 0) {
        shapes.push(element)
      }
    }
  }

  return shapes
}

export type BuildCssLayersOptions = {
  parseShape: (element: Element) => Shape | null
  createLayer: (
    shape: Shape,
    index: number,
    artboardId: string,
    name: string,
    keyframes: Keyframe[],
  ) => Layer
  onProgress?: (current: number, total: number) => void
}

function buildLayersFromCssTracksCore(
  svg: Element,
  css: string,
  artboardId: string,
  options: BuildCssLayersOptions,
): { layers: Layer[]; duration: number } {
  const tracks = parseCssKeyframeTracks(css)
  const projectDuration = Math.max(...[...tracks.values()].map((track) => track.duration), 0)
  const resolvedDuration = projectDuration > 0 ? projectDuration : 3
  const shapeElements = collectAnimatedShapeElements(svg, css)
  const layers: Layer[] = []
  let index = 0

  for (const shapeElement of shapeElements) {
    options.onProgress?.(index + 1, shapeElements.length)
    const ancestors = getAnimatedAncestorChain(shapeElement, css)
    if (ancestors.length === 0) {
      continue
    }

    const parsedShape = options.parseShape(shapeElement)
    if (!parsedShape) {
      continue
    }

    const keyframes = buildShapeAnimationKeyframes(
      parsedShape,
      ancestors,
      css,
      resolvedDuration,
      options.parseShape,
    )
    if (keyframes.length === 0) {
      continue
    }

    const layerName =
      shapeElement.getAttribute('id') ||
      shapeElement.parentElement?.getAttribute('id') ||
      getElementClassNames(shapeElement.parentElement ?? shapeElement)[0] ||
      `Layer ${index + 1}`

    layers.push(
      options.createLayer(
        { ...parsedShape, id: createId() },
        index,
        artboardId,
        layerName,
        keyframes,
      ),
    )
    index += 1
  }

  return { layers, duration: resolvedDuration }
}

export function buildLayersFromCssTracks(
  svg: Element,
  css: string,
  artboardId: string,
  options: BuildCssLayersOptions,
): { layers: Layer[]; duration: number } {
  return buildLayersFromCssTracksCore(svg, css, artboardId, options)
}

export async function buildLayersFromCssTracksAsync(
  svg: Element,
  css: string,
  artboardId: string,
  options: BuildCssLayersOptions,
): Promise<{ layers: Layer[]; duration: number }> {
  const tracks = parseCssKeyframeTracks(css)
  const projectDuration = Math.max(...[...tracks.values()].map((track) => track.duration), 0)
  const resolvedDuration = projectDuration > 0 ? projectDuration : 3
  const shapeElements = collectAnimatedShapeElements(svg, css)
  const layers: Layer[] = []
  let index = 0

  for (const shapeElement of shapeElements) {
    if (index % 8 === 0) {
      options.onProgress?.(index + 1, shapeElements.length)
      await yieldToUi()
    }

    const ancestors = getAnimatedAncestorChain(shapeElement, css)
    if (ancestors.length === 0) {
      continue
    }

    const parsedShape = options.parseShape(shapeElement)
    if (!parsedShape) {
      continue
    }

    const keyframes = buildShapeAnimationKeyframes(
      parsedShape,
      ancestors,
      css,
      resolvedDuration,
      options.parseShape,
    )
    if (keyframes.length === 0) {
      continue
    }

    const layerName =
      shapeElement.getAttribute('id') ||
      shapeElement.parentElement?.getAttribute('id') ||
      getElementClassNames(shapeElement.parentElement ?? shapeElement)[0] ||
      `Layer ${index + 1}`

    layers.push(
      options.createLayer(
        { ...parsedShape, id: createId() },
        index,
        artboardId,
        layerName,
        keyframes,
      ),
    )
    index += 1
  }

  options.onProgress?.(shapeElements.length, shapeElements.length)

  return { layers, duration: resolvedDuration }
}
