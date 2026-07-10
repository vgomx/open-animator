import type { Layer, Project, Shape } from '@/editor/types'
import { samplePropertyAtTime } from '@/editor/animation'

function shapeAttributes(shape: Shape, layer: Layer): string {
  const x = samplePropertyAtTime(layer.keyframes, 'x', 0, shape.x)
  const y = samplePropertyAtTime(layer.keyframes, 'y', 0, shape.y)
  const opacity = samplePropertyAtTime(layer.keyframes, 'opacity', 0, shape.opacity)
  const scale = samplePropertyAtTime(layer.keyframes, 'scale', 0, shape.scale)
  const transform = `translate(${x} ${y}) scale(${scale})`

  const shared = [
    `transform="${transform}"`,
    `fill="${shape.fill}"`,
    `stroke="${shape.stroke}"`,
    `stroke-width="${shape.strokeWidth}"`,
    `opacity="${opacity}"`,
  ]

  if (shape.type === 'rect') {
    return `<rect ${shared.join(' ')} width="${shape.width}" height="${shape.height}" />`
  }

  return `<ellipse ${shared.join(' ')} rx="${shape.rx}" ry="${shape.ry}" />`
}

export function exportStaticSvg(project: Project): string {
  const visibleLayers = project.layers.filter((layer) => layer.visible)
  const shapes = visibleLayers.map((layer) => shapeAttributes(layer.shape, layer)).join('\n    ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${project.artboard.width}" height="${project.artboard.height}" viewBox="0 0 ${project.artboard.width} ${project.artboard.height}">
  <rect width="100%" height="100%" fill="#111827" />
  ${shapes}
</svg>`
}

export function downloadStaticSvg(project: Project, filename = 'artboard.svg'): void {
  const blob = new Blob([exportStaticSvg(project)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
