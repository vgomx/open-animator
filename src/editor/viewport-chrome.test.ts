import { describe, expect, it } from 'vitest'

import {
  LAYERS_PANEL_WIDTH,
  PROPERTIES_PANEL_WIDTH,
  RULER_Y_SIZE,
} from '@/editor/layout-constants'
import { getCanvasChromeInsets } from '@/editor/viewport-chrome'

describe('viewport-chrome', () => {
  it('includes panel and ruler insets when visible', () => {
    expect(getCanvasChromeInsets(true)).toEqual({
      left: LAYERS_PANEL_WIDTH + RULER_Y_SIZE,
      top: 24,
      right: PROPERTIES_PANEL_WIDTH,
    })
  })

  it('collapses insets when panels are hidden', () => {
    expect(
      getCanvasChromeInsets(false, {
        showLayersPanel: false,
        showPropertiesPanel: false,
      }),
    ).toEqual({
      left: 0,
      top: 0,
      right: 0,
    })
  })
})
