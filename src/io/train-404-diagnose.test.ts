// @vitest-environment jsdom
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import { importHtmlAnimation } from '@/io/html-import'

const TRAIN_HTML_PATH = '/Users/vitorgomes/Downloads/train-404-bg.html'

describe('train-404-bg.html import', () => {
  it('keeps pantograph connectors visible and spins wheels around their centers', () => {
    const html = readFileSync(TRAIN_HTML_PATH, 'utf8')
    const imported = importHtmlAnimation(html)
    const staticOnly = importHtmlAnimation(html.replace(/<style>[\s\S]*<\/style>/, ''))

    expect(imported).not.toBeNull()
    expect(staticOnly).not.toBeNull()
    expect(imported!.layers.length).toBe(staticOnly!.layers.length)

    const pantographRect = imported!.layers.find(
      (layer) =>
        layer.shape.type === 'rect' &&
        Math.abs(layer.shape.x - 846) < 1 &&
        Math.abs(layer.shape.y - 238) < 1,
    )
    expect(pantographRect).toBeDefined()

    const pantographConnector = imported!.layers.find((layer) => {
      if (layer.shape.type !== 'path') {
        return false
      }

      const [start, end] = layer.shape.points
      if (!start || !end) {
        return false
      }

      const worldStart = {
        x: layer.shape.x + start.x,
        y: layer.shape.y + start.y,
      }
      const worldEnd = {
        x: layer.shape.x + end.x,
        y: layer.shape.y + end.y,
      }

      return (
        Math.abs(worldStart.x - 838) < 2 &&
        Math.abs(worldStart.y - 202) < 2 &&
        Math.abs(worldEnd.x - 896) < 2 &&
        Math.abs(worldEnd.y - 168) < 2
      )
    })
    expect(pantographConnector).toBeDefined()

    const connectorAt0 = getAnimatedShape(pantographConnector!, 0)
    expect(connectorAt0.x).toBeCloseTo(pantographConnector!.shape.x, 1)
    expect(connectorAt0.y).toBeCloseTo(pantographConnector!.shape.y, 1)

    const connectorBounds = getShapeBounds(connectorAt0)
    expect(connectorBounds.x).toBeCloseTo(838, 1)
    expect(connectorBounds.y).toBeCloseTo(168, 1)

    const wheel = imported!.layers.find(
      (layer) =>
        layer.shape.type === 'ellipse' &&
        Math.abs(layer.shape.x - 226) < 1 &&
        Math.abs(layer.shape.y - 382) < 1,
    )
    expect(wheel).toBeDefined()
    expect(wheel!.keyframes.some((keyframe) => keyframe.property === 'rotation')).toBe(true)

    const wheelXValues = wheel!.keyframes
      .filter((keyframe) => keyframe.property === 'x')
      .map((keyframe) => keyframe.value as number)
    const wheelYValues = wheel!.keyframes
      .filter((keyframe) => keyframe.property === 'y')
      .map((keyframe) => keyframe.value as number)

    if (wheelXValues.length > 0) {
      expect(Math.max(...wheelXValues) - Math.min(...wheelXValues)).toBeLessThan(4)
    }
    if (wheelYValues.length > 0) {
      expect(Math.max(...wheelYValues) - Math.min(...wheelYValues)).toBeLessThan(6)
    }

    const wheelAt0 = getAnimatedShape(wheel!, 0)
    const wheelAtQuarter = getAnimatedShape(wheel!, 0.2875)
    expect(wheelAt0.x).toBeCloseTo(226, 1)
    expect(wheelAt0.y).toBeCloseTo(382, 1)
    expect(Math.abs(wheelAtQuarter.x - 226)).toBeLessThan(1)
    expect(Math.abs(wheelAtQuarter.y - 382)).toBeLessThan(1)
    expect(wheelAtQuarter.rotation).toBeCloseTo(90, 0)
  })
})
