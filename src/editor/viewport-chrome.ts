import { LAYERS_PANEL_WIDTH, RULER_X_SIZE, RULER_Y_SIZE } from './layout-constants'

export function getCanvasChromeInsets(showRulers: boolean) {
  const rulerY = showRulers ? RULER_Y_SIZE : 0
  const rulerX = showRulers ? RULER_X_SIZE : 0

  return {
    left: LAYERS_PANEL_WIDTH + rulerY,
    top: rulerX,
  }
}

export { LAYERS_PANEL_WIDTH, RULER_X_SIZE, RULER_Y_SIZE, RULER_SIZE } from './layout-constants'
