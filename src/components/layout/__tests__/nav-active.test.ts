/**
 * Which sidebar row lights up, checked against the real sidebar config — the
 * sibling resolution (longest matching url wins) is what keeps one row active
 * when several urls share a prefix.
 */
import { describe, expect, it } from 'vitest'
import { sidebarData } from '@/config/sidebar-data'
import type { NavLink } from '@/components/types'
import { activeSubItemUrl, checkIsActive, isUrlActive, sectionHasActiveRoute } from '../nav-active'

const group = (title: string) => sidebarData.navGroups.find((g) => g.title === title)!
const leaves = (title: string) => group(title).items.filter((i): i is NavLink => !('items' in i))

/** The row the Discovery section highlights for a path. */
const discoveryActive = (pathname: string) => activeSubItemUrl(pathname, leaves('Discovery'))

describe('isUrlActive', () => {
  it('matches the url itself and its child routes', () => {
    expect(isUrlActive('/exposures', '/exposures')).toBe(true)
    expect(isUrlActive('/exposures/secrets', '/exposures')).toBe(true)
  })

  it('does not match a bare string prefix', () => {
    expect(isUrlActive('/scan-profiles', '/scans')).toBe(false)
    expect(isUrlActive('/exposuresx', '/exposures')).toBe(false)
  })

  it('ignores non-string urls', () => {
    expect(isUrlActive('/x', { pathname: '/x' })).toBe(false)
  })
})

describe('Discovery: one row per section', () => {
  it.each([
    '/exposures',
    '/exposures/vulnerabilities',
    '/exposures/secrets',
    '/exposures/code',
    '/exposures/misconfigurations',
  ])('%s highlights Exposures', (path) => {
    expect(discoveryActive(path)).toBe('/exposures')
    expect(sectionHasActiveRoute(path, group('Discovery').items)).toBe(true)
  })

  it('keeps Assets and What changed apart', () => {
    expect(discoveryActive('/assets')).toBe('/assets')
    expect(discoveryActive('/assets/hosts')).toBe('/assets')
    expect(discoveryActive('/assets/changes')).toBe('/assets/changes')
  })

  it('Credential leaks is its own row, not part of Exposures', () => {
    expect(discoveryActive('/credentials')).toBe('/credentials')
  })

  it('a route outside the section highlights nothing in it', () => {
    expect(discoveryActive('/findings')).toBeUndefined()
    expect(sectionHasActiveRoute('/findings', group('Discovery').items)).toBe(false)
  })
})

describe('Mobilization: Remediation covers its section tabs', () => {
  const remediation = () => leaves('Mobilization').find((i) => i.url === '/remediation')!

  it('stays active on the Solution families tab (/remediations)', () => {
    // /remediations is not a child route of /remediation, but it is one of the
    // row's section tabs, so the row still shows where you are.
    expect(checkIsActive('/remediation', remediation())).toBe(true)
    expect(checkIsActive('/remediations', remediation())).toBe(true)
    expect(activeSubItemUrl('/remediations', leaves('Mobilization'))).toBe('/remediation')
  })

  it('does not light up for an unrelated route', () => {
    expect(checkIsActive('/sla', remediation())).toBe(false)
  })
})
