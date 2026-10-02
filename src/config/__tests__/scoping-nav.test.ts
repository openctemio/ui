/**
 * Scoping holds what the program decides (docs/ui/scoping-ia-2026-10.md): one
 * row per ctem.org scoping artifact. Business context and Threat model are rows
 * whose route tabs belong to different modules, so a tab is gated on its own
 * module and the row is shown while any tab is. Every URL that used to be a
 * Scoping row still opens and lights up a row.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { sidebarData } from '../sidebar-data'
import { BUSINESS_CONTEXT_SECTION_TABS, THREAT_MODEL_SECTION_TABS } from '../section-tabs'
import { matchRoutePermission } from '../route-permissions'
import { checkIsActive } from '@/components/layout/nav-active'
import type { NavCollapsible, NavItem, NavLink } from '@/components/types'
import { rowUrlForSections, visibleSections } from '@/lib/permissions/use-filtered-sidebar'
import en from '@/lib/i18n/dictionaries/en.json'
import vi from '@/lib/i18n/dictionaries/vi.json'

const APP = join(process.cwd(), 'src', 'app')

function pageExists(url: string): boolean {
  function walk(dir: string, rest: string[]): boolean {
    if (rest.length === 0) return existsSync(join(dir, 'page.tsx'))
    const [head, ...tail] = rest
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (!statSync(full).isDirectory()) continue
      if (entry.startsWith('(') && entry.endsWith(')')) {
        if (walk(full, rest)) return true
      } else if (entry === head) {
        if (walk(full, tail)) return true
      }
    }
    return false
  }
  return walk(APP, url.split('?')[0].split('/').filter(Boolean))
}

const isCollapsible = (i: NavItem): i is NavCollapsible =>
  Array.isArray((i as NavCollapsible).items)
const group = (title: string) => sidebarData.navGroups.find((g) => g.title === title)!
const links = (title: string) => group(title).items.filter((i) => !isCollapsible(i)) as NavLink[]
const row = (groupTitle: string, title: string) =>
  links(groupTitle).find((i) => i.title === title) as NavLink

describe('Scoping rows', () => {
  it('are the scoping artifacts, cycle first, with no nested sections', () => {
    expect(group('Scoping').items.filter(isCollapsible)).toEqual([])
    expect(links('Scoping').map((i) => [i.title, i.url])).toEqual([
      ['Overview', '/scoping'],
      ['Cycles', '/cycles'],
      ['Business context', '/crown-jewels'],
      ['Boundaries', '/scope-config'],
      ['Threat model', '/threat-model'],
    ])
  })

  it('Business context carries Crown jewels | Services | Units, each on its own module', () => {
    expect(row('Scoping', 'Business context').sections).toBe(BUSINESS_CONTEXT_SECTION_TABS)
    expect(BUSINESS_CONTEXT_SECTION_TABS.map((t) => [t.label, t.href, t.module])).toEqual([
      ['Crown jewels', '/crown-jewels', 'crown_jewels'],
      ['Services', '/business-services', 'business_services'],
      ['Units', '/business-units', 'business_units'],
    ])
  })

  it('Threat model carries Threats | Attacker profiles, each on its own module', () => {
    expect(row('Scoping', 'Threat model').sections).toBe(THREAT_MODEL_SECTION_TABS)
    expect(THREAT_MODEL_SECTION_TABS.map((t) => [t.label, t.href, t.module])).toEqual([
      ['Threats', '/threat-model', 'threat_model'],
      ['Attacker profiles', '/attacker-profiles', 'attacker_profiles'],
    ])
  })

  it.each([...BUSINESS_CONTEXT_SECTION_TABS, ...THREAT_MODEL_SECTION_TABS])(
    '$label tab has a page and the gates its route guard enforces',
    (tab) => {
      expect(pageExists(tab.href), tab.href).toBe(true)
      expect(tab.icon, tab.label).toBeDefined()
      const guard = matchRoutePermission(tab.href)
      expect(guard?.module).toBe(tab.module)
      expect(guard?.permission).toBe(tab.permission)
    }
  )

  it('a sectioned row has no gate of its own and opens its first tab', () => {
    for (const title of ['Business context', 'Threat model']) {
      const r = row('Scoping', title)
      expect(r.module, title).toBeUndefined()
      expect(r.permission, title).toBeUndefined()
      expect(r.url).toBe(r.sections![0].href)
    }
  })

  it('the header opens the Overview, which needs only assets:read', () => {
    expect(group('Scoping').url).toBe('/scoping')
    const overview = row('Scoping', 'Overview')
    expect(overview.module).toBeUndefined()
    expect(matchRoutePermission('/scoping')).toEqual({ permission: overview.permission })
    expect(pageExists('/scoping')).toBe(true)
  })

  it('labels are translated in en and vi', () => {
    for (const r of links('Scoping').filter((l) => l.title !== 'Overview')) {
      const key = `nav.item.${r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      expect((en as Record<string, string>)[key], key).toBe(r.title)
      expect((vi as Record<string, string>)[key], key).toBeTruthy()
    }
  })
})

describe('moves out of Scoping', () => {
  it('Attack surface is a Discovery row; Asset groups and Relationships are Assets tabs', () => {
    const discovery = links('Discovery')
    expect(discovery.map((i) => i.url)).toContain('/attack-surface')
    const assetTabs = row('Discovery', 'Assets').sections!.map((s) => s.href)
    expect(assetTabs).toContain('/asset-groups')
    expect(assetTabs).toContain('/relationships/suggestions')
  })

  it('Compliance is an Insights row', () => {
    expect(row('Insights', 'Compliance')?.url).toBe('/compliance')
  })

  // Every URL that was a Scoping row before the regroup still lights up a row
  // in the expected group (no redirects: none of these URLs changed).
  it.each([
    ['/cycles', 'Scoping', 'Cycles'],
    ['/crown-jewels', 'Scoping', 'Business context'],
    ['/business-services', 'Scoping', 'Business context'],
    ['/business-units', 'Scoping', 'Business context'],
    ['/scope-config', 'Scoping', 'Boundaries'],
    ['/threat-model', 'Scoping', 'Threat model'],
    ['/attacker-profiles', 'Scoping', 'Threat model'],
    ['/attack-surface', 'Discovery', 'Attack surface'],
    ['/attack-surface/external', 'Discovery', 'Attack surface'],
    ['/asset-groups', 'Discovery', 'Assets'],
    ['/asset-groups/abc', 'Discovery', 'Assets'],
    ['/relationships/suggestions', 'Discovery', 'Assets'],
    ['/compliance', 'Insights', 'Compliance'],
  ])('%s is active on %s > %s', (path, groupTitle, title) => {
    const active = sidebarData.navGroups.flatMap((g) =>
      g.items
        .filter((i): i is NavLink => !isCollapsible(i) && checkIsActive(path, i))
        .map((i) => [g.title, i.title])
    )
    expect(active).toEqual([[groupTitle, title]])
    expect(pageExists(path.replace(/\/abc$/, '/[id]')) || pageExists(path)).toBe(true)
  })
})

describe('per-tab gating', () => {
  const tabs = BUSINESS_CONTEXT_SECTION_TABS
  const allow = (modules: string[]) => (t: { module?: string }) => modules.includes(t.module!)

  it('keeps the tabs whose module is on, in order', () => {
    const v = visibleSections(tabs, allow(['business_units', 'crown_jewels']))
    expect(v.map((t) => t.label)).toEqual(['Crown jewels', 'Units'])
  })

  it('an ungated tab always shows', () => {
    const v = visibleSections([{ href: '/a' }, { href: '/b', module: 'x' }], () => false)
    expect(v.map((t) => t.href)).toEqual(['/a'])
  })

  it('the row keeps its url while that tab is visible', () => {
    const v = visibleSections(tabs, allow(['crown_jewels', 'business_services']))
    expect(rowUrlForSections('/crown-jewels', tabs, v)).toBe('/crown-jewels')
  })

  it('the row opens the first visible tab when its own tab is off', () => {
    const v = visibleSections(tabs, allow(['business_services', 'business_units']))
    expect(rowUrlForSections('/crown-jewels', tabs, v)).toBe('/business-services')
  })

  it('a url that is not a tab is kept', () => {
    expect(rowUrlForSections('/elsewhere', tabs, [])).toBe('/elsewhere')
  })
})
