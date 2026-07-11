import { describe, expect, it, vi } from 'vitest'

import { createViewportController, formatViewportTransform } from '@/editor/viewport-controller'

describe('viewport-controller', () => {
  it('formats transforms with translate3d for compositor promotion', () => {
    expect(formatViewportTransform({ zoom: 1.5, panX: 12, panY: -4 })).toBe(
      'translate3d(12px, -4px, 0) scale(1.5)',
    )
  })

  it('coalesces multiple zoom updates into one store write per frame', () => {
    vi.stubGlobal('window', {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
      cancelAnimationFrame: () => {},
    })

    const writes: Array<{ zoom: number; panX: number; panY: number }> = []
    const controller = createViewportController({
      getStoreState: () => ({ zoom: 1, panX: 0, panY: 0 }),
      setStoreState: (state) => writes.push(state),
    })

    controller.zoomAtPoint(2, 400, 300, 800, 600)
    controller.zoomAtPoint(1.5, 400, 300, 800, 600)

    expect(writes).toHaveLength(1)
    expect(writes[0]?.zoom).toBeGreaterThan(1)

    vi.unstubAllGlobals()
  })

  it('coalesces multiple transform applies into one frame', () => {
    const rafCallbacks: FrameRequestCallback[] = []
    vi.stubGlobal('window', {
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        rafCallbacks.push(callback)
        return rafCallbacks.length
      },
      cancelAnimationFrame: () => {},
    })

    const element = {
      style: {} as CSSStyleDeclaration,
    } as HTMLElement
    const controller = createViewportController({
      getStoreState: () => ({ zoom: 1, panX: 0, panY: 0 }),
      setStoreState: () => {},
    })
    controller.bindTransformElement(element)

    controller.panBy(10, 0)
    controller.panBy(5, 0)
    expect(element.style.transform).toBe('translate3d(0px, 0px, 0) scale(1)')

    rafCallbacks.shift()?.(0)
    expect(element.style.transform).toBe('translate3d(-15px, 0px, 0) scale(1)')

    vi.unstubAllGlobals()
  })
})
