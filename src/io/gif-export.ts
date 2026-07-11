import type { ExportOptions } from '@/io/export-options'
import { DEFAULT_EXPORT_OPTIONS, resolveExportScale } from '@/io/export-options'
import { exportSvgAtTime } from '@/io/svg-export'
import { getExportArtboard } from '@/editor/artboard-utils'
import type { Project } from '@/editor/types'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

function scaledDimension(value: number, scale: number): number {
  return Math.round(value * scale)
}

async function renderFrame(
  project: Project,
  time: number,
  options: ExportOptions,
  artboardId?: string,
): Promise<ImageData> {
  const artboard = getExportArtboard(project, artboardId)
  const scale = resolveExportScale(artboard, options)
  const width = scaledDimension(artboard.width, scale)
  const height = scaledDimension(artboard.height, scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const svgMarkup = exportSvgAtTime(project, time, options, artboardId)
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

  return context.getImageData(0, 0, width, height)
}

export async function exportGif(
  project: Project,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): Promise<Uint8Array> {
  const fps = options.fps
  const loopIn = project.loopIn ?? 0
  const loopOut = project.loopOut ?? project.duration
  const regionDuration = Math.max(0.1, loopOut - loopIn)
  const frameCount = Math.max(1, Math.ceil(regionDuration * fps))
  const gif = GIFEncoder()
  const delayMs = Math.round(1000 / fps)

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = Math.min(loopOut, loopIn + frame / fps)
    const imageData = await renderFrame(project, time, options, artboardId)
    const palette = quantize(imageData.data, 256)
    const index = applyPalette(imageData.data, palette)
    gif.writeFrame(index, imageData.width, imageData.height, {
      palette,
      delay: delayMs,
    })
  }

  gif.finish()
  return gif.bytes()
}

export async function downloadGif(
  project: Project,
  filename = 'animation.gif',
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): Promise<void> {
  const bytes = await exportGif(project, options, artboardId)
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'image/gif' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
