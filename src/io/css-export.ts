import type { Layer, Project } from '@/editor/types'
import { getAnimatedShape } from '@/editor/animation'
import { buildShapeTransform } from '@/editor/transforms'

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

function layerKeyframesCss(layer: Layer, duration: number, className: string): string {
  const times = collectLayerTimes(layer, duration)
  if (times.length <= 1) {
    return ''
  }

  const lines = times
    .map((time) => {
      const shape = getAnimatedShape(layer, time)
      const percent = duration === 0 ? 0 : (time / duration) * 100
      return `  ${percent}% { transform: ${toCssTransform(shape)}; opacity: ${shape.opacity}; }`
    })
    .join('\n')

  return `@keyframes ${className} {\n${lines}\n}\n.${className} { animation: ${className} ${duration}s linear infinite; transform-box: fill-box; transform-origin: center; }`
}

export function exportCssKeyframes(project: Project): string {
  const visibleLayers = project.layers.filter((layer) => layer.visible)
  const blocks = visibleLayers
    .map((layer, index) => layerKeyframesCss(layer, project.duration, `anim-layer-${index}`))
    .filter(Boolean)

  return blocks.join('\n\n')
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
