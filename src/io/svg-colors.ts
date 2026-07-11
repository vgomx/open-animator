export const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  none: 'none',
  transparent: 'transparent',
}

export function parseSvgColor(raw: string | null | undefined, fallback = '#000000'): string {
  if (!raw) {
    return fallback
  }

  const trimmed = raw.trim().toLowerCase()
  if (trimmed in NAMED_COLORS) {
    return NAMED_COLORS[trimmed]!
  }

  if (trimmed === 'none' || trimmed === 'transparent') {
    return 'none'
  }

  if (trimmed.startsWith('#')) {
    return trimmed
  }

  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/)
  if (rgbMatch) {
    const channels = rgbMatch[1]!
      .split(',')
      .map((part) => Number.parseFloat(part.trim()))
      .filter((value) => Number.isFinite(value))

    if (channels.length >= 3) {
      const toHex = (value: number) =>
        Math.max(0, Math.min(255, Math.round(value)))
          .toString(16)
          .padStart(2, '0')
      return `#${toHex(channels[0]!)}${toHex(channels[1]!)}${toHex(channels[2]!)}`
    }
  }

  return fallback
}
