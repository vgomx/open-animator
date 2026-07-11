import { useCallback, useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type PwaInstallPlatform = 'chrome' | 'ios-safari' | 'macos-safari' | 'other'

export type PwaInstallState = {
  canPromptInstall: boolean
  isInstalled: boolean
  isInstallable: boolean
  platform: PwaInstallPlatform
  installInstructions: string
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isSafariBrowser() {
  const userAgent = navigator.userAgent
  return /Safari/i.test(userAgent) && !/Chrome|CriOS|Chromium|Edg|OPR|FxiOS/i.test(userAgent)
}

function isStandaloneDisplayMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function detectPlatform(): PwaInstallPlatform {
  if (isIosDevice() && isSafariBrowser()) {
    return 'ios-safari'
  }

  if (isSafariBrowser()) {
    return 'macos-safari'
  }

  if (/Chrome|Chromium|Edg|OPR/i.test(navigator.userAgent)) {
    return 'chrome'
  }

  return 'other'
}

function getInstallInstructions(platform: PwaInstallPlatform) {
  switch (platform) {
    case 'ios-safari':
      return 'Tap Share, then Add to Home Screen.'
    case 'macos-safari':
      return 'Choose File → Add to Dock, or click the + icon in the Smart Search field.'
    case 'chrome':
      return 'Open the browser menu (⋮) and choose Install Open Animator, or use the install button below when available.'
    default:
      return 'Use your browser install or add-to-home-screen option when available.'
  }
}

export function getPwaInstallState(deferredPrompt: BeforeInstallPromptEvent | null): PwaInstallState {
  const platform = detectPlatform()
  const isInstalled = isStandaloneDisplayMode()
  const canPromptInstall = deferredPrompt !== null
  const isInstallable = !isInstalled && (canPromptInstall || platform !== 'other')

  return {
    canPromptInstall,
    isInstalled,
    isInstallable,
    platform,
    installInstructions: getInstallInstructions(platform),
    promptInstall: async () => {
      if (!deferredPrompt) {
        return 'unavailable'
      }

      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      return choice.outcome
    },
  }
}

export function usePwaInstall(): PwaInstallState & {
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
} {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    const displayModeQuery = window.matchMedia('(display-mode: standalone)')

    const handleDisplayModeChange = () => {
      setIsInstalled(isStandaloneDisplayMode())
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    displayModeQuery.addEventListener('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      displayModeQuery.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return 'unavailable'
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    return choice.outcome
  }, [deferredPrompt])

  const platform = detectPlatform()
  const canPromptInstall = deferredPrompt !== null
  const isInstallable = !isInstalled && (canPromptInstall || platform !== 'other')

  return {
    canPromptInstall,
    isInstalled,
    isInstallable,
    platform,
    installInstructions: getInstallInstructions(platform),
    promptInstall,
  }
}
