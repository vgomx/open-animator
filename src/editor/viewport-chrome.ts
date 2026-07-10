import {
  LAYERS_PANEL_WIDTH,
  PROPERTIES_PANEL_WIDTH,
  RULER_X_SIZE,
  RULER_Y_SIZE,
} from './layout-constants'

export type ChromePanelState = {
  showLayersPanel?: boolean
  showPropertiesPanel?: boolean
}

export type CanvasChromeInsets = {
  left: number
  top: number
  right: number
}

export function getCanvasChromeInsets(
  showRulers: boolean,
  panels: ChromePanelState = {},
): CanvasChromeInsets {
  const showLayersPanel = panels.showLayersPanel ?? true
  const showPropertiesPanel = panels.showPropertiesPanel ?? true
  const rulerY = showRulers ? RULER_Y_SIZE : 0
  const rulerX = showRulers ? RULER_X_SIZE : 0

  return {
    left: (showLayersPanel ? LAYERS_PANEL_WIDTH : 0) + rulerY,
    top: rulerX,
    right: showPropertiesPanel ? PROPERTIES_PANEL_WIDTH : 0,
  }
}

export function getViewportPoint(
  viewport: HTMLElement,
  clientX: number,
  clientY: number,
): { x: number; y: number; width: number; height: number } {
  const rect = viewport.getBoundingClientRect()

  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    width: rect.width,
    height: rect.height,
  }
}

export {
  LAYERS_PANEL_WIDTH,
  PROPERTIES_PANEL_WIDTH,
  RULER_X_SIZE,
  RULER_Y_SIZE,
  RULER_SIZE,
} from './layout-constants'
