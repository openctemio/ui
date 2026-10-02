import { describe, expect, it } from 'vitest'

import {
  compareSensorVersions,
  normalizeSensorVersion,
  sensorVersionStatus,
} from '../sensor-version'

describe('normalizeSensorVersion', () => {
  it.each([
    ['0.4.2', 'v0.4.2'],
    ['v0.4.2', 'v0.4.2'],
    ['V0.4.2', 'v0.4.2'],
    ['vv0.4.2', 'v0.4.2'],
    [' v0.4.2 ', 'v0.4.2'],
    ['0.4', 'v0.4.0'],
    ['1', 'v1.0.0'],
    ['v0.5.0-rc.1', 'v0.5.0-rc.1'],
    ['v0.4.2+build.7', 'v0.4.2'],
    ['dev', 'dev'],
  ])('%s -> %s', (input, want) => {
    expect(normalizeSensorVersion(input)).toBe(want)
  })

  it('returns null for nothing', () => {
    expect(normalizeSensorVersion('')).toBeNull()
    expect(normalizeSensorVersion('   ')).toBeNull()
    expect(normalizeSensorVersion(undefined)).toBeNull()
    expect(normalizeSensorVersion(null)).toBeNull()
  })
})

describe('compareSensorVersions', () => {
  it('orders release versions', () => {
    expect(compareSensorVersions('v0.4.1', 'v0.4.2')).toBeLessThan(0)
    expect(compareSensorVersions('0.4.2', 'v0.4.2')).toBe(0)
    expect(compareSensorVersions('v0.10.0', 'v0.9.9')).toBeGreaterThan(0)
    expect(compareSensorVersions('v0.4.2-rc.1', 'v0.4.2')).toBeLessThan(0)
  })
  it('counts a git-describe build as its tag', () => {
    expect(compareSensorVersions('v0.4.2-3-gabc1234', 'v0.4.2')).toBe(0)
  })
  it('cannot compare a dev build', () => {
    expect(compareSensorVersions('dev', 'v0.4.2')).toBeNull()
  })
})

describe('sensorVersionStatus', () => {
  it('prefers the status the API computed', () => {
    expect(sensorVersionStatus({ version: 'v0.1.0', version_status: 'latest' }, 'v0.4.2')).toBe(
      'latest'
    )
  })
  it('computes it from the release channel otherwise', () => {
    expect(sensorVersionStatus({ version: '0.4.2' }, 'v0.4.2')).toBe('latest')
    expect(sensorVersionStatus({ version: 'v0.4.1' }, 'v0.4.2')).toBe('update_available')
    expect(sensorVersionStatus({ version: 'v0.3.0' }, 'v0.4.2', 'v0.4.0')).toBe('unsupported')
    expect(sensorVersionStatus({ version: 'v0.4.1' }, null)).toBe('unknown')
    expect(sensorVersionStatus({ version: '' }, 'v0.4.2')).toBe('unknown')
    expect(sensorVersionStatus({ version: 'dev' }, 'v0.4.2')).toBe('unknown')
  })
})
