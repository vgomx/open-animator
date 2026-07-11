/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'

import { getPwaInstallState } from '@/lib/pwa-install'

describe('getPwaInstallState', () => {
  it('reports installed when running in standalone display mode', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('standalone'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )

    const state = getPwaInstallState(null)

    expect(state.isInstalled).toBe(true)
    expect(state.canPromptInstall).toBe(false)
  })

  it('enables prompt install when beforeinstallprompt is captured', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    })

    const deferredPrompt = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    } as unknown as Parameters<typeof getPwaInstallState>[0]

    const state = getPwaInstallState(deferredPrompt)

    expect(state.isInstalled).toBe(false)
    expect(state.canPromptInstall).toBe(true)
    expect(state.platform).toBe('chrome')
  })
})
