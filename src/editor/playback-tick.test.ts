import { describe, expect, it } from 'vitest'

import {
  advancePlaybackTime,
  clampPlaybackDelta,
  shouldSyncPlaybackUi,
} from '@/editor/playback-tick'

describe('playback-tick', () => {
  it('clamps large frame deltas', () => {
    expect(clampPlaybackDelta(0.25)).toBe(0.05)
    expect(clampPlaybackDelta(0.01)).toBe(0.01)
  })

  it('loops playback inside the region', () => {
    expect(
      advancePlaybackTime({
        currentTime: 1.9,
        deltaSeconds: 0.2,
        loop: true,
        loopIn: 0,
        loopOut: 2,
        duration: 2,
      }),
    ).toEqual({ nextTime: 0, finished: false })
  })

  it('finishes at the loop out point when looping is disabled', () => {
    expect(
      advancePlaybackTime({
        currentTime: 1.9,
        deltaSeconds: 0.2,
        loop: false,
        loopIn: 0,
        loopOut: 2,
        duration: 2,
      }),
    ).toEqual({ nextTime: 2, finished: true })
  })

  it('throttles UI sync to roughly 20fps', () => {
    expect(shouldSyncPlaybackUi(0, 40)).toBe(false)
    expect(shouldSyncPlaybackUi(0, 50)).toBe(true)
  })
})
