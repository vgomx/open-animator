import { zoomAtPoint as computeZoomAtPoint } from '@/editor/viewport'

export type ViewportState = {
  zoom: number
  panX: number
  panY: number
}

export function formatViewportTransform({ panX, panY, zoom }: ViewportState): string {
  return `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`
}

type ViewportControllerOptions = {
  getStoreState: () => ViewportState
  setStoreState: (state: ViewportState) => void
}

export type ViewportController = {
  zoomAtPoint: (
    factor: number,
    pointX: number,
    pointY: number,
    viewportWidth: number,
    viewportHeight: number,
  ) => void
  panBy: (deltaX: number, deltaY: number) => void
  setPan: (panX: number, panY: number) => void
  syncFromStore: () => void
  flushNow: () => void
  bindTransformElement: (element: HTMLElement | null) => void
  getLiveState: () => ViewportState
  subscribe: (listener: (state: ViewportState) => void) => () => void
}

export function createViewportController(options: ViewportControllerOptions): ViewportController {
  let liveState = options.getStoreState()
  let flushedState = { ...liveState }
  let transformElement: HTMLElement | null = null
  let flushFrameId: number | null = null
  let applyFrameId: number | null = null
  const listeners = new Set<(state: ViewportState) => void>()

  const notify = () => {
    for (const listener of listeners) {
      listener(liveState)
    }
  }

  const applyTransformNow = () => {
    if (transformElement) {
      transformElement.style.transform = formatViewportTransform(liveState)
    }
    if (listeners.size > 0) {
      notify()
    }
  }

  const scheduleApplyTransform = () => {
    if (applyFrameId !== null) {
      return
    }

    applyFrameId = window.requestAnimationFrame(() => {
      applyFrameId = null
      applyTransformNow()
    })
  }

  const scheduleFlush = () => {
    if (flushFrameId !== null) {
      return
    }

    flushFrameId = window.requestAnimationFrame(() => {
      flushFrameId = null
      if (
        liveState.zoom === flushedState.zoom &&
        liveState.panX === flushedState.panX &&
        liveState.panY === flushedState.panY
      ) {
        return
      }

      flushedState = { ...liveState }
      options.setStoreState(liveState)
    })
  }

  const flushNow = () => {
    if (flushFrameId !== null) {
      window.cancelAnimationFrame(flushFrameId)
      flushFrameId = null
    }

    if (applyFrameId !== null) {
      window.cancelAnimationFrame(applyFrameId)
      applyFrameId = null
    }
    applyTransformNow()

    if (
      liveState.zoom === flushedState.zoom &&
      liveState.panX === flushedState.panX &&
      liveState.panY === flushedState.panY
    ) {
      return
    }

    flushedState = { ...liveState }
    options.setStoreState(liveState)
  }

  return {
    zoomAtPoint(factor, pointX, pointY, viewportWidth, viewportHeight) {
      liveState = computeZoomAtPoint({
        ...liveState,
        factor,
        pointX,
        pointY,
        viewportWidth,
        viewportHeight,
      })
      scheduleApplyTransform()
      scheduleFlush()
    },

    panBy(deltaX, deltaY) {
      liveState = {
        ...liveState,
        panX: liveState.panX - deltaX,
        panY: liveState.panY - deltaY,
      }
      scheduleApplyTransform()
      scheduleFlush()
    },

    setPan(panX, panY) {
      liveState = { ...liveState, panX, panY }
      scheduleApplyTransform()
      scheduleFlush()
    },

    syncFromStore() {
      const storeState = options.getStoreState()
      if (
        storeState.zoom === liveState.zoom &&
        storeState.panX === liveState.panX &&
        storeState.panY === liveState.panY
      ) {
        return
      }

      liveState = { ...storeState }
      flushedState = { ...storeState }
      applyTransformNow()
    },

    flushNow,

    bindTransformElement(element) {
      transformElement = element
      if (transformElement) {
        transformElement.style.transformOrigin = 'center center'
        transformElement.style.willChange = 'transform'
        transformElement.style.backfaceVisibility = 'hidden'
        applyTransformNow()
      }
    },

    getLiveState() {
      return liveState
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
