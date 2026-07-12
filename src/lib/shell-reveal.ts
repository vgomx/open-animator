export const SHELL_PANEL_REVEAL_DELAY_MS = 560
export const SHELL_PANEL_REVEAL_DURATION_MS = 380

export function getShellPanelRevealCompleteMs(): number {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 0
  }

  return SHELL_PANEL_REVEAL_DELAY_MS + SHELL_PANEL_REVEAL_DURATION_MS
}
