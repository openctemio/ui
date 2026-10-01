/**
 * The settings nav config (src/config/settings-nav.ts) against the app tree,
 * the route guard, the i18n catalogs and the old Settings sidebar group.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import {
  activeSettingsItem,
  isSettingsShellPath,
  matchesSettingsQuery,
  settingsNav,
  settingsNavItems,
} from '../settings-nav'
import { matchRoutePermission } from '../route-permissions'
import { resolveLegacyRoute } from '../legacy-routes'
import { sidebarData } from '../sidebar-data'
import en from '@/lib/i18n/dictionaries/en.json'
import vi from '@/lib/i18n/dictionaries/vi.json'
import type { NavCollapsible, NavItem } from '@/components/types'

const APP_DIR = join(process.cwd(), 'src', 'app')

/** Resolve a URL to its page file through route groups (see sidebar-no-scaffolds). */
function findPageFile(url: string): string | null {
  function walk(dir: string, rest: string[]): string | null {
    if (rest.length === 0) {
      const page = join(dir, 'page.tsx')
      return existsSync(page) ? page : null
    }
    const [head, ...tail] = rest
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (!statSync(full).isDirectory()) continue
      if (entry.startsWith('(') && entry.endsWith(')')) {
        const hit = walk(full, rest)
        if (hit) return hit
      } else if (entry === head) {
        const hit = walk(full, tail)
        if (hit) return hit
      }
    }
    return null
  }
  return walk(APP_DIR, url.split('?')[0].split('/').filter(Boolean))
}

/** Static page URLs under a prefix (dynamic segments skipped). */
function staticPagesUnder(prefix: string): string[] {
  const out: string[] = []
  function walk(dir: string, segs: string[]) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        if (entry.startsWith('[')) continue
        const grouped = entry.startsWith('(') && entry.endsWith(')')
        walk(full, grouped ? segs : [...segs, entry])
      } else if (entry === 'page.tsx') {
        out.push('/' + segs.join('/'))
      }
    }
  }
  walk(APP_DIR, [])
  return out.filter((u) => u === prefix || u.startsWith(`${prefix}/`))
}

const isPersonal = (url: string) => url === '/account' || url.startsWith('/account/')

describe('settings nav config', () => {
  it('has the six groups in order', () => {
    expect(settingsNav.map((g) => g.id)).toEqual([
      'account',
      'organization',
      'access',
      'policies',
      'scanning',
      'integrations',
    ])
  })

  it('has unique ids and urls', () => {
    const ids = settingsNavItems.map((i) => i.id)
    const urls = settingsNavItems.map((i) => i.url)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(urls).size).toBe(urls.length)
  })

  for (const group of settingsNav) {
    it(`group "${group.title}" has 2 to 8 items`, () => {
      expect(group.items.length).toBeGreaterThanOrEqual(2)
      expect(group.items.length).toBeLessThanOrEqual(8)
    })
  }

  it('titles are sentence case (acronyms allowed)', () => {
    const titles = [...settingsNav.map((g) => g.title), ...settingsNavItems.map((i) => i.title)]
    for (const title of titles) {
      const [first, ...rest] = title.split(' ')
      expect(first[0], title).toBe(first[0].toUpperCase())
      for (const word of rest) {
        const ok = word === word.toLowerCase() || /^\(?[A-Z0-9/]{2,}\)?$/.test(word)
        expect(ok, `"${title}": "${word}" is not sentence case`).toBe(true)
      }
    }
  })
})

describe('every settings item', () => {
  for (const item of settingsNavItems) {
    describe(`${item.title} (${item.url})`, () => {
      const file = findPageFile(item.url)

      it('has a page', () => {
        expect(file, `${item.url} has no page.tsx`).not.toBeNull()
      })

      it('is not a scaffold', () => {
        if (!file) return
        const src = readFileSync(file, 'utf8')
        expect(src.includes('useDashboardStats'), `${item.url} reads only dashboard totals`).toBe(
          false
        )
      })

      it('has a "Soon" badge exactly when the page is a ComingSoonPage', () => {
        if (!file) return
        const placeholder = readFileSync(file, 'utf8').includes('ComingSoonPage')
        expect(item.badge === 'Soon', `${item.url}: badge vs page disagree`).toBe(placeholder)
      })

      it('asks for what the route guard enforces', () => {
        const guard = matchRoutePermission(item.url)
        if (isPersonal(item.url) || !item.permission) {
          // The user's own pages: no permission in the nav, none in the guard.
          expect(guard, `${item.url} is personal but the guard gates it`).toBeUndefined()
          expect(item.permission).toBeUndefined()
          expect(item.module).toBeUndefined()
          return
        }
        expect(guard, `${item.url} has no route-permissions entry`).toBeDefined()
        expect(item.permission).toBe(guard!.permission)
        expect(item.module).toBe(guard!.module)
      })

      it('has en and vi strings', () => {
        for (const dict of [en, vi] as Record<string, string>[]) {
          expect(dict[`settings.item.${item.id}`], `settings.item.${item.id}`).toBeTruthy()
          expect(dict[`settings.desc.${item.id}`], `settings.desc.${item.id}`).toBeTruthy()
        }
        expect((en as Record<string, string>)[`settings.item.${item.id}`]).toBe(item.title)
      })
    })
  }

  it('group titles have en and vi strings', () => {
    for (const g of settingsNav) {
      expect((en as Record<string, string>)[`settings.group.${g.id}`]).toBe(g.title)
      expect((vi as Record<string, string>)[`settings.group.${g.id}`]).toBeTruthy()
    }
  })
})

describe('/account pages are ungated', () => {
  for (const url of staticPagesUnder('/account')) {
    it(url, () => {
      expect(matchRoutePermission(url)).toBeUndefined()
    })
  }
})

