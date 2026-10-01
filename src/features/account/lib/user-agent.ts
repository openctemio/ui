/**
 * Turn a raw User-Agent string into the short label shown in the session
 * list ("Chrome on macOS"). Deliberately small: it recognises the common
 * browsers and platforms and falls back to "Unknown" instead of guessing.
 */

export type DeviceKind = 'desktop' | 'mobile' | 'other'

export interface DeviceDescription {
  browser: string
  os: string
  kind: DeviceKind
}

const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
  [/curl\//, 'curl'],
]

const PLATFORMS: [RegExp, string, DeviceKind][] = [
  [/iPhone|iPad|iPod/, 'iOS', 'mobile'],
  [/Android/, 'Android', 'mobile'],
  [/Windows/, 'Windows', 'desktop'],
  [/Mac OS X|Macintosh/, 'macOS', 'desktop'],
  [/CrOS/, 'ChromeOS', 'desktop'],
  [/Linux/, 'Linux', 'desktop'],
]

export function describeUserAgent(ua: string | undefined | null): DeviceDescription {
  if (!ua) return { browser: 'Unknown browser', os: 'unknown device', kind: 'other' }
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1] ?? 'Unknown browser'
  const platform = PLATFORMS.find(([re]) => re.test(ua))
  return {
    browser,
    os: platform?.[1] ?? 'unknown device',
    kind: platform?.[2] ?? 'other',
  }
}
