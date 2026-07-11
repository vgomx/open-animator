// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { balloonSvg, getBalloonProject, getBalloonSvgImport } from '@/io/fixtures/balloon-fixture'
import { parseSvgGradients } from '@/io/svg-gradients'
import { buildAnimatedMaskDefs, parseSvgMasks } from '@/io/svg-masks'

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

  it('builds time-varying local-space masks for animated balloon layers', () => {
    const project = getBalloonProject()
    const sourceMasks = project.importedSvg?.masks ?? {}
    const maskedLayers = project.layers.filter((layer) => layer.svgMaskId)

    expect(maskedLayers.length).toBeGreaterThan(0)

    const animatedLayer = project.layers.find((entry) => {
      const shape0 = getAnimatedShape(entry, 0)
      const shape6 = getAnimatedShape(entry, 6)
      if (shape0.type !== 'path' || shape6.type !== 'path') {
        return false
      }
      if (!shape0.transformMatrix || !shape6.transformMatrix) {
        return false
      }

      return (
        Math.abs(shape0.transformMatrix.e - shape6.transformMatrix.e) > 0.5 ||
        Math.abs(shape0.transformMatrix.f - shape6.transformMatrix.f) > 0.5
      )
    })

    expect(animatedLayer).toBeTruthy()

    const maskedAnimatedLayer = {
      ...animatedLayer!,
      svgMaskId: maskedLayers[0]!.svgMaskId,
      id: 'masked-animated-test-layer',
      visible: true,
    }

    const masks0 = buildAnimatedMaskDefs(sourceMasks, [maskedAnimatedLayer], 0, getAnimatedShape)
    const masks6 = buildAnimatedMaskDefs(sourceMasks, [maskedAnimatedLayer], 6, getAnimatedShape)

    const localId = `${maskedAnimatedLayer.svgMaskId}__${maskedAnimatedLayer.id}`
    const markup0 = masks0[localId]?.markup ?? ''
    const markup6 = masks6[localId]?.markup ?? ''

    expect(markup0).toContain('transform="matrix(')
    expect(markup6).toContain('transform="matrix(')
    expect(markup0).not.toBe(markup6)
  })
})
