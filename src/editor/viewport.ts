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

const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2

export function wheelZoomFactor(deltaY: number, deltaMode: number = DOM_DELTA_PIXEL): number {
  const scale =
    deltaMode === DOM_DELTA_LINE
      ? 16
      : deltaMode === DOM_DELTA_PAGE
        ? 120
        : 1

  const normalizedDelta = deltaY * scale
  return Math.exp(-normalizedDelta * 0.0025)
}
