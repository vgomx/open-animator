import { describe, expect, it } from 'vitest'

import {
  clampZoom,
  MAX_WHEEL_ZOOM_DELTA_PX,
  normalizeWheelDelta,
  wheelZoomFactor,
  wheelZoomFactorFromPixels,
  zoomAtPoint,
} from '@/editor/viewport'

describe('viewport', () => {
  it('clamps zoom to supported range', () => {
    expect(clampZoom(0.1)).toBe(0.25)
    expect(clampZoom(5)).toBe(3)
    expect(clampZoom(1)).toBe(1)
  })

  it('keeps the cursor anchor fixed while zooming', () => {
    const before = {
      zoom: 1,
      panX: 0,
      panY: 0,
      factor: 2,
      pointX: 600,
      pointY: 400,
      viewportWidth: 800,
      viewportHeight: 600,
    }

    const after = zoomAtPoint(before)
    const centerX = before.viewportWidth / 2
    const centerY = before.viewportHeight / 2
    const artboardX = (before.pointX - centerX - before.panX) / before.zoom
    const artboardY = (before.pointY - centerY - before.panY) / before.zoom

    const screenX = centerX + after.panX + artboardX * after.zoom
    const screenY = centerY + after.panY + artboardY * after.zoom

    expect(screenX).toBeCloseTo(before.pointX)
    expect(screenY).toBeCloseTo(before.pointY)
  })

  it('returns a factor below 1 for positive wheel delta', () => {
    expect(wheelZoomFactor(100)).toBeLessThan(1)
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1)
  })

  it('normalizes line and page wheel deltas to pixel scale', () => {
    expect(wheelZoomFactor(10)).toBeCloseTo(Math.exp(-0.1), 5)
    expect(wheelZoomFactor(1, 1)).toBeCloseTo(Math.exp(-0.16), 5)
    expect(wheelZoomFactor(1, 2)).toBeCloseTo(Math.exp(-1.2), 5)
  })

  it('clamps large pinch deltas to keep zoom smooth across browsers', () => {
    const clamped = wheelZoomFactor(500)
    const capped = wheelZoomFactorFromPixels(MAX_WHEEL_ZOOM_DELTA_PX)
    expect(clamped).toBeCloseTo(capped, 5)
  })

  it('maps shift-wheel horizontal scroll to deltaX', () => {
    expect(normalizeWheelDelta(0, 40, 0, { shiftKey: true })).toEqual({
      deltaX: 40,
      deltaY: 0,
    })
  })

  it('normalizes pan wheel deltas by deltaMode', () => {
    expect(normalizeWheelDelta(2, 0, 1)).toEqual({ deltaX: 32, deltaY: 0 })
  })
})
