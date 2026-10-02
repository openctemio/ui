import { describe, expect, it } from 'vitest'

import { formatBytes, formatDurationShort, keyExpiry } from '../format'

const NOW = new Date('2026-10-02T12:00:00Z').getTime()

describe('formatDurationShort', () => {
  it.each([
    [0, '0s'],
    [40, '40s'],
    [300, '5m'],
    [8040, '2h 14m'],
    [7200, '2h'],
    [3 * 86400 + 4 * 3600, '3d 4h'],
    [86400, '1d'],
    [-5, '0s'],
  ])('%i -> %s', (s, want) => {
    expect(formatDurationShort(s)).toBe(want)
  })
})

describe('keyExpiry', () => {
  const at = (days: number) => new Date(NOW + days * 86_400_000).toISOString()
  it('buckets the expiry', () => {
    expect(keyExpiry(undefined, NOW)).toEqual({ kind: 'unknown' })
    expect(keyExpiry(null, NOW)).toEqual({ kind: 'never' })
    expect(keyExpiry(at(-1), NOW)).toEqual({ kind: 'expired' })
    expect(keyExpiry(at(6), NOW)).toEqual({ kind: 'soon', days: 6 })
    expect(keyExpiry(at(84), NOW)).toEqual({ kind: 'later', days: 84 })
  })
})

describe('formatBytes', () => {
  it('scales', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(123456)).toBe('121 KB')
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })
})
