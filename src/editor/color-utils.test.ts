import { describe, expect, it } from 'vitest'

import { hexToHsv, hsvToHex, normalizeHex, parseHex } from '@/editor/color-utils'

describe('color-utils', () => {
  it('normalizes short hex values', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc')
  })

  it('round-trips hex through hsv', () => {
    const hex = '#6366f1'
    expect(hsvToHex(hexToHsv(hex))).toBe(hex)
  })

  it('parses hex channels', () => {
    expect(parseHex('#ff8040')).toEqual([255, 128, 64])
  })
})
