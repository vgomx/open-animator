// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { exportAnimatedHtml } from '@/io/embed-export'
import { exportAnimatedSvg } from '@/io/svg-export'
import {
  applyCssTransformToShape,
  importHtmlAnimation,
  isJavaScriptBundlerHtml,
  parseCssKeyframeTracks,
  readHtmlImportFromFile,
} from '@/io/html-import'
import { createDefaultProject, createLayerFromShape, createRectShape } from '@/editor/scene'
import { createArtboard } from '@/editor/types'
import { DEFAULT_EXPORT_OPTIONS } from '@/io/export-options'

describe('html import', () => {
  it('parses css keyframe tracks and durations', () => {
    const css = `
      @keyframes layer-anim-0 {
        0% { transform: translate(10px, 20px) rotate(0deg) scale(1); opacity: 1; }
        100% { transform: translate(120px, 80px) rotate(45deg) scale(1.2); opacity: 0.5; }
      }
      .layer-anim-0 { animation: layer-anim-0 2.5s linear infinite; }
    `

    const tracks = parseCssKeyframeTracks(css)
    const track = tracks.get('layer-anim-0')

    expect(track).toBeDefined()
    expect(track?.duration).toBe(2.5)
    expect(track?.steps).toHaveLength(2)
    expect(track?.steps[1]?.transform).toContain('120px')
  })

  it('maps css transforms onto rect shapes', () => {
    const shape = createRectShape(0, 0, 100, 50)
    const next = applyCssTransformToShape(
      shape,
      'translate(150px, 125px) rotate(15deg) scale(1.1) translate(-50px, -25px)',
    )

    expect(next.x).toBe(100)
    expect(next.y).toBe(100)
    expect(next.rotation).toBe(15)
    expect(next.scaleX).toBe(1.1)
    expect(next.scaleY).toBe(1.1)
  })

  it('parses duration from exported animated svg css', () => {
    const artboard = createArtboard({ width: 400, height: 300 })
    const project = {
      ...createDefaultProject(),
      artboards: [artboard],
      duration: 2,
      loopOut: 2,
      layers: [
        createLayerFromShape(createRectShape(40, 40, 120, 80), 0, artboard.id, 'Box'),
      ],
    }

    project.layers[0]!.keyframes = [
      {
        id: 'kf-1',
        time: 0,
        property: 'x',
        value: 40,
        easing: 'linear',
      },
      {
        id: 'kf-2',
        time: 2,
        property: 'x',
        value: 220,
        easing: 'linear',
      },
    ]

    const svg = exportAnimatedSvg(project, DEFAULT_EXPORT_OPTIONS)
    const tracks = parseCssKeyframeTracks(svg)

    expect(tracks.get('layer-anim-0')?.duration).toBe(2)
  })

  it('imports animated html exported by the app', () => {
    const artboard = createArtboard({ width: 400, height: 300 })
    const project = {
      ...createDefaultProject(),
      artboards: [artboard],
      duration: 2,
      loopOut: 2,
      layers: [
        createLayerFromShape(createRectShape(40, 40, 120, 80), 0, artboard.id, 'Box'),
      ],
    }

    project.layers[0]!.keyframes = [
      {
        id: 'kf-1',
        time: 0,
        property: 'x',
        value: 40,
        easing: 'linear',
      },
      {
        id: 'kf-2',
        time: 2,
        property: 'x',
        value: 220,
        easing: 'linear',
      },
    ]

    const html = exportAnimatedHtml(project, DEFAULT_EXPORT_OPTIONS)
    const imported = importHtmlAnimation(html)

    expect(imported).not.toBeNull()
    expect(imported?.layers.some((layer) => layer.keyframes.some((keyframe) => keyframe.property === 'x'))).toBe(true)
    expect(imported?.duration).toBe(2)
  })

  it('falls back to static svg import when no css animation is present', () => {
    const html = `<!DOCTYPE html><html><body>
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="18" width="40" height="30" fill="#ff0000" />
      </svg>
    </body></html>`

    const imported = importHtmlAnimation(html)

    expect(imported).not.toBeNull()
    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers[0]?.shape.type).toBe('rect')
  })

  it('detects javascript bundler html exports', () => {
    const bundler = `
      <html><body>
        <div id="__bundler_thumbnail"><svg></svg></div>
        <script type="__bundler/manifest">{}</script>
      </body></html>
    `

    expect(isJavaScriptBundlerHtml(bundler)).toBe(true)
  })

  it('rejects javascript bundler html imports', async () => {
    const file = new File(
      [
        '<html><body><div id="__bundler_thumbnail"><svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg></div><script type="__bundler/manifest">{}</script></body></html>',
      ],
      'hero-globe.html',
      { type: 'text/html' },
    )

    const result = await readHtmlImportFromFile(file)
    expect(result.status).toBe('rejected')
    if (result.status === 'rejected') {
      expect(result.reason).toBe('bundler')
    }
  })

  it('imports animated svg wrapped in html using inline styles', () => {
    const artboard = createArtboard({ width: 300, height: 200 })
    const svg = exportAnimatedSvg(
      {
        ...createDefaultProject(),
        artboards: [artboard],
        duration: 1.5,
        loopOut: 1.5,
        layers: [
          {
            ...createLayerFromShape(createRectShape(0, 0, 80, 60), 0, artboard.id, 'Square'),
            keyframes: [
              {
                id: 'a',
                time: 0,
                property: 'y',
                value: 20,
                easing: 'linear',
              },
              {
                id: 'b',
                time: 1.5,
                property: 'y',
                value: 120,
                easing: 'linear',
              },
            ],
          },
        ],
      },
      DEFAULT_EXPORT_OPTIONS,
    )

    const imported = importHtmlAnimation(`<html><body>${svg}</body></html>`)

    expect(imported).not.toBeNull()
    expect(imported?.duration).toBe(1.5)
    expect(imported?.layers.some((layer) => layer.keyframes.length > 0)).toBe(true)
  })

  it('parses from/to keyframe selectors', () => {
    const css = `
      @keyframes slide {
        from { transform: translateX(0px); }
        to { transform: translateX(-100px); }
      }
      .slide { animation: slide 2s linear infinite; }
    `

    const tracks = parseCssKeyframeTracks(css)
    const track = tracks.get('slide')

    expect(track?.steps).toHaveLength(2)
    expect(track?.steps[0]?.percent).toBe(0)
    expect(track?.steps[1]?.percent).toBe(100)
    expect(track?.steps[1]?.transform).toContain('translateX')
  })

  it('parses combined percent selectors', () => {
    const css = `
      @keyframes bob {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-4px); }
      }
      .bob { animation: bob 1s ease infinite; }
    `

    const tracks = parseCssKeyframeTracks(css)
    const track = tracks.get('bob')

    expect(track?.steps).toHaveLength(3)
    expect(track?.steps.filter((step) => step.percent === 0)).toHaveLength(1)
    expect(track?.steps.filter((step) => step.percent === 100)).toHaveLength(1)
  })

  it('maps animation names to class names and resolves css variable durations', () => {
    const css = `
      :root { --t-scroll: 26s; }
      .vg-world { animation: vgworld var(--t-scroll) linear infinite; }
      @keyframes vgworld {
        from { transform: translateX(0); }
        to { transform: translateX(-1200px); }
      }
    `

    const tracks = parseCssKeyframeTracks(css)
    const track = tracks.get('vgworld')

    expect(track?.duration).toBe(26)
    expect(track?.steps).toHaveLength(2)
  })

  it('applies translateX and translateY as relative offsets', () => {
    const shape = createRectShape(100, 200, 50, 50)
    const moved = applyCssTransformToShape(shape, 'translateX(-30px) translateY(5px)')

    expect(moved.x).toBe(70)
    expect(moved.y).toBe(205)
  })

  it('applies combined translateY and rotate transforms', () => {
    const shape = createRectShape(0, 0, 100, 50)
    const next = applyCssTransformToShape(shape, 'translateY(-3px) rotate(-0.22deg)')

    expect(next.y).toBe(-3)
    expect(next.rotation).toBeCloseTo(-0.22)
  })

  it('imports train-like html with mismatched animation and class names', () => {
    const html = `<!DOCTYPE html><html><head><style>
      :root { --t-world: 26s; --t-bob: 3s; --t-streak: 0.9s; }
      .vg-world { animation: vgworld var(--t-world) linear infinite; }
      .vg-train { animation: vgbob var(--t-bob) ease-in-out infinite; }
      .vg-streak { animation: vgstreak var(--t-streak) ease-in infinite; opacity: 0; }
      @keyframes vgworld { from { transform: translateX(0); } to { transform: translateX(-1200px); } }
      @keyframes vgbob {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        30% { transform: translateY(-3px) rotate(-0.22deg); }
      }
      @keyframes vgstreak {
        0% { transform: translateX(22px); opacity: 0; }
        100% { transform: translateX(-30px); opacity: 0; }
      }
    </style></head><body>
      <svg viewBox="0 0 1200 470" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <g id="T"><rect x="10" y="10" width="40" height="30" fill="#ccc"/></g>
        </defs>
        <g class="vg-world"><use href="#T" x="0"/><use href="#T" x="1200"/></g>
        <g class="vg-train"><rect x="200" y="300" width="400" height="80" fill="#fafafa"/></g>
        <line class="vg-streak" x1="64" y1="286" x2="104" y2="286" stroke="#141416" stroke-width="2"/>
      </svg>
    </body></html>`

    const imported = importHtmlAnimation(html)

    expect(imported).not.toBeNull()
    expect(imported!.layers.length).toBeGreaterThan(0)
    expect(imported?.duration).toBe(26)
    expect(imported?.layers.some((layer) => layer.keyframes.length > 0)).toBe(true)
  })

  it('imports static scenery and preserves inherited group stroke colors', () => {
    const html = `<!DOCTYPE html><html><head><style>
      :root { --t-scroll: 4s; }
      .scenery { animation: scroll var(--t-scroll) linear infinite; }
      @keyframes scroll {
        from { transform: translateX(0); }
        to { transform: translateX(-200px); }
      }
    </style></head><body>
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="180" x2="400" y2="180" stroke="#141416" stroke-width="3"/>
        <g class="scenery" fill="none" stroke="#717177" stroke-width="1.7" opacity="0.9">
          <line x1="10" y1="40" x2="90" y2="40"/>
          <line x1="120" y1="60" x2="200" y2="60"/>
        </g>
      </svg>
    </body></html>`

    const imported = importHtmlAnimation(html)

    expect(imported).not.toBeNull()
    expect(imported!.layers.length).toBeGreaterThanOrEqual(3)

    const animatedLines = imported!.layers.filter(
      (layer) => layer.keyframes.length > 0 && layer.shape.type === 'path',
    )
    expect(animatedLines.length).toBe(2)
    expect(animatedLines.every((layer) => layer.shape.fill === 'none')).toBe(true)
    expect(animatedLines.every((layer) => layer.shape.stroke === '#717177')).toBe(true)

    const track = imported!.layers.find(
      (layer) => layer.keyframes.length === 0 && layer.shape.stroke === '#141416',
    )
    expect(track).toBeDefined()
  })

  it('composes nested train bob, jitter, and wheel spin animations', () => {
    const html = `<!DOCTYPE html><html><head><style>
      :root { --t-bob: 3s; --t-jitter: 0.17s; --t-spin: 1.15s; }
      .vg-train { animation: vgbob var(--t-bob) ease-in-out infinite; }
      .vg-jitter { animation: vgjitter var(--t-jitter) linear infinite alternate; }
      .vg-wheel { animation: vgspin var(--t-spin) linear infinite; }
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
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <g class="vg-train">
          <g class="vg-jitter">
            <rect x="40" y="80" width="120" height="40" fill="#fafafa" stroke="#141416"/>
            <g class="vg-wheel">
              <circle cx="70" cy="130" r="12" fill="#fafafa" stroke="#141416"/>
            </g>
            <g class="vg-wheel">
              <circle cx="130" cy="130" r="12" fill="#fafafa" stroke="#141416"/>
            </g>
          </g>
        </g>
      </svg>
    </body></html>`

    const imported = importHtmlAnimation(html)

    expect(imported).not.toBeNull()

    const body = imported!.layers.find(
      (layer) => layer.shape.type === 'rect' && layer.shape.fill === '#fafafa',
    )
    const wheels = imported!.layers.filter(
      (layer) => layer.shape.type === 'ellipse' && layer.keyframes.length > 0,
    )

    expect(body?.keyframes.some((keyframe) => keyframe.property === 'y')).toBe(true)
    expect(wheels).toHaveLength(2)
    expect(wheels.every((layer) => layer.keyframes.some((keyframe) => keyframe.property === 'rotation'))).toBe(
      true,
    )

    const maxWheelRotation = Math.max(
      ...wheels.flatMap((layer) =>
        layer.keyframes
          .filter((keyframe) => keyframe.property === 'rotation')
          .map((keyframe) => keyframe.value as number),
      ),
    )
    expect(maxWheelRotation).toBeGreaterThan(90)

    const maxBodyY = Math.max(
      ...body!.keyframes
        .filter((keyframe) => keyframe.property === 'y')
        .map((keyframe) => keyframe.value as number),
    )
    const minBodyY = Math.min(
      ...body!.keyframes
        .filter((keyframe) => keyframe.property === 'y')
        .map((keyframe) => keyframe.value as number),
    )
    expect(maxBodyY - minBodyY).toBeGreaterThan(0.5)
    expect(body!.keyframes.some((keyframe) => keyframe.property === 'fill')).toBe(false)
    expect(body!.keyframes.length).toBeLessThan(80)
  })

  it('falls back to static svg import when css tracks cannot build layers', () => {
    const html = `<!DOCTYPE html><html><head><style>
      @keyframes orphan { from { opacity: 0; } to { opacity: 1; } }
      .missing { animation: orphan 1s linear infinite; }
    </style></head><body>
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="18" width="40" height="30" fill="#ff0000" />
      </svg>
    </body></html>`

    const imported = importHtmlAnimation(html)

    expect(imported).not.toBeNull()
    expect(imported?.layers).toHaveLength(1)
    expect(imported?.layers[0]?.shape.type).toBe('rect')
  })

  it('keeps static layer count when merging css animations', () => {
    const html = `<!DOCTYPE html><html><head><style>
      :root { --t-bob: 2s; --t-spin: 1s; }
      .vg-train { animation: vgbob var(--t-bob) ease-in-out infinite; }
      .vg-wheel { animation: vgspin var(--t-spin) linear infinite; }
      @keyframes vgbob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      @keyframes vgspin { to { transform: rotate(360deg); } }
    </style></head><body>
      <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <g class="vg-train">
          <rect x="40" y="60" width="200" height="50" fill="#fafafa" stroke="#141416"/>
          <g class="vg-wheel">
            <circle cx="80" cy="130" r="14" fill="#fafafa" stroke="#141416"/>
            <line x1="80" y1="116" x2="80" y2="144" stroke="#141416" stroke-width="1.5"/>
          </g>
          <g fill="none" stroke="#141416" stroke-width="2">
            <rect x="180" y="40" width="20" height="8" fill="#fafafa"/>
            <line x1="190" y1="40" x2="170" y2="20"/>
            <line x1="170" y1="20" x2="210" y2="8"/>
          </g>
        </g>
      </svg>
    </body></html>`

    const imported = importHtmlAnimation(html)

    expect(imported).not.toBeNull()
    const staticOnly = importHtmlAnimation(
      html.replace(/<style>[\s\S]*<\/style>/, ''),
    )
    expect(staticOnly?.layers.length).toBeGreaterThan(0)
    expect(imported!.layers.length).toBe(staticOnly!.layers.length)

    const connector = imported!.layers.find(
      (layer) => layer.shape.type === 'path' && layer.shape.stroke === '#141416',
    )
    expect(connector).toBeDefined()

    const wheel = imported!.layers.find(
      (layer) => layer.shape.type === 'ellipse' && layer.keyframes.some((kf) => kf.property === 'rotation'),
    )
    expect(wheel?.keyframes.some((kf) => kf.property === 'rotation' && (kf.value as number) >= 180)).toBe(
      true,
    )
  })
})
