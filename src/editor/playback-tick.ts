import type { PlaybackState } from '@/editor/types'

/** Cap wall-clock spikes so background-tab wakeups do not jump the playhead. */
export const PLAYBACK_MAX_DELTA_SECONDS = 0.05

/** UI store sync rate — keeps timeline/playhead updated without 60 React commits/sec. */
export const PLAYBACK_UI_SYNC_FPS = 20

export function clampPlaybackDelta(deltaSeconds: number): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return 0
  }

  return Math.min(deltaSeconds, PLAYBACK_MAX_DELTA_SECONDS)
}

export function shouldSyncPlaybackUi(lastSyncTimestamp: number, now: number): boolean {
  return now - lastSyncTimestamp >= 1000 / PLAYBACK_UI_SYNC_FPS
}

export function advancePlaybackTime(params: {
  currentTime: number
  deltaSeconds: number
  loop: boolean
  loopIn: number
  loopOut: number
  duration: number
}): { nextTime: number; finished: boolean } {
  const regionEnd = params.loopOut ?? params.duration
  const regionStart = params.loopIn ?? 0
  let nextTime = params.currentTime + params.deltaSeconds

  if (nextTime < regionEnd) {
    return { nextTime, finished: false }
  }

  if (params.loop) {
    return { nextTime: regionStart, finished: false }
  }

  return { nextTime: regionEnd, finished: true }
}

export function isPlaybackRunning(state: PlaybackState): boolean {
  return state === 'playing'
}
