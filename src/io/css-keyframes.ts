import { createId } from '@/editor/scene'
import { getShapeBounds } from '@/editor/bounds'
import type { AnimatableProperty, EasingType, Keyframe, Layer, Shape } from '@/editor/types'
import { sampleEasing } from '@/editor/easing'
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

export type CssTimingFunction =
  | { type: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' }
  | { type: 'steps'; count: number; jump: 'start' | 'end' | 'none' }

export type CssAnimationDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'

export type CssAnimationBinding = {
  animationName: string
  duration: number
  delay: number
  direction: CssAnimationDirection
  timingFunction: CssTimingFunction
}

const ANIMATION_DIRECTIONS = new Set<CssAnimationDirection>([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
])

function tokenizeAnimationShorthand(value: string): string[] {
  const tokens: string[] = []
  let current = ''
  let depth = 0

  for (const char of value) {
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth -= 1
    }

    if (char === ' ' && depth === 0) {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

function isDurationToken(token: string, variables: Map<string, string>): boolean {
  const resolved = resolveCssVar(token, variables)
  return parseDurationSeconds(resolved) !== null
}

function parseTimingFunctionToken(token: string): CssTimingFunction | null {
  const normalized = token.trim().toLowerCase()
  if (normalized === 'linear') {
    return { type: 'linear' }
  }
  if (normalized === 'ease') {
    return { type: 'ease' }
  }
  if (normalized === 'ease-in') {
    return { type: 'ease-in' }
  }
  if (normalized === 'ease-out') {
    return { type: 'ease-out' }
  }
  if (normalized === 'ease-in-out') {
    return { type: 'ease-in-out' }
  }

  const stepsMatch = normalized.match(/^steps\(\s*([0-9]+)\s*(?:,\s*(start|end|jump-start|jump-end|jump-none))?\s*\)$/)
  if (stepsMatch) {
    const count = Number.parseInt(stepsMatch[1]!, 10)
    const jumpToken = stepsMatch[2] ?? 'end'
    const jump =
      jumpToken === 'start' || jumpToken === 'jump-start'
        ? 'start'
        : jumpToken === 'jump-none'
          ? 'none'
          : 'end'
    return { type: 'steps', count: Number.isFinite(count) && count > 0 ? count : 1, jump }
  }

  return null
}

export function parseAnimationShorthand(
  shorthand: string,
  variables: Map<string, string>,
): Omit<CssAnimationBinding, 'animationName'> & { animationName?: string } {
  const tokens = tokenizeAnimationShorthand(shorthand.trim())
  const binding: CssAnimationBinding = {
    animationName: '',
    duration: 3,
    delay: 0,
    direction: 'normal',
    timingFunction: { type: 'linear' },
  }

  const durations: number[] = []

  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (binding.animationName.length === 0 && !isDurationToken(token, variables)) {
      const timing = parseTimingFunctionToken(token)
      if (timing) {
        binding.timingFunction = timing
        continue
      }
      if (ANIMATION_DIRECTIONS.has(lower as CssAnimationDirection)) {
        binding.direction = lower as CssAnimationDirection
        continue
      }
      if (lower === 'infinite' || /^[0-9.]+$/.test(lower)) {
        continue
      }
      binding.animationName = token
      continue
    }

    if (isDurationToken(token, variables)) {
      const resolved = resolveCssVar(token, variables)
      const duration = parseDurationSeconds(resolved)
      if (duration !== null) {
        durations.push(duration)
      }
      continue
    }

    const timing = parseTimingFunctionToken(token)
    if (timing) {
      binding.timingFunction = timing
      continue
    }

    if (ANIMATION_DIRECTIONS.has(lower as CssAnimationDirection)) {
      binding.direction = lower as CssAnimationDirection
    }
  }

  if (durations[0] !== undefined) {
    binding.duration = Math.abs(durations[0])
  }
  if (durations[1] !== undefined) {
    binding.delay = durations[1]
  }

  return binding
}

export function parseClassAnimationBindings(css: string): Map<string, CssAnimationBinding> {
  const variables = parseCssVariables(css)
  const bindings = new Map<string, CssAnimationBinding>()
  const classPattern = /\.([a-zA-Z_][\w-]*)\s*\{([^}]*)\}/g
  let match: RegExpExecArray | null

  while ((match = classPattern.exec(css)) !== null) {
    const className = match[1]!
    const body = match[2]!
    const animationDecl = body.match(/animation:\s*([^;]+)/)?.[1]?.trim()
    if (!animationDecl) {
      continue
    }

    const parsed = parseAnimationShorthand(animationDecl, variables)
    if (!parsed.animationName) {
      continue
    }

    bindings.set(className, {
      animationName: parsed.animationName,
      duration: parsed.duration,
      delay: parsed.delay,
      direction: parsed.direction,
      timingFunction: parsed.timingFunction,
    })
  }

  return bindings
}

export function parseElementAnimationOverrides(
  element: Element,
  variables: Map<string, string>,
): Partial<Pick<CssAnimationBinding, 'delay' | 'direction' | 'duration' | 'timingFunction'>> {
  const style = element.getAttribute('style')
  if (!style) {
    return {}
  }

  const overrides: Partial<Pick<CssAnimationBinding, 'delay' | 'direction' | 'duration' | 'timingFunction'>> =
    {}

  const delayMatch = style.match(/animation-delay\s*:\s*([^;]+)/i)?.[1]?.trim()
  if (delayMatch) {
    const delay = parseDurationSeconds(resolveCssVar(delayMatch, variables))
    if (delay !== null) {
      overrides.delay = delay
    }
  }

  const directionMatch = style.match(/animation-direction\s*:\s*([^;]+)/i)?.[1]?.trim()
  if (directionMatch && ANIMATION_DIRECTIONS.has(directionMatch.toLowerCase() as CssAnimationDirection)) {
    overrides.direction = directionMatch.toLowerCase() as CssAnimationDirection
  }

  const timingMatch = style.match(/animation-timing-function\s*:\s*([^;]+)/i)?.[1]?.trim()
  if (timingMatch) {
    const timing = parseTimingFunctionToken(resolveCssVar(timingMatch, variables))
    if (timing) {
      overrides.timingFunction = timing
    }
  }

  const animationMatch = style.match(/animation\s*:\s*([^;]+)/i)?.[1]?.trim()
  if (animationMatch) {
    const parsed = parseAnimationShorthand(animationMatch, variables)
    if (parsed.delay !== 0) {
      overrides.delay = parsed.delay
    }
    if (parsed.direction !== 'normal') {
      overrides.direction = parsed.direction
    }
    if (parsed.timingFunction.type !== 'linear') {
      overrides.timingFunction = parsed.timingFunction
    }
    if (parsed.duration !== 3) {
      overrides.duration = parsed.duration
    }
  }

  return overrides
}

export function cssTimingToEasing(timing: CssTimingFunction): EasingType {
  if (timing.type === 'steps') {
    return 'hold'
  }

  switch (timing.type) {
    case 'ease-in':
      return 'easeIn'
    case 'ease-out':
      return 'easeOut'
    case 'ease-in-out':
    case 'ease':
      return 'easeInOut'
    default:
      return 'linear'
  }
}

function applyCssTiming(progress: number, timing: CssTimingFunction): number {
  const clamped = Math.max(0, Math.min(1, progress))

  if (timing.type === 'steps') {
    const count = Math.max(1, timing.count)
    if (count === 1) {
      return 0
    }

    if (timing.jump === 'start') {
      return Math.min(1, Math.ceil(clamped * count) / count)
    }

    return Math.min(1, Math.floor(clamped * count) / (count - 1))
  }

  return sampleEasing(clamped, cssTimingToEasing(timing))
}

function resolveAnimationLocalTime(
  globalTime: number,
  binding: CssAnimationBinding,
): number | null {
  const activeTime = globalTime - binding.delay
  if (activeTime < 0 || binding.duration <= 0) {
    return null
  }

  let loopTime = activeTime % binding.duration
  if (activeTime > 0 && loopTime === 0) {
    loopTime = binding.duration
  }

  const iteration = Math.floor(activeTime / binding.duration)
  let reversed = binding.direction === 'reverse'
  if (binding.direction === 'alternate') {
    reversed = iteration % 2 === 1
  } else if (binding.direction === 'alternate-reverse') {
    reversed = iteration % 2 === 0
  }

  return reversed ? binding.duration - loopTime : loopTime
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
  const secondsMatch = trimmed.match(/^(-?[0-9.]+)s$/)
  if (secondsMatch) {
    const duration = Number.parseFloat(secondsMatch[1]!)
    return Number.isFinite(duration) ? duration : null
  }

  const msMatch = trimmed.match(/^(-?[0-9.]+)ms$/)
  if (msMatch) {
    const duration = Number.parseFloat(msMatch[1]!) / 1000
    return Number.isFinite(duration) ? duration : null
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
  easing: EasingType = 'linear',
) {
  const existing = keyframes.find(
    (keyframe) => keyframe.time === time && keyframe.property === property,
  )
  if (existing) {
    existing.value = value
    existing.easing = easing
    return
  }

  keyframes.push({
    id: createId(),
    time,
    property,
    value,
    easing,
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
  binding: CssAnimationBinding
}

function resolveAnimationBinding(
  element: Element,
  className: string,
  css: string,
  track: CssAnimationTrack,
): CssAnimationBinding {
  const variables = parseCssVariables(css)
  const classBindings = parseClassAnimationBindings(css)
  const base =
    classBindings.get(className) ??
    ({
      animationName: '',
      duration: track.duration,
      delay: 0,
      direction: 'normal',
      timingFunction: { type: 'linear' },
    } satisfies CssAnimationBinding)
  const overrides = parseElementAnimationOverrides(element, variables)

  return {
    ...base,
    duration: overrides.duration ?? base.duration ?? track.duration,
    delay: overrides.delay ?? base.delay,
    direction: overrides.direction ?? base.direction,
    timingFunction: overrides.timingFunction ?? base.timingFunction,
  }
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
        chain.push({
          element: current,
          track,
          className,
          binding: resolveAnimationBinding(current, className, css, track),
        })
      }
    }

    if (tag === 'svg') {
      break
    }

    current = current.parentElement
  }

  return chain.reverse()
}

function collectScopedShapesForAncestor(
  root: Element,
  ancestorChain: AnimatedAncestor[],
  ancestorIndex: number,
): Element[] {
  const tag = root.tagName.toLowerCase()
  if (SHAPE_TAGS.has(tag)) {
    return [root]
  }

  const nestedClassNames = new Set(
    ancestorChain.slice(ancestorIndex + 1).map((entry) => entry.className),
  )
  const immediateNextClass = ancestorChain[ancestorIndex + 1]?.className
  const shapes: Element[] = []

  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      const childClasses = getElementClassNames(child)
      const childTag = child.tagName.toLowerCase()
      const entersNextAnimatedGroup =
        immediateNextClass !== undefined &&
        childClasses.includes(immediateNextClass) &&
        !SHAPE_TAGS.has(childTag)
      const skipsDeeperAnimatedSubtree = childClasses.some(
        (className) => nestedClassNames.has(className) && className !== immediateNextClass,
      )

      if (skipsDeeperAnimatedSubtree && !entersNextAnimatedGroup) {
        continue
      }

      if (entersNextAnimatedGroup) {
        walk(child)
        continue
      }

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

function sampleTrackAtTime(
  track: CssAnimationTrack,
  globalTime: number,
  binding: CssAnimationBinding,
): CssKeyframeStep {
  const steps = ensureTrackSteps(track.steps)
  const localTime = resolveAnimationLocalTime(globalTime, binding)
  if (localTime === null) {
    return steps[0]!
  }

  const percent = binding.duration > 0 ? (localTime / binding.duration) * 100 : 0

  let previous = steps[0]!
  for (let index = 1; index < steps.length; index += 1) {
    const next = steps[index]!
    if (percent <= next.percent) {
      const range = next.percent - previous.percent
      const amount = range > 0 ? (percent - previous.percent) / range : 0
      const easedAmount =
        binding.timingFunction.type === 'steps'
          ? applyCssTiming(amount, binding.timingFunction)
          : amount
      return {
        percent,
        transform: interpolateTransformCss(previous.transform, next.transform, easedAmount),
        opacity:
          previous.opacity !== undefined || next.opacity !== undefined
            ? lerp(previous.opacity ?? 1, next.opacity ?? 1, easedAmount)
            : undefined,
        fill: easedAmount < 0.5 ? previous.fill : next.fill,
        stroke: easedAmount < 0.5 ? previous.stroke : next.stroke,
      }
    }

    previous = next
  }

  return steps[steps.length - 1]!
}

function roundTime(time: number): number {
  return Math.round(time * 1000) / 1000
}

function collectLocalBoundaryTimes(
  track: CssAnimationTrack,
  binding: CssAnimationBinding,
): number[] {
  const times = new Set<number>([0])
  const duration = binding.duration > 0 ? binding.duration : track.duration

  for (const step of ensureTrackSteps(track.steps)) {
    times.add(roundTime((step.percent / 100) * duration))
  }

  if (duration > 0) {
    times.add(duration)
  }

  if (binding.timingFunction.type === 'steps' && binding.timingFunction.count > 1) {
    const sortedSteps = ensureTrackSteps(track.steps)
    for (let index = 0; index < sortedSteps.length - 1; index += 1) {
      const previous = sortedSteps[index]!
      const next = sortedSteps[index + 1]!
      const segStart = (previous.percent / 100) * duration
      const segEnd = (next.percent / 100) * duration
      const stepCount = binding.timingFunction.count

      for (let stepIndex = 1; stepIndex < stepCount; stepIndex += 1) {
        times.add(roundTime(segStart + ((segEnd - segStart) * stepIndex) / stepCount))
      }
    }
  }

  return [...times].sort((a, b) => a - b)
}

function collectSparseSampleTimes(
  ancestors: AnimatedAncestor[],
  projectDuration: number,
): number[] {
  const times = new Set<number>([0, projectDuration])

  for (const { track, binding } of ancestors) {
    const duration = binding.duration > 0 ? binding.duration : track.duration
    if (duration <= 0) {
      continue
    }

    const localBoundaryTimes = collectLocalBoundaryTimes(track, binding)
    let iteration = 0

    while (iteration < 10_000) {
      const iterationStart = binding.delay + iteration * duration
      if (iterationStart > projectDuration + duration) {
        break
      }

      for (const local of localBoundaryTimes) {
        const absolute = roundTime(iterationStart + local)
        if (absolute >= 0 && absolute <= projectDuration) {
          times.add(absolute)
        }
      }

      iteration += 1
    }
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

  for (const { track, binding } of ancestors) {
    const step = sampleTrackAtTime(track, time, binding)
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

function applyAncestorTransformToSample(
  center: { x: number; y: number },
  rotation: number,
  scaleX: number,
  scaleY: number,
  ancestor: AnimatedAncestor,
  step: CssKeyframeStep,
  scopedShapes: Element[],
  css: string,
  parseShape: (element: Element) => Shape | null,
): { center: { x: number; y: number }; rotation: number; scaleX: number; scaleY: number } {
  const components = parseTransformComponents(step.transform ?? '')
  const originBounds = getBoundsForElements(scopedShapes, parseShape)
  const origin = resolveTransformOrigin(
    parseTransformOriginForClass(css, ancestor.className),
    originBounds,
  )
  const spinOnly =
    components.rotate !== 0 && components.translateX === 0 && components.translateY === 0

  if (components.rotate !== 0) {
    if (ancestor.className === 'vg-wheel') {
      rotation += components.rotate
    } else if (spinOnly) {
      center = rotatePointAround(center, origin, components.rotate)
      rotation += components.rotate
    } else {
      rotation += components.rotate
    }
  }

  if (components.translateX !== 0) {
    center = { ...center, x: center.x + components.translateX }
  }

  if (components.translateY !== 0) {
    center = { ...center, y: center.y + components.translateY }
  }

  return {
    center,
    rotation,
    scaleX: scaleX * components.scaleX,
    scaleY: scaleY * components.scaleY,
  }
}

function ancestorAnimatesProperty(
  ancestor: AnimatedAncestor,
  property: AnimatableProperty,
): boolean {
  if (property === 'opacity') {
    return ancestor.track.steps.some((step) => step.opacity !== undefined)
  }

  if (property === 'rotation') {
    return ancestor.track.steps.some((step) => /rotate/.test(step.transform ?? ''))
  }

  if (property === 'x' || property === 'y') {
    return ancestor.track.steps.some((step) => /translate|rotate/.test(step.transform ?? ''))
  }

  if (property === 'scaleX' || property === 'scaleY') {
    return ancestor.track.steps.some((step) => /scale/.test(step.transform ?? ''))
  }

  return false
}

function resolveSegmentEasing(
  ancestors: AnimatedAncestor[],
  property: AnimatableProperty,
): EasingType {
  const sources = ancestors.filter((ancestor) => ancestorAnimatesProperty(ancestor, property))
  if (sources.length === 0) {
    return 'linear'
  }

  if (sources.length === 1) {
    return cssTimingToEasing(sources[0]!.binding.timingFunction)
  }

  if (property === 'x' || property === 'y') {
    const stepsSource = sources.find(
      (ancestor) => ancestor.binding.timingFunction.type === 'steps',
    )
    if (stepsSource) {
      return 'hold'
    }

    return 'linear'
  }

  if (property === 'opacity' || property === 'rotation') {
    const source = [...sources].reverse()[0]
    return source ? cssTimingToEasing(source.binding.timingFunction) : 'linear'
  }

  return 'linear'
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

  const sampleTimes = collectSparseSampleTimes(ancestors, projectDuration)
  const bounds = getShapeBounds(baseShape)
  const samples: ShapeAnimationSample[] = []

  for (const time of sampleTimes) {
    let center = getShapeCenter(baseShape)
    let rotation = baseShape.rotation
    let scaleX = baseShape.scaleX
    let scaleY = baseShape.scaleY

    for (const [ancestorIndex, ancestor] of ancestors.entries()) {
      const { track, binding } = ancestor
      const step = sampleTrackAtTime(track, time, binding)
      const scopedShapes = collectScopedShapesForAncestor(
        ancestor.element,
        ancestors,
        ancestorIndex,
      )
      ;({ center, rotation, scaleX, scaleY } = applyAncestorTransformToSample(
        center,
        rotation,
        scaleX,
        scaleY,
        ancestor,
        step,
        scopedShapes,
        css,
        parseShape,
      ))
    }

    const position =
      baseShape.type === 'ellipse'
        ? center
        : {
            x: center.x - bounds.width / 2,
            y: center.y - bounds.height / 2,
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

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index]!
      const value = sample[property as keyof ShapeAnimationSample]
      if (typeof value === 'number' || typeof value === 'string') {
        const easing =
          index < samples.length - 1
            ? resolveSegmentEasing(ancestors, property)
            : 'linear'
        addKeyframe(keyframes, sample.time, property, value, easing)
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
