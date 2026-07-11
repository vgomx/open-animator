import { describe, expect, it } from 'vitest'

import {
  getFrameStep,
  getRulerTicks,
  snapTimelineTime,
  timeToPercent,
} from '@/editor/timeline-utils'

describe('timeline-utils', () => {
  it('converts time to percent', () => {
    expect(timeToPercent(1.5, 3)).toBe(50)
  })

  it('snaps to frame boundaries when enabled', () => {
    const snapped = snapTimelineTime(0.51, {
      duration: 3,
      fps: 30,
      snapEnabled: true,
      frameSnap: true,
      markers: [],
      states: [],
      keyframeTimes: [],
    })

    expect(snapped).toBeCloseTo(0.5, 5)
  })

  it('does not snap when shift disables frame snap', () => {
    const snapped = snapTimelineTime(0.51, {
      duration: 3,
      fps: 30,
      snapEnabled: true,
      frameSnap: false,
      markers: [],
      states: [],
      keyframeTimes: [],
    })

    expect(snapped).toBe(0.51)
  })

  it('snaps to markers and playhead', () => {
    const snapped = snapTimelineTime(0.98, {
      duration: 3,
      fps: 30,
      snapEnabled: true,
      frameSnap: true,
      markers: [{ time: 1 }],
      states: [],
      keyframeTimes: [],
      playheadTime: 1,
    })

    expect(snapped).toBe(1)
  })

  it('generates readable ruler ticks', () => {
    expect(getRulerTicks(3)).toContain(0)
    expect(getRulerTicks(3).at(-1)).toBe(3)
  })

  it('uses a 30fps frame step', () => {
    expect(getFrameStep(30)).toBeCloseTo(1 / 30, 5)
  })
})
