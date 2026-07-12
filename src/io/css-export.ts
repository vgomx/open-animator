import type { Layer, Project } from '@/editor/types'
import { getAnimatedShape } from '@/editor/animation'
import { buildShapeTransform } from '@/editor/transforms'
import {
  animatedGroupIds,
  getExportAnimationContext,
  groupKeyframesCss,
} from '@/io/group-export'

function collectLayerTimes(layer: Layer, duration: number): number[] {
  const times = new Set<number>([0, duration])
  for (const keyframe of layer.keyframes) {
    times.add(Math.max(0, Math.min(keyframe.time, duration)))
  }
  return [...times].sort((a, b) => a - b)
}

function toCssTransform(shape: ReturnType<typeof getAnimatedShape>): string {
  return buildShapeTransform(shape)
    .replace(/translate\(([^)]+)\)/g, (_, values: string) => {
      const [x, y] = values.trim().split(/\s+/)
      return `translate(${x}px, ${y}px)`
    })
    .replace(/rotate\(([^)]+)\)/g, 'rotate($1deg)')
}

function layerKeyframesCss(
  layer: Layer,
  duration: number,
  className: string,
  context?: ReturnType<typeof getExportAnimationContext>,
): string {
  const cycleDuration = layer.cycleDuration ?? duration
  const times = collectLayerTimes(layer, cycleDuration)
  if (times.length <= 1) {
    return ''
  }

  const lines = times
    .map((time) => {
      const shape = getAnimatedShape(layer, time, context)
      const percent = cycleDuration === 0 ? 0 : (time / cycleDuration) * 100
      return `  ${percent}% { transform: ${toCssTransform(shape)}; opacity: ${shape.opacity}; }`
    })
    .join('\n')

  return `@keyframes ${className} {\n${lines}\n}\n.${className} { animation: ${className} ${cycleDuration}s linear infinite; transform-box: fill-box; transform-origin: center; }`
}

export function exportCssKeyframes(project: Project): string {
  const context = getExportAnimationContext(project)
  const visibleLayers = project.layers.filter((layer) => layer.visible)
  const layerBlocks = visibleLayers
    .map((layer, index) => layerKeyframesCss(layer, project.duration, `anim-layer-${index}`, context))
    .filter(Boolean)

  const groupBlocks = animatedGroupIds(project.layerGroups).map((groupId, index) =>
    groupKeyframesCss(groupId, project.layerGroups, project.duration, `anim-group-${index}`),
  )

  return [...layerBlocks, ...groupBlocks].filter(Boolean).join('\n\n')
}

export function downloadCssKeyframes(project: Project, filename = 'animation.css'): void {
  const blob = new Blob([exportCssKeyframes(project)], { type: 'text/css' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
