import type { PlaybackState } from '@/editor/types'

/** Auto-enable canvas playback when visible layer count reaches this threshold. */
export const CANVAS_PLAYBACK_LAYER_THRESHOLD = 60

export function shouldUseCanvasPlayback(
  visibleLayerCount: number,
  playbackState: PlaybackState,
): boolean {
  return playbackState === 'playing' && visibleLayerCount >= CANVAS_PLAYBACK_LAYER_THRESHOLD
}
