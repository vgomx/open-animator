import { describe, expect, it } from 'vitest'

import {
  CANVAS_PLAYBACK_LAYER_THRESHOLD,
  shouldUseCanvasPlayback,
} from '@/editor/canvas-playback'

describe('canvas-playback', () => {
  it('requires playing state and layer threshold', () => {
    expect(shouldUseCanvasPlayback(CANVAS_PLAYBACK_LAYER_THRESHOLD, 'playing')).toBe(true)
    expect(shouldUseCanvasPlayback(CANVAS_PLAYBACK_LAYER_THRESHOLD - 1, 'playing')).toBe(false)
    expect(shouldUseCanvasPlayback(CANVAS_PLAYBACK_LAYER_THRESHOLD, 'paused')).toBe(false)
    expect(shouldUseCanvasPlayback(CANVAS_PLAYBACK_LAYER_THRESHOLD, 'idle')).toBe(false)
  })
})
