import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { LEGACY_SENSOR_ROUTE_REDIRECTS } from '../legacy-sensor-routes'
import { routePermissions as ROUTE_PERMISSIONS } from '../route-permissions'
import { Permission } from '@/lib/permissions'

const APP = join(__dirname, '..', '..', 'app')

/** Apply a Next.js `:path*` redirect the way next.config does (path kept). */
function redirect(pathname: string): string | null {
  for (const r of LEGACY_SENSOR_ROUTE_REDIRECTS) {
    const prefix = r.source.replace('/:path*', '')
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return r.destination.replace('/:path*', '') + pathname.slice(prefix.length)
    }
  }
  return null
}

describe('legacy /agents routes', () => {
  it('redirect permanently to /sensors, keeping the rest of the path', () => {
    expect(LEGACY_SENSOR_ROUTE_REDIRECTS.every((r) => r.permanent)).toBe(true)
    expect(redirect('/agents')).toBe('/sensors')
    expect(redirect('/agents/123')).toBe('/sensors/123')
    expect(redirect('/agentsx')).toBeNull()
    expect(redirect('/sensors')).toBeNull()
  })

  it('point at a page that exists, and the old page folder is gone', () => {
    expect(existsSync(join(APP, '(dashboard)', '(scoping)', 'sensors', 'page.tsx'))).toBe(true)
    expect(existsSync(join(APP, '(dashboard)', '(scoping)', 'agents'))).toBe(false)
  })

  it('/sensors is guarded by sensors:read + the sensors module, none left on /agents', () => {
    expect(ROUTE_PERMISSIONS['/sensors']?.permission).toBe(Permission.SensorsRead)
    expect(ROUTE_PERMISSIONS['/sensors/**']?.permission).toBe(Permission.SensorsRead)
    // The sensors module (renamed in place by the API migration), which the API
    // grants to members holding sensors:read; not scans.
    expect(ROUTE_PERMISSIONS['/sensors']?.module).toBe('sensors')
    expect(Object.keys(ROUTE_PERMISSIONS).filter((k) => k.startsWith('/agents'))).toEqual([])
    expect(Permission.SensorsRead).toBe('sensors:read')
  })
})
