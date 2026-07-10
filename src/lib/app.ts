/** Display name for the project codename (not the official brand). */
export const APP_NAME = 'Open Animator'

/** npm / folder slug */
export const APP_SLUG = 'open-animator'

export const APP_AUTHOR = 'Vitor Gomes'

export const APP_LICENSE = 'MIT'

export const STORAGE_KEYS = {
  project: `${APP_SLUG}:project`,
  legacyProject: 'svg-animator:project',
  theme: `${APP_SLUG}:theme`,
} as const
