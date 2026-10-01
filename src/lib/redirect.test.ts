import { describe, expect, it } from 'vitest'

import { validateRedirectUrl } from './redirect'

// App origin in tests is http://localhost:3000 (see src/test/setup.ts).

describe('validateRedirectUrl', () => {
  it('allows safe internal paths', () => {
    expect(validateRedirectUrl('/dashboard')).toBe('/dashboard')
    expect(validateRedirectUrl('/profile?tab=settings')).toBe('/profile?tab=settings')
    expect(validateRedirectUrl('/a/b#frag')).toBe('/a/b#frag')
  })

  it('blocks plain external and protocol-relative redirects', () => {
    expect(validateRedirectUrl('https://evil.com')).toBe('/dashboard')
    expect(validateRedirectUrl('//evil.com')).toBe('/dashboard')
    expect(validateRedirectUrl('/\\evil.com')).toBe('/dashboard')
    expect(validateRedirectUrl('/javascript:alert(1)')).toBe('/dashboard')
  })

  // Regression: open redirect via embedded control characters. Browsers strip
  // tab/newline/CR while parsing the navigation target, so these collapse to a
  // protocol-relative external URL after validation.
  it('blocks control-character bypasses (tab/newline/CR)', () => {
    expect(validateRedirectUrl('/\t/evil.com')).toBe('/dashboard')
    expect(validateRedirectUrl('/\n/evil.com')).toBe('/dashboard')
    expect(validateRedirectUrl('/\r/evil.com')).toBe('/dashboard')
    expect(validateRedirectUrl('/\u0000/evil.com')).toBe('/dashboard')
  })

  // Regression: a same-origin absolute URL whose path is protocol-relative
  // ("https://app//evil.com" -> pathname "//evil.com").
  it('blocks same-origin URLs with a protocol-relative path', () => {
    expect(validateRedirectUrl('http://localhost:3000//evil.com')).toBe('/dashboard')
    expect(validateRedirectUrl('http://localhost:3000/\\evil.com')).toBe('/dashboard')
  })

  it('reduces a same-origin absolute URL to its safe path', () => {
    expect(validateRedirectUrl('http://localhost:3000/settings?x=1')).toBe('/settings?x=1')
  })

  it('returns the default for empty input', () => {
    expect(validateRedirectUrl('')).toBe('/dashboard')
    expect(validateRedirectUrl(null)).toBe('/dashboard')
    expect(validateRedirectUrl(undefined)).toBe('/dashboard')
    expect(validateRedirectUrl('/x', '/')).toBe('/x')
  })
})
