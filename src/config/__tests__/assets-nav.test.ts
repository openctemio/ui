/**
 * Discovery > Assets is one row with route tabs Inventory | Groups | What
 * changed | Suggestions (docs/ui/scoping-ia-2026-10.md, C8). The retired
 * /attack-surface/internal and /cloud pages redirect to the inventory with the
 * filter they applied (D5).
 */
import { describe, expect, it } from 'vitest'
import { sidebarData } from '../sidebar-data'
import { ASSETS_SECTION_TABS } from '../section-tabs'
import { matchRoutePermission } from '../route-permissions'
import { resolveLegacyRoute } from '../legacy-routes'
import { checkIsActive } from '@/components/layout/nav-active'
import { parseInventoryFilters } from '@/features/assets/lib/inventory-url'
import type { NavCollapsible, NavItem, NavLink } from '@/components/types'

const isCollapsible = (i: NavItem): i is NavCollapsible =>
  Array.isArray((i as NavCollapsible).items)
const discovery = sidebarData.navGroups.find((g) => g.title === 'Discovery')!
const rows = discovery.items.filter((i) => !isCollapsible(i)) as NavLink[]
const assets = rows.find((r) => r.title === 'Assets')!

describe('Discovery > Assets', () => {
  it('is one row carrying the tabs, with no gate of its own', () => {
    expect(assets.url).toBe('/assets')
    expect(assets.sections).toBe(ASSETS_SECTION_TABS)
    expect(assets.module).toBeUndefined()
    expect(assets.permission).toBeUndefined()
  })

  it('lists the approved tabs, in order, with unchanged urls', () => {
    expect(ASSETS_SECTION_TABS.map((t) => [t.label, t.href, t.module])).toEqual([
      ['Inventory', '/assets', 'assets'],
      ['Groups', '/asset-groups', 'assets'],
      ['What changed', '/assets/changes', 'assets'],
      ['Suggestions', '/relationships/suggestions', 'relationships'],
    ])
  })

  it.each([...ASSETS_SECTION_TABS])('$label tab binds its route guard', (tab) => {
    const guard = matchRoutePermission(tab.href)
    expect(guard?.module).toBe(tab.module)
    expect(guard?.permission).toBe(tab.permission)
  })

  it('no tab is also a sidebar row', () => {
    const urls = rows.filter((r) => r !== assets).map((r) => r.url)
    for (const tab of ASSETS_SECTION_TABS) expect(urls).not.toContain(tab.href)
  })

  it('Discovery rows, in order', () => {
    expect(rows.map((r) => r.title)).toEqual([
      'Scans',
      'Sensors',
      'Attack surface',
      'Assets',
      'Exposures',
      'Credential leaks',
      'Components',
    ])
  })

  it.each([
    '/assets',
    '/assets/hosts',
    '/assets/changes',
    '/asset-groups',
    '/asset-groups/abc',
    '/relationships/suggestions',
  ])('%s lights up the Assets row only', (path) => {
    const active = sidebarData.navGroups.flatMap((g) =>
      g.items.filter((i): i is NavLink => !isCollapsible(i) && checkIsActive(path, i))
    )
    expect(active).toEqual([assets])
  })
})

describe('retired attack-surface pages', () => {
  it('/attack-surface/internal opens the internal inventory', () => {
    const to = resolveLegacyRoute('/attack-surface/internal')!
    expect(to.split('?')[0]).toBe('/assets')
    const f = parseInventoryFilters(new URLSearchParams(to.split('?')[1]))
    expect(f.scopes).toEqual(['internal'])
    expect(f.types).toEqual(['host', 'database', 'network', 'container'])
  })

  it('/attack-surface/cloud opens the cloud accounts', () => {
    const to = resolveLegacyRoute('/attack-surface/cloud')!
    const f = parseInventoryFilters(new URLSearchParams(to.split('?')[1]))
    expect(f.types).toEqual(['cloud_account'])
  })

  it('/attack-surface and /attack-surface/external stay', () => {
    expect(resolveLegacyRoute('/attack-surface')).toBeNull()
    expect(resolveLegacyRoute('/attack-surface/external')).toBeNull()
    expect(matchRoutePermission('/attack-surface/external')?.module).toBe('attack_surface')
  })
})
