import { describe, expect, it } from 'vitest'

import { resolveExportScale } from '@/io/export-options'

describe('resolveExportScale', () => {
  it('uses manual scale for custom preset', () => {
    expect(
      resolveExportScale({ width: 800, height: 600 }, { fps: 30, scale: 2, background: 'solid', backgroundColor: '#000', sizePreset: 'custom' }),
    ).toBe(2)
  })

  it('fits artboard into instagram preset dimensions', () => {
    const scale = resolveExportScale(
      { width: 800, height: 600 },
      { fps: 30, scale: 1, background: 'solid', backgroundColor: '#000', sizePreset: 'instagram' },
    )

    expect(scale).toBeCloseTo(1.35)
  })
})
