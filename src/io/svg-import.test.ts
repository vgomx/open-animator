// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  importSvg,
  importSvgAsProject,
  parseSvgColor,
  parseSvgPathData,
  svgImportToProject,
} from '@/io/svg-import'

describe('svg import', () => {
  it('parses named and hex colors', () => {
    expect(parseSvgColor('none')).toBe('none')
    expect(parseSvgColor('#ff0000')).toBe('#ff0000')
    expect(parseSvgColor('rgb(255, 0, 0)')).toBe('#ff0000')
  })

  it('parses path line and cubic commands', () => {
    const parsed = parseSvgPathData('M 0 0 L 100 0 C 120 0 140 40 100 80 Z')

    expect(parsed.points.length).toBeGreaterThanOrEqual(3)
    expect(parsed.closed).toBe(true)
    expect(parsed.points[0]).toEqual({ x: 0, y: 0 })
  })

  it('parses elliptical arc commands as cubic-bezier points', () => {
    const parsed = parseSvgPathData('M 0 0 A 50 50 0 0 1 100 0')

    expect(parsed.points.length).toBeGreaterThanOrEqual(2)
    expect(parsed.points[0]?.x).toBe(0)
    expect(parsed.points[0]?.y).toBe(0)
    const last = parsed.points[parsed.points.length - 1]!
    expect(last.x).toBeCloseTo(100, 0)
    expect(last.y).toBeCloseTo(0, 0)
    expect(last.handleIn).toBeDefined()
  })

  it('imports class-based styles from style blocks', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <style>
          .accent { fill: #ff6600; stroke: #000000; stroke-width: 4; opacity: 0.8; }
        </style>
        <rect class="accent" x="10" y="10" width="40" height="30" />
      </svg>
    `

    const imported = importSvg(svg)
    const layer = imported?.layers[0]

    expect(layer?.shape.fill).toBe('#ff6600')
    expect(layer?.shape.stroke).toBe('#000000')
    expect(layer?.shape.strokeWidth).toBe(4)
    expect(layer?.shape.opacity).toBe(0.8)
  })

  it('imports rect and circle elements as layers', () => {
    const svg = `
      <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="20" width="80" height="50" fill="#22d3ee" />
        <circle cx="200" cy="150" r="30" fill="#6366f1" />
      </svg>
    `

    const imported = importSvg(svg)

    expect(imported).not.toBeNull()
    expect(imported?.layers).toHaveLength(2)
    expect(imported?.artboard).toEqual({ width: 400, height: 300 })
    expect(imported?.layers[0]?.shape.type).toBe('rect')
    expect(imported?.layers[1]?.shape.type).toBe('ellipse')
  })

  it('imports text elements', () => {
    const svg = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <text x="40" y="80" font-size="32">Hello SVG</text>
      </svg>
    `

    const imported = importSvg(svg)
    const textLayer = imported?.layers[0]

    expect(textLayer?.shape.type).toBe('text')
    if (textLayer?.shape.type === 'text') {
      expect(textLayer.shape.text).toBe('Hello SVG')
      expect(textLayer.shape.fontSize).toBe(32)
    }
  })

  it('returns null for invalid svg', () => {
    expect(importSvg('<svg><unclosed')).toBeNull()
  })

  it('returns null when svg has no supported shapes', () => {
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="g" /></defs>
      </svg>
    `

    expect(importSvg(svg)).toBeNull()
  })

  it('builds a project from imported svg', () => {
    const svg = `
      <svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="120" height="80" fill="#f97316" />
      </svg>
    `

    const imported = importSvg(svg)
    expect(imported).not.toBeNull()

    const project = svgImportToProject(imported!)
    expect(project.layers).toHaveLength(1)
    expect(project.artboards[0]).toMatchObject({ width: 320, height: 240 })
    expect(project.layers[0]?.shape.id).not.toBe(imported!.layers[0]!.shape.id)
  })

  it('imports svg as a full project from raw markup', () => {
    const svg = `
      <svg width="500" height="400" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="250" cy="200" rx="80" ry="50" fill="#10b981" />
      </svg>
    `

    const project = importSvgAsProject(svg)
    expect(project?.layers).toHaveLength(1)
    expect(project?.artboards[0]).toMatchObject({ width: 500, height: 400 })
    expect(project?.layers[0]?.shape.type).toBe('ellipse')
  })

  it('imports clipPath defs and assigns them to layers', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="circle-clip">
            <circle cx="100" cy="100" r="60" />
          </clipPath>
        </defs>
        <rect x="20" y="20" width="160" height="160" fill="#22d3ee" clip-path="url(#circle-clip)" />
      </svg>
    `

    const imported = importSvg(svg)
    expect(imported?.clipPaths['circle-clip']?.markup).toContain('circle')
    expect(imported?.layers[0]?.svgClipPathId).toBe('circle-clip')

    const project = svgImportToProject(imported!)
    expect(project.importedSvg?.clipPaths?.['circle-clip']?.markup).toContain('circle')
  })

  it('preserves svg group hierarchy on import', () => {
    const svg = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <g id="shapes">
          <rect x="10" y="10" width="40" height="30" fill="#f97316" />
          <circle cx="120" cy="60" r="20" fill="#6366f1" />
        </g>
      </svg>
    `

    const imported = importSvg(svg)
    expect(imported).not.toBeNull()
    expect(Object.keys(imported!.groups)).toHaveLength(1)

    const groupId = imported!.layers[0]!.groupId
    expect(groupId).toBeTruthy()
    expect(imported!.layers.every((layer) => layer.groupId === groupId)).toBe(true)
    expect(imported!.groups[groupId!]?.name).toBe('shapes')

    const project = svgImportToProject(imported!)
    expect(project.layerGroups?.[groupId!]?.name).toBe('shapes')
  })
})
