export const SHELL_PANEL_REVEAL_DELAY_MS = 560
export const SHELL_PANEL_REVEAL_DURATION_MS = 380
export const SHELL_TOOL_PALETTE_DELAY_MS = 1500
export const SHELL_TOOL_PALETTE_DURATION_MS = 520
export const SHELL_WELCOME_MODAL_PAUSE_MS = 280

export function getShellPanelRevealCompleteMs(): number {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 0
  }

  return SHELL_PANEL_REVEAL_DELAY_MS + SHELL_PANEL_REVEAL_DURATION_MS
}

export function getShellToolPaletteRevealCompleteMs(): number {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 0
  }

  return SHELL_TOOL_PALETTE_DELAY_MS + SHELL_TOOL_PALETTE_DURATION_MS
}

export function getShellWelcomeModalDelayMs(): number {
  const revealCompleteMs = getShellToolPaletteRevealCompleteMs()
  if (revealCompleteMs === 0) {
    return 0
  }

  return revealCompleteMs + SHELL_WELCOME_MODAL_PAUSE_MS
}
