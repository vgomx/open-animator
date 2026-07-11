export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3

export function clampZoom(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(zoom, MAX_ZOOM))
}

export function computeFitZoom(
  artboardWidth: number,
  artboardHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 80,
): number {
  return clampZoom(
    Math.min(
      (viewportWidth - padding) / artboardWidth,
      (viewportHeight - padding) / artboardHeight,
      MAX_ZOOM,
    ),
  )
}

export function zoomAtPoint(params: {
  zoom: number
  panX: number
  panY: number
  factor: number
  pointX: number
  pointY: number
  viewportWidth: number
  viewportHeight: number
}): { zoom: number; panX: number; panY: number } {
  const nextZoom = clampZoom(params.zoom * params.factor)
  const scaleRatio = nextZoom / params.zoom
  const centerX = params.viewportWidth / 2
  const centerY = params.viewportHeight / 2
  const offsetX = params.pointX - centerX
  const offsetY = params.pointY - centerY

  return {
    zoom: nextZoom,
    panX: offsetX - (offsetX - params.panX) * scaleRatio,
    panY: offsetY - (offsetY - params.panY) * scaleRatio,
  }
}

export const DOM_DELTA_PIXEL = 0
export const DOM_DELTA_LINE = 1
export const DOM_DELTA_PAGE = 2

/** Caps per-event pinch delta to avoid jumpy zoom from large wheel ticks (common in Safari). */
export const MAX_WHEEL_ZOOM_DELTA_PX = 24

export type NormalizeWheelDeltaOptions = {
  shiftKey?: boolean
  clampZoomDelta?: boolean
}

export function normalizeWheelDelta(
  deltaX: number,
  deltaY: number,
  deltaMode: number = DOM_DELTA_PIXEL,
  options: NormalizeWheelDeltaOptions = {},
): { deltaX: number; deltaY: number } {
  let dx = deltaX
  let dy = deltaY

  if (dx === 0 && options.shiftKey && dy !== 0) {
    dx = dy
    dy = 0
  }

  const scale =
    deltaMode === DOM_DELTA_LINE ? 16 : deltaMode === DOM_DELTA_PAGE ? 120 : 1
  dx *= scale
  dy *= scale

  if (options.clampZoomDelta && dy !== 0 && deltaMode === DOM_DELTA_PIXEL) {
    dy = Math.sign(dy) * Math.min(MAX_WHEEL_ZOOM_DELTA_PX, Math.abs(dy))
  }

  return { deltaX: dx, deltaY: dy }
}

export function wheelZoomFactorFromPixels(deltaY: number): number {
  return Math.exp(-deltaY * 0.01)
}

export function wheelZoomFactor(deltaY: number, deltaMode: number = DOM_DELTA_PIXEL): number {
  const { deltaY: normalizedDeltaY } = normalizeWheelDelta(0, deltaY, deltaMode, {
    clampZoomDelta: true,
  })
  return wheelZoomFactorFromPixels(normalizedDeltaY)
}
