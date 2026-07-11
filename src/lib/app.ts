export const APP_NAME = 'Open Animator'

export { APP_BRAND_ACCENT, BRAND, UI_PATH_STROKE, UI_STROKE } from '@/lib/brand-colors'

/** npm / folder slug */
export const APP_SLUG = 'open-animator'

export const APP_AUTHOR = 'Vitor Gomes'

export const APP_AUTHOR_URL = 'https://vitorgomes.design'

export const APP_LICENSE = 'MIT'

export const APP_GITHUB_URL = 'https://github.com/vgomx/open-animator'

export const STORAGE_KEYS = {
  project: `${APP_SLUG}:project`,
  legacyProject: 'svg-animator:project',
  theme: `${APP_SLUG}:theme`,
  preferences: `${APP_SLUG}:preferences`,
} as const
