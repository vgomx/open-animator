/** Visual identity tokens from the Open Animator brand sheet. */
export const BRAND = {
  accent: '#F2542D',
  bgDark: '#0a0a0a',
  bgLight: '#fdfcf9',
  canvasLight: '#f4f3f0',
  fgDark: '#f4f3f0',
  fgLight: '#1c1b19',
  mutedFg: '#8a8780',
  mutedFgStrong: '#6b6860',
  borderLight: '#e8e6e0',
  surfaceDark: '#141312',
  surfaceRaisedDark: '#1c1b19',
  surfaceLight: '#ffffff',
  surfaceMutedLight: '#f0efec',
} as const

/** Interactive canvas chrome: selection, guides, playhead, marquee. */
export const UI_STROKE = BRAND.accent

/** Path / pen tool overlays — warm coral variant of the accent. */
export const UI_PATH_STROKE = '#E07A55'

/** Lighter coral for path handle fills. */
export const UI_PATH_FILL = '#F2A88E'

/** Default demo / template shape fills. */
export const SHAPE_FILL_PRIMARY = BRAND.accent
export const SHAPE_FILL_SECONDARY = UI_PATH_STROKE
export const SHAPE_STROKE_PRIMARY = '#9A3218'
export const SHAPE_STROKE_SECONDARY = '#9A4A30'

export const APP_BRAND_ACCENT = BRAND.accent
