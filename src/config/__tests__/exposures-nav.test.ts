/**
 * Discovery is at most two levels deep (group, then item). Exposures is one row;
 * its views are in-page route tabs (EXPOSURES_SECTION_TABS), the same pattern as
 * Remediation. Credential leaks is a separate module with its own label and icon.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { KeyRound } from 'lucide-react'
import { sidebarData } from '../sidebar-data'
import { EXPOSURES_SECTION_TABS, REMEDIATION_SECTION_TABS } from '../section-tabs'
import type { NavCollapsible, NavItem, NavLink } from '@/components/types'
import { Permission } from '@/lib/permissions'
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

const discovery = sidebarData.navGroups.find((g) => g.title === 'Discovery')!
const isCollapsible = (i: NavItem): i is NavCollapsible =>
  Array.isArray((i as NavCollapsible).items)
const item = (title: string) => discovery.items.find((i) => i.title === title) as NavLink
const allLinks = sidebarData.navGroups.flatMap((g) =>
  g.items.flatMap((i) => (isCollapsible(i) ? i.items : [i]))
)

describe('Discovery > Exposures', () => {
  it('Discovery has no nested sections', () => {
    expect(discovery.items.filter(isCollapsible)).toEqual([])
  })

  it('Exposures is one link with the section tabs, gated as before', () => {
    const exposures = item('Exposures')
    expect(exposures.url).toBe('/exposures')
    expect(exposures.module).toBe('exposures')
    expect(exposures.permission).toEqual([Permission.FindingsRead, Permission.VulnerabilitiesRead])
    expect(exposures.sections).toBe(EXPOSURES_SECTION_TABS)
  })

  it('lists the approved tabs, in order, with unchanged urls', () => {
    expect(EXPOSURES_SECTION_TABS.map((t) => [t.label, t.href])).toEqual([
      ['Overview', '/exposures'],
      ['Vulnerabilities', '/exposures/vulnerabilities'],
      ['Secrets', '/exposures/secrets'],
      ['Code weaknesses', '/exposures/code'],
      ['Misconfigurations', '/exposures/misconfigurations'],
    ])
  })

  it('every tab has a page and an icon', () => {
    for (const tab of EXPOSURES_SECTION_TABS) {
      expect(pageExists(tab.href), tab.href).toBe(true)
      expect(tab.icon, tab.label).toBeDefined()
    }
  })

  it('no exposure sub-page is also a sidebar row', () => {
    const urls = allLinks.map((l) => l.url)
    for (const tab of EXPOSURES_SECTION_TABS.slice(1)) expect(urls).not.toContain(tab.href)
  })

  it('every remediation tab has a page and the Remediation row carries them', () => {
    const mobilization = sidebarData.navGroups.find((g) => g.title === 'Mobilization')!
    const remediation = mobilization.items.find((i) => i.title === 'Remediation') as NavLink
    expect(remediation.sections).toBe(REMEDIATION_SECTION_TABS)
    for (const tab of REMEDIATION_SECTION_TABS) expect(pageExists(tab.href), tab.href).toBe(true)
  })
})

describe('Discovery > Credential leaks', () => {
  const credentials = item('Credential leaks')

  it('is labelled for what it is', () => {
    expect(credentials).toBeDefined()
    expect(credentials.url).toBe('/credentials')
    expect(credentials.module).toBe('credentials')
  })

  it('has an icon no other sidebar row or Exposures tab uses', () => {
    expect(credentials.icon).not.toBe(KeyRound)
    const others = [
      ...sidebarData.navGroups.map((g) => g.icon),
      ...allLinks.filter((l) => l !== credentials).map((l) => l.icon),
      ...EXPOSURES_SECTION_TABS.map((t) => t.icon),
    ]
    expect(others).not.toContain(credentials.icon)
  })

  it('is translated in en and vi', () => {
    const key = 'nav.item.credential-leaks'
    expect((en as Record<string, string>)[key]).toBe('Credential leaks')
    expect((vi as Record<string, string>)[key]).toBeTruthy()
  })
})
