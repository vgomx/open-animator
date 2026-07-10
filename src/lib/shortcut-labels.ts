function isApplePlatform() {
  if (typeof navigator === 'undefined') {
    return true
  }

  return /Mac|iPhone|iPad/i.test(navigator.platform)
}

export function modShortcut(key: string) {
  return isApplePlatform() ? `⌘${key}` : `Ctrl+${key}`
}

export function modShiftShortcut(key: string) {
  return isApplePlatform() ? `⌘⇧${key}` : `Ctrl+Shift+${key}`
}
