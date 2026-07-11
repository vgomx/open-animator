import { describe, expect, it } from 'vitest'

import { resolvePaintValue, type ImportedLinearGradient } from '@/io/svg-gradients'

describe('svg-gradients', () => {
  it('resolves quoted gradient url references', () => {
    const gradients: Record<string, ImportedLinearGradient> = {
      'eaf-b98f-2': {
        kind: 'linear',
        id: 'eaf-b98f-2',
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
        stops: [{ offset: 0, color: '#000000' }],
      },
    }

    expect(resolvePaintValue("url('#eaf-b98f-2')", '#ffffff', gradients)).toBe(
      'url(#imported-grad-eaf-b98f-2)',
    )
  })
})