describe('settings shell', () => {
  it('owns /settings, /account and every item url (with sub-pages)', () => {
    for (const p of [
      '/settings',
      '/settings/members',
      '/settings/integrations/notifications/history',
      '/account',
      '/account/security',
      '/scan-profiles',
      '/scan-profiles/abc',
      '/secret-store',
      '/tools',
      '/capabilities',
    ]) {
      expect(isSettingsShellPath(p), p).toBe(true)
    }
  })

  it('leaves the app sidebar on app pages, Priority rules and org creation', () => {
    // Priority rules now live at /priority-rules (the old /settings path 308s).
    for (const p of [
      '/',
      '/scans',
      '/sensors',
      '/scan-profilesx',
      '/priority-rules',
      '/priority-rules/abc',
      '/settings/tenant/create',
    ]) {
      expect(isSettingsShellPath(p), p).toBe(false)
    }
  })

  it('marks the deepest matching item current', () => {
    expect(activeSettingsItem('/settings/integrations')?.id).toBe('all-integrations')
    expect(activeSettingsItem('/settings/integrations/scm')?.id).toBe('source-control')
    expect(activeSettingsItem('/settings/integrations/notifications/outbox')?.id).toBe(
      'notification-channels'
    )
    expect(activeSettingsItem('/account')?.id).toBe('profile')
    expect(activeSettingsItem('/account/security')?.id).toBe('account-security')
    expect(activeSettingsItem('/scan-profiles/123')?.id).toBe('scan-profiles')
  })

  it('every static page in the shell is an item, a sub-page of one, or a known exception', () => {
    // Deliberately not in the rail:
    const EXCEPTIONS = new Set([
      // "SSO is managed by your platform administrator" landing pages for old links.
      '/settings/integrations/saml',
      '/settings/integrations/verified-domains',
      // Unlinked until the IAM model decision (owner decision D5).
      '/settings/access-control/permission-sets',
    ])
    const pages = [...staticPagesUnder('/settings'), ...staticPagesUnder('/account')].filter(
      (u) => u !== '/settings' && isSettingsShellPath(u)
    )
    const orphans = pages.filter((u) => !EXCEPTIONS.has(u) && !activeSettingsItem(u))
    expect(orphans, 'settings pages with no rail entry').toEqual([])
  })
})

describe('nothing left the command palette', () => {
  // Every destination of the old sidebar "Settings" group and the user menus.
  const FORMER_SETTINGS_URLS = [
    '/sensors',
    '/capabilities',
    '/tools',
    '/secret-store',
    '/scan-profiles',
    '/scanner-templates',
    '/template-sources',
    '/settings/tenant',
    '/settings/users',
    '/settings/roles',
    '/settings/access-control/groups',
    '/settings/access-control/assignment-rules',
    '/settings/audit',
    '/settings/scoring',
    '/settings/asset-lifecycle',
    '/settings/modules',
    '/settings/pentest',
    '/settings/sla-policies',
    '/settings/integrations',
    '/settings/integrations/scm',
    '/settings/integrations/notifications',
    '/settings/integrations/cicd',
    '/settings/integrations/ticketing',
    '/settings/integrations/siem',
    '/settings/integrations/scim-tokens',
    '/settings/integrations/mcp',
    '/account/notifications', // was /settings/notifications (308)
    '/account',
    '/account/security',
    '/account/preferences',
    '/account/activity',
  ]

  function sidebarUrls(): string[] {
    const urls: string[] = []
    for (const g of sidebarData.navGroups) {
      for (const item of g.items as NavItem[]) {
        if (Array.isArray((item as NavCollapsible).items)) {
          for (const c of (item as NavCollapsible).items) urls.push(String(c.url))
        } else {
          urls.push(String((item as { url: string }).url))
        }
      }
    }
    return urls
  }

  it('each is in the main sidebar or the settings nav (both feed ⌘K), at its current URL', () => {
    const indexed = new Set([...sidebarUrls(), ...settingsNavItems.map((i) => i.url)])
    // A moved page counts through its 308 (the query part, e.g. a tab, is dropped).
    const current = (u: string) => (resolveLegacyRoute(u) ?? u).split('?')[0]
    expect(FORMER_SETTINGS_URLS.filter((u) => !indexed.has(current(u)))).toEqual([])
  })

  it('the main sidebar keeps a single Settings link and no settings pages', () => {
    const urls = sidebarUrls()
    expect(urls.filter((u) => u === '/settings')).toHaveLength(1)
    const settingsUrls = new Set(settingsNavItems.map((i) => i.url))
    expect(urls.filter((u) => settingsUrls.has(u))).toEqual([])
    expect(sidebarData.navGroups.some((g) => g.title === 'Settings')).toBe(false)
  })
})

describe('filter', () => {
  const item = settingsNavItems.find((i) => i.id === 'api-keys')!
  const labels = { title: 'API keys', description: item.description, group: 'Access' }

  it('matches title, description, group and keywords, case-insensitively', () => {
    expect(matchesSettingsQuery(item, 'api', labels)).toBe(true)
    expect(matchesSettingsQuery(item, 'TOKEN', labels)).toBe(true)
    expect(matchesSettingsQuery(item, 'access keys', labels)).toBe(true)
    expect(matchesSettingsQuery(item, 'splunk', labels)).toBe(false)
    expect(matchesSettingsQuery(item, '   ', labels)).toBe(true)
  })

  it('ignores accents (Vietnamese labels)', () => {
    expect(
      matchesSettingsQuery(item, 'khoa', { title: 'Khóa API', description: '', group: '' })
    ).toBe(true)
  })
})
