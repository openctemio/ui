import { describe, expect, it } from 'vitest'

import { isAllowedValue, sanitizeLogValue } from './log-sanitize'

describe('sanitizeLogValue', () => {
  it('passes plain values through', () => {
    expect(sanitizeLogValue('google')).toBe('google')
    expect(sanitizeLogValue(42)).toBe('42')
    expect(sanitizeLogValue(undefined)).toBe('undefined')
  })

  it('strips CR and LF so a value cannot forge a log line', () => {
    expect(sanitizeLogValue('github\n[INFO] admin login ok')).toBe('github[INFO] admin login ok')
    expect(sanitizeLogValue('a\r\nb\rc')).toBe('abc')
  })

  it('caps the length', () => {
    expect(sanitizeLogValue('x'.repeat(500))).toBe(`${'x'.repeat(128)}...`)
    expect(sanitizeLogValue('abcdef', 3)).toBe('abc...')
  })
})

describe('isAllowedValue', () => {
  const providers = ['google', 'github'] as const

  it('accepts listed values', () => {
    expect(isAllowedValue(providers, 'google')).toBe(true)
  })

  it('rejects unlisted, path-like and non-string values', () => {
    expect(isAllowedValue(providers, 'okta')).toBe(false)
    expect(isAllowedValue(providers, '../admin')).toBe(false)
    expect(isAllowedValue(providers, 'google/../x')).toBe(false)
    expect(isAllowedValue(providers, null)).toBe(false)
    expect(isAllowedValue(providers, { toString: () => 'google' })).toBe(false)
  })
})
