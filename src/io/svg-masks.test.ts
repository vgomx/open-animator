// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { balloonSvg, getBalloonSvgImport } from '@/io/fixtures/balloon-fixture'
import { parseSvgMasks } from '@/io/svg-masks'
import { parseSvgGradients } from '@/io/svg-gradients'

describe('svg mask import', () => {
  it('imports balloon masks and assigns them to layers', () => {
    const doc = new DOMParser().parseFromString(balloonSvg, 'image/svg+xml')
    const svg = doc.querySelector('svg')!
    const gradients = parseSvgGradients(svg)
    const masks = parseSvgMasks(svg, gradients)
    const imported = getBalloonSvgImport()

    expect(Object.keys(masks).length).toBe(53)
    expect(Object.keys(imported.masks).length).toBe(53)

    const maskedLayers = imported.layers.filter((layer) => layer.svgMaskId)
    expect(maskedLayers.length).toBe(53)
  })
})
