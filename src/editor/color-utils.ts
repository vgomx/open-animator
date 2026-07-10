export type HSV = {
  h: number
  s: number
  v: number
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeHex(color: string): string {
  const trimmed = color.trim().toLowerCase()
  if (trimmed === 'none' || trimmed === 'transparent') {
    return '#000000'
  }

  const value = trimmed.replace('#', '')
  if (value.length === 3) {
    return `#${value
      .split('')
      .map((char) => char + char)
      .join('')}`
  }

  if (value.length === 6) {
    return `#${value}`
  }

  return '#000000'
}

export function isTransparentColor(color: string) {
  const trimmed = color.trim().toLowerCase()
  return trimmed === 'none' || trimmed === 'transparent'
}

export function parseHex(color: string): [number, number, number] {
  const normalized = normalizeHex(color).replace('#', '')
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}

export function formatHex([r, g, b]: [number, number, number]) {
  const channel = (value: number) =>
    clamp(Math.round(value), 0, 255)
      .toString(16)
      .padStart(2, '0')

  return `#${channel(r)}${channel(g)}${channel(b)}`
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6
    } else if (max === gn) {
      h = (bn - rn) / delta + 2
    } else {
      h = (rn - gn) / delta + 4
    }
    h *= 60
    if (h < 0) {
      h += 360
    }
  }

  const s = max === 0 ? 0 : (delta / max) * 100
  const v = max * 100

  return { h, s, v }
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const saturation = clamp(s, 0, 100) / 100
  const value = clamp(v, 0, 100) / 100
  const chroma = value * saturation
  const huePrime = (clamp(h, 0, 360) / 60) % 6
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1))
  const m = value - chroma

  let r1 = 0
  let g1 = 0
  let b1 = 0

  if (huePrime >= 0 && huePrime < 1) {
    r1 = chroma
    g1 = x
  } else if (huePrime < 2) {
    r1 = x
    g1 = chroma
  } else if (huePrime < 3) {
    g1 = chroma
    b1 = x
  } else if (huePrime < 4) {
    g1 = x
    b1 = chroma
  } else if (huePrime < 5) {
    r1 = x
    b1 = chroma
  } else {
    r1 = chroma
    b1 = x
  }

  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]
}

export function hexToHsv(color: string): HSV {
  const [r, g, b] = parseHex(color)
  return rgbToHsv(r, g, b)
}

export function hsvToHex(hsv: HSV): string {
  return formatHex(hsvToRgb(hsv.h, hsv.s, hsv.v))
}

export function sanitizeHexInput(raw: string): string {
  const cleaned = raw.trim().replace(/[^0-9a-f#]/gi, '').replace('#', '').slice(0, 6)
  return cleaned ? `#${cleaned}` : '#'
}

export const COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#F2542D',
  '#E07A55',
  '#ec4899',
  '#64748b',
  '#111827',
  '#f8fafc',
  '#dc2626',
  '#059669',
  '#2563eb',
  '#7c3aed',
] as const

export const HUE_GRADIENT =
  'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
