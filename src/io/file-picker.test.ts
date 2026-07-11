import { describe, expect, it } from 'vitest'

import { isHtmlFile, isSvgFile } from '@/io/file-picker'

describe('file-picker', () => {
  it('accepts svg files by extension and mime aliases', () => {
    expect(isSvgFile(new File(['<svg></svg>'], 'icon.svg', { type: '' }))).toBe(true)
    expect(isSvgFile(new File(['<svg></svg>'], 'icon.svg', { type: 'text/xml' }))).toBe(true)
    expect(isSvgFile(new File(['{}'], 'project.json', { type: 'application/json' }))).toBe(false)
  })

  it('accepts html files by extension and mime aliases', () => {
    expect(isHtmlFile(new File(['<html></html>'], 'animation.html', { type: '' }))).toBe(true)
    expect(
      isHtmlFile(new File(['<html></html>'], 'animation.htm', { type: 'text/html' })),
    ).toBe(true)
    expect(isHtmlFile(new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' }))).toBe(false)
  })
})
