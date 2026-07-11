import { describe, expect, it } from 'vitest'

import { clampZoom, wheelZoomFactor, zoomAtPoint } from '@/editor/viewport'

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
})
