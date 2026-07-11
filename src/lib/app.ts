export const APP_NAME = 'Open Animator'

/** Pre-release stage shown in About and other product surfaces. */
export const APP_RELEASE_STAGE = 'beta' as const

export { APP_BRAND_ACCENT, BRAND, UI_PATH_STROKE, UI_STROKE } from '@/lib/brand-colors'

/** npm / folder slug */
export const APP_SLUG = 'open-animator'

export const APP_AUTHOR = 'Vitor Gomes'

export const APP_AUTHOR_URL = 'https://vitorgomes.design'

export const APP_LICENSE = 'MIT'

export const APP_SITE_URL = 'https://vgomx.github.io/open-animator/'

export const APP_DESCRIPTION =
  'Browser-based SVG animator for authoring simple shape animations with keyframes.'

export const APP_OG_IMAGE_URL = `${APP_SITE_URL}og-image.png`

export const APP_GITHUB_URL = 'https://github.com/vgomx/open-animator'

export const STORAGE_KEYS = {
  project: `${APP_SLUG}:project`,
  legacyProject: 'svg-animator:project',
  theme: `${APP_SLUG}:theme`,
  preferences: `${APP_SLUG}:preferences`,
  layerClipboard: `${APP_SLUG}:layer-clipboard`,
  shortcutsHintSeen: `${APP_SLUG}:shortcuts-hint-seen`,
} as const
