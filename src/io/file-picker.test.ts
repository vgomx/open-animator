import { describe, expect, it } from 'vitest'

import {
  isHtmlFile,
  isSvgFile,
  looksLikeHtmlText,
  looksLikeSvgText,
} from '@/io/file-picker'

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

  it('sniffs svg and html content when mime metadata is missing', () => {
    expect(looksLikeSvgText('<svg viewBox="0 0 10 10"></svg>')).toBe(true)
    expect(looksLikeSvgText('<?xml version="1.0"?><svg></svg>')).toBe(true)
    expect(looksLikeSvgText('{"v":"5.5.7"}')).toBe(false)

    expect(looksLikeHtmlText('<!DOCTYPE html><html></html>')).toBe(true)
    expect(looksLikeHtmlText('<html><body></body></html>')).toBe(true)
    expect(looksLikeHtmlText('<svg></svg>')).toBe(false)
  })
})
