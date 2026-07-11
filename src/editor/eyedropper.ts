import { formatHex } from '@/editor/color-utils'

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

export async function sampleColorFromArtboard(
  svg: SVGSVGElement,
  x: number,
  y: number,
  options?: {
    artboardColor?: string
    workspaceColor?: string
  },
): Promise<string | null> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll('[data-eyedropper-ignore]').forEach((node) => node.remove())

  const xmlns = 'http://www.w3.org/2000/svg'
  const background = document.createElementNS(xmlns, 'rect')
  background.setAttribute('width', '100%')
  background.setAttribute('height', '100%')
  background.setAttribute(
    'fill',
    options?.workspaceColor && options.workspaceColor !== 'none'
      ? options.workspaceColor
      : options?.artboardColor && options.artboardColor !== 'none'
        ? options.artboardColor
        : '#ffffff',
  )
  clone.insertBefore(background, clone.firstChild)

  const viewBox = svg.viewBox.baseVal
  const width = viewBox.width || svg.clientWidth
  const height = viewBox.height || svg.clientHeight
  if (width <= 0 || height <= 0) {
    return null
  }

  const svgString = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      return null
    }

    context.drawImage(image, 0, 0, width, height)
    const sampleX = Math.min(width - 1, Math.max(0, Math.floor(x)))
    const sampleY = Math.min(height - 1, Math.max(0, Math.floor(y)))
    const [r, g, b, a] = context.getImageData(sampleX, sampleY, 1, 1).data
    if (a === 0) {
      return null
    }

    return formatHex([r, g, b])
  } finally {
    URL.revokeObjectURL(url)
  }
}

type EyeDropperResult = {
  sRGBHex: string
}

type EyeDropperConstructor = new () => {
  open: () => Promise<EyeDropperResult>
}

export function isNativeEyeDropperSupported() {
  return typeof window !== 'undefined' && 'EyeDropper' in window
}

export async function pickColorFromScreen(): Promise<string | null> {
  if (!isNativeEyeDropperSupported()) {
    return null
  }

  const EyeDropper = (window as unknown as { EyeDropper: EyeDropperConstructor }).EyeDropper

  try {
    const result = await new EyeDropper().open()
    return result.sRGBHex
  } catch {
    return null
  }
}
