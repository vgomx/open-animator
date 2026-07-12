// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { getAnimatedShape } from '@/editor/animation'
import { getShapeBounds } from '@/editor/bounds'
import { importHtmlAnimation } from '@/io/html-import'

const TRAIN_HTML_FIXTURE = `<!DOCTYPE html><html><head><style>
  :root { --t-bob: 3s; --t-jitter: 0.17s; --t-spin: 1.15s; }
  .vg-train {
    transform-box: fill-box; transform-origin: center bottom;
    animation: vgbob var(--t-bob) ease-in-out infinite;
  }
  .vg-jitter {
    transform-box: fill-box; transform-origin: center bottom;
    animation: vgjitter var(--t-jitter) steps(2,jump-none) infinite alternate;
  }
  .vg-wheel {
    transform-box: fill-box; transform-origin: center;
    animation: vgspin var(--t-spin) linear infinite;
  }
  @keyframes vgbob {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    30% { transform: translateY(-3px) rotate(-0.22deg); }
  }
  @keyframes vgjitter {
    from { transform: translateY(0); }
    to { transform: translateY(0.7px); }
  }
  @keyframes vgspin { to { transform: rotate(360deg); } }
</style></head><body>
  <svg viewBox="0 0 1200 470" xmlns="http://www.w3.org/2000/svg">
    <g class="vg-train">
      <g class="vg-jitter">
        <path d="M430 248 L196 248 C160 250 136 296 128 346 C126 360 134 372 152 372 L430 372 Z" fill="#fafafa" stroke="#141416" stroke-width="3"/>
        <rect x="442" y="248" width="316" height="124" rx="10" fill="#fafafa" stroke="#141416" stroke-width="3"/>
        <path d="M770 248 L1004 248 C1040 250 1064 296 1072 346 C1074 360 1066 372 1048 372 L770 372 Z" fill="#fafafa" stroke="#141416" stroke-width="3"/>
        <g fill="#fafafa" stroke="#141416" stroke-width="2.2">
          <g class="vg-wheel">
            <circle cx="226" cy="382" r="18"/>
            <circle cx="226" cy="382" r="10.5" fill="none" stroke-width="1.5"/>
            <line x1="226" y1="364" x2="226" y2="400" stroke-width="1.3"/>
            <line x1="208" y1="382" x2="244" y2="382" stroke-width="1.3"/>
          </g>
        </g>
        <g fill="none" stroke="#141416" stroke-width="2.2">
          <rect x="846" y="238" width="26" height="8" rx="2" fill="#fafafa"/>
          <line x1="838" y1="202" x2="896" y2="168"/>
        </g>
      </g>
    </g>
  </svg>
</body></html>`

describe('train-404-bg.html import', () => {
  it('keeps pantograph connectors visible and spins wheels around their centers', () => {
    const html = TRAIN_HTML_FIXTURE
    const imported = importHtmlAnimation(html)
    const context = { layerGroups: imported!.layerGroups }
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

    const connectorAt0 = getAnimatedShape(pantographConnector!, 0, context)
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
    const wheelGroup = Object.values(imported!.layerGroups ?? {}).find((group) =>
      group.classNames?.includes('vg-wheel'),
    )
    const hasWheelRotation =
      wheel!.keyframes.some((keyframe) => keyframe.property === 'rotation') ||
      Boolean(wheelGroup?.keyframes?.some((keyframe) => keyframe.property === 'rotation'))
    expect(hasWheelRotation).toBe(true)

    const wheelXValues = [
      ...wheel!.keyframes.filter((keyframe) => keyframe.property === 'x').map((keyframe) => keyframe.value as number),
      ...[0, 0.5, 1].map((time) => getAnimatedShape(wheel!, time, context).x),
    ]
    const wheelYValues = [
      ...wheel!.keyframes.filter((keyframe) => keyframe.property === 'y').map((keyframe) => keyframe.value as number),
      ...[0, 0.5, 1].map((time) => getAnimatedShape(wheel!, time, context).y),
    ]

    if (wheelXValues.length > 0) {
      expect(Math.max(...wheelXValues) - Math.min(...wheelXValues)).toBeLessThan(4)
    }
    if (wheelYValues.length > 0) {
      expect(Math.max(...wheelYValues) - Math.min(...wheelYValues)).toBeLessThan(6)
    }

    const wheelAt0 = getAnimatedShape(wheel!, 0, context)
    const wheelAtQuarter = getAnimatedShape(wheel!, 0.2875, context)
    expect(wheelAt0.x).toBeCloseTo(226, 1)
    expect(wheelAt0.y).toBeCloseTo(382, 1)
    expect(Math.abs(wheelAtQuarter.x - 226)).toBeLessThan(1)
    expect(Math.abs(wheelAtQuarter.y - 382)).toBeLessThan(1)
    expect(wheelAtQuarter.rotation).toBeCloseTo(90, 0)

    const carPaths = imported!.layers.filter(
      (layer) =>
        layer.shape.type === 'path' &&
        layer.shape.fill === '#fafafa' &&
        layer.shape.stroke === '#141416',
    )
    const middleCar = imported!.layers.find(
      (layer) =>
        layer.shape.type === 'rect' &&
        Math.abs(layer.shape.x - 442) < 1 &&
        Math.abs(layer.shape.y - 248) < 1,
    )

    expect(carPaths.length).toBeGreaterThanOrEqual(2)
    expect(carPaths.every((layer) => layer.keyframes.length === 0 || layer.keyframes.some((kf) => kf.property === 'y'))).toBe(
      true,
    )
    expect(
      middleCar?.keyframes.length === 0 ||
        middleCar?.keyframes.some((kf) => kf.property === 'y'),
    ).toBe(true)

    const animatedY = (layer: typeof middleCar, time: number) =>
      getAnimatedShape(layer!, time, context).y

    const yRanges = [...carPaths, middleCar!].map((layer) => {
      const values = [0, 0.5, 1, 1.5, 2, 2.5, 3].map((time) => animatedY(layer, time))
      return Math.max(...values) - Math.min(...values)
    })

    expect(yRanges.every((range) => range > 0.2)).toBe(true)

    const jitterDelta = (layer: typeof middleCar) => {
      const atZero = getAnimatedShape(layer!, 0, context).y
      const atStep = getAnimatedShape(layer!, 0.085, context).y
      return atStep - atZero
    }

    const middleJitter = jitterDelta(middleCar)
    expect(carPaths.every((layer) => Math.abs(jitterDelta(layer) - middleJitter) < 0.05)).toBe(
      true,
    )
    expect(carPaths.every((layer) => Math.abs(jitterDelta(layer) - middleJitter) < 0.05)).toBe(
      true,
    )
    expect(
      getAnimatedShape(carPaths[0]!, 0.9, context).rotation -
        getAnimatedShape(carPaths[0]!, 0, context).rotation,
    ).not.toBeCloseTo(0, 1)

    const wheelSpoke = imported!.layers.find(
      (layer) =>
        layer.shape.type === 'path' &&
        layer.shape.stroke === '#141416' &&
        layer.shape.points.length === 2,
    )
    expect(wheelSpoke).toBeDefined()
    const spokeBoundsAtQuarter = getShapeBounds(getAnimatedShape(wheelSpoke!, 0.2875, context))
    expect(spokeBoundsAtQuarter.x + spokeBoundsAtQuarter.width / 2).toBeCloseTo(226, 0)
    expect(spokeBoundsAtQuarter.y + spokeBoundsAtQuarter.height / 2).toBeCloseTo(381.39, 0)
  })
})
