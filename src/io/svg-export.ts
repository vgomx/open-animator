import type { Project, Shape } from '@/editor/types'
import { getAnimatedShape } from '@/editor/animation'
import { buildShapeTransform } from '@/editor/transforms'

function shapeAttributes(shape: Shape): string {
  const transform = buildShapeTransform(shape)

  const shared = [
    `transform="${transform}"`,
    `fill="${shape.fill}"`,
    `stroke="${shape.stroke}"`,
    `stroke-width="${shape.strokeWidth}"`,
    `opacity="${shape.opacity}"`,
  ]

  if (shape.type === 'rect') {
    return `<rect ${shared.join(' ')} width="${shape.width}" height="${shape.height}" />`
  }

  return `<ellipse ${shared.join(' ')} rx="${shape.rx}" ry="${shape.ry}" />`
}

export function exportSvgAtTime(project: Project, time: number): string {
  const visibleLayers = project.layers.filter((layer) => layer.visible)
  const shapes = visibleLayers
    .map((layer) => shapeAttributes(getAnimatedShape(layer, time)))
    .join('\n    ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${project.artboard.width}" height="${project.artboard.height}" viewBox="0 0 ${project.artboard.width} ${project.artboard.height}">
  <rect width="100%" height="100%" fill="#111827" />
  ${shapes}
</svg>`
}

export function exportStaticSvg(project: Project): string {
  return exportSvgAtTime(project, 0)
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

export async function downloadWebm(
  project: Project,
  filename = 'animation.webm',
  fps = 30,
): Promise<void> {
  const { width, height } = project.artboard
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const stream = canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
  const chunks: Blob[] = []

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }
  })

  recorder.start()
  const frameCount = Math.max(1, Math.ceil(project.duration * fps))

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = Math.min(project.duration, frame / fps)
    const svgMarkup = exportSvgAtTime(project, time)
    const image = new Image()
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }))

    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)
        URL.revokeObjectURL(url)
        resolve()
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to render animation frame.'))
      }
      image.src = url
    })

    await new Promise((resolve) => {
      window.setTimeout(resolve, 1000 / fps)
    })
  }

  recorder.stop()
  const blob = await stopped
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
