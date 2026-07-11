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
    expect(next.scale).toBe(1.1)
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
    expect(imported?.layers).toHaveLength(1)
    expect(imported?.duration).toBe(2)
    expect(imported?.layers[0]?.keyframes.some((keyframe) => keyframe.property === 'x')).toBe(true)
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
    expect(imported?.layers).toHaveLength(1)
    expect(imported?.duration).toBe(1.5)
  })
})
