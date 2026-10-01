import { describe, it, expect } from 'vitest'
import { describeUserAgent } from './user-agent'

describe('describeUserAgent', () => {
  it.each([
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
      'Chrome',
      'macOS',
      'desktop',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0',
      'Edge',
      'Windows',
      'desktop',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Safari',
      'iOS',
      'mobile',
    ],
    [
      'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
      'Firefox',
      'Linux',
      'desktop',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
      'Chrome',
      'Android',
      'mobile',
    ],
  ])('%s', (ua, browser, os, kind) => {
    expect(describeUserAgent(ua)).toEqual({ browser, os, kind })
  })

  it('falls back instead of guessing', () => {
    expect(describeUserAgent('')).toEqual({
      browser: 'Unknown browser',
      os: 'unknown device',
      kind: 'other',
    })
    expect(describeUserAgent('e2e-mfa/1.0').browser).toBe('Unknown browser')
  })
})
