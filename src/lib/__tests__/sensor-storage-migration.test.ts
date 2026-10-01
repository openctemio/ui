import { beforeEach, describe, expect, it } from 'vitest'

import { migratedStorageKey, migrateSensorBrowserStorage } from '../sensor-storage-migration'

const PERMS_KEY = 'openctem_perms:tenant-1'

function storePerms(storage: Storage, permissions: string[]) {
  storage.setItem(PERMS_KEY, JSON.stringify({ permissions, version: 7, updatedAt: 123 }))
}
function readPerms(storage: Storage) {
  return JSON.parse(storage.getItem(PERMS_KEY) ?? 'null')
}

describe('migrateSensorBrowserStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('rewrites cached agents:* permissions to sensors:* and keeps the rest', () => {
    storePerms(window.localStorage, [
      'agents:read',
      'agents:write',
      'agents:delete',
      'agents:commands:read',
      'findings:read',
    ])

    const report = migrateSensorBrowserStorage()

    expect(readPerms(window.localStorage)).toEqual({
      permissions: [
        'sensors:read',
        'sensors:write',
        'sensors:delete',
        'sensors:commands:read',
        'findings:read',
      ],
      version: 7,
      updatedAt: 123,
    })
    expect(report.rewritten).toEqual([PERMS_KEY])
  })

  it('does not duplicate a permission the cache already had under the new id', () => {
    storePerms(window.localStorage, ['agents:read', 'sensors:read'])
    migrateSensorBrowserStorage()
    expect(readPerms(window.localStorage).permissions).toEqual(['sensors:read'])
  })

  it('renames app keys that say agent in both storages, value kept, old key removed', () => {
    window.localStorage.setItem('openctem:agents-filters-open', '1')
    window.sessionStorage.setItem('openctem:agent-detail-tab', 'audit')

    const report = migrateSensorBrowserStorage()

    expect(window.localStorage.getItem('openctem:sensors-filters-open')).toBe('1')
    expect(window.localStorage.getItem('openctem:agents-filters-open')).toBeNull()
    expect(window.sessionStorage.getItem('openctem:sensor-detail-tab')).toBe('audit')
    expect(window.sessionStorage.getItem('openctem:agent-detail-tab')).toBeNull()
    expect(report.renamed).toEqual([
      ['openctem:agents-filters-open', 'openctem:sensors-filters-open'],
      ['openctem:agent-detail-tab', 'openctem:sensor-detail-tab'],
    ])
  })

  it('keeps newer state already written under the new key', () => {
    window.localStorage.setItem('openctem:agents-filters-open', '1')
    window.localStorage.setItem('openctem:sensors-filters-open', '0')
    migrateSensorBrowserStorage()
    expect(window.localStorage.getItem('openctem:sensors-filters-open')).toBe('0')
    expect(window.localStorage.getItem('openctem:agents-filters-open')).toBeNull()
  })

  it('is idempotent', () => {
    storePerms(window.localStorage, ['agents:read'])
    window.localStorage.setItem('openctem:agents-filters-open', '1')
    migrateSensorBrowserStorage()
    const snapshot = { ...window.localStorage }

    const second = migrateSensorBrowserStorage()

    expect({ ...window.localStorage }).toEqual(snapshot)
    expect(second).toEqual({ rewritten: [], renamed: [] })
  })

  it('leaves third-party keys, the user agent and unrelated words alone', () => {
    window.localStorage.setItem('some-lib:agent', 'x')
    window.localStorage.setItem('openctem:userAgent', 'x')
    window.localStorage.setItem('openctem:reagents', 'x')
    window.localStorage.setItem('openctem:dashboard-view', 'classic')
    expect(migrateSensorBrowserStorage()).toEqual({ rewritten: [], renamed: [] })
    expect(window.localStorage.length).toBe(4)
  })

  it('survives corrupt values and unavailable storage', () => {
    window.localStorage.setItem(PERMS_KEY, '{not json')
    window.localStorage.setItem('openctem_perms:t2', JSON.stringify({ permissions: 'nope' }))
    const throwing = {
      get length(): number {
        throw new Error('SecurityError')
      },
    } as unknown as Storage

    expect(() => migrateSensorBrowserStorage([window.localStorage, throwing, null])).not.toThrow()
    expect(window.localStorage.getItem(PERMS_KEY)).toBe('{not json')
  })
})

describe('migratedStorageKey', () => {
  it.each([
    ['openctem:agents-filters-open', 'openctem:sensors-filters-open'],
    ['openctem_agent_table', 'openctem_sensor_table'],
    ['openctem.agentTableColumns', 'openctem.sensorTableColumns'],
    ['openctem:sensorAgentsTab', 'openctem:sensorSensorsTab'],
    ['openctem:AGENTS', 'openctem:SENSORS'],
    ['openctem:dashboard-view', 'openctem:dashboard-view'],
    ['openctem:user-agent', 'openctem:user-agent'],
  ])('%s -> %s', (from, to) => {
    expect(migratedStorageKey(from)).toBe(to)
  })
})
