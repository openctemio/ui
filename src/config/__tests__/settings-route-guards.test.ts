/**
 * Route-guard rules for the settings area that the sidebar cannot show.
 *
 * - A user's OWN settings pages carry no permission at all: they are linked from
 *   every user's menu, so any gate turns the menu into an Access Denied link
 *   (that is what happened to /settings/notifications under team:update).
 * - Org-level notification channels stay gated.
 * - A sidebar entry must ask for the permission the route guard enforces.
 *   Otherwise the entry is shown to people the page then refuses (or hidden
 *   from people it would admit): /settings/pentest was team:update in the
 *   sidebar but validation:write in the guard.
 */
import { describe, expect, it } from 'vitest'
import { matchRoutePermission } from '../route-permissions'
import { sidebarData } from '../sidebar-data'
import { settingsNavItems } from '../settings-nav'
import { Permission } from '@/lib/permissions'
import type { NavCollapsible, NavItem } from '@/components/types'

function isCollapsible(item: NavItem): item is NavCollapsible {
  return Array.isArray((item as NavCollapsible).items)
}

describe('personal settings are ungated', () => {
  for (const path of [
    '/settings/notifications',
    '/account',
    '/account/security',
    '/account/preferences',
    '/account/activity',
  ]) {
    it(path, () => {
      expect(matchRoutePermission(path)).toBeUndefined()
    })
  }
})

describe('org notification channels stay gated', () => {
  for (const path of [
    '/settings/integrations/notifications',
    '/settings/integrations/notifications/history',
    '/settings/integrations/notifications/outbox',
  ]) {
    it(path, () => {
      const cfg = matchRoutePermission(path)
      expect(cfg?.permission).toBe(Permission.IntegrationsRead)
      expect(cfg?.module).toBe('integrations')
    })
  }
})

describe('sidebar entries ask for the permission their route enforces', () => {
  const leaves: { title: string; url: string; permission?: string | string[] }[] = []
  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      if (isCollapsible(item)) {
        for (const child of item.items) {
          leaves.push({
            title: `${item.title} > ${child.title}`,
            url: String(child.url),
            permission: child.permission ?? item.permission,
          })
        }
      } else {
        leaves.push({ title: item.title, url: String(item.url), permission: item.permission })
      }
    }
  }

  it('walks the sidebar', () => {
    expect(leaves.length).toBeGreaterThan(30)
  })

  for (const leaf of leaves) {
    const guard = matchRoutePermission(leaf.url)
    if (!guard) continue
    it(`${leaf.title} (${leaf.url})`, () => {
      const nav = Array.isArray(leaf.permission) ? leaf.permission : [leaf.permission]
      expect(
        nav,
        `"${leaf.title}" is shown for ${JSON.stringify(leaf.permission)} but ${leaf.url} ` +
          `requires ${guard.permission}.`
      ).toContain(guard.permission)
    })
  }
})

describe('sub-module keys exist', () => {
  // Sub-modules the API defines under `integrations` (api migrations/000004
  // and later: GET /api/v1/me/modules -> sub_modules.integrations). A key
  // that is not in this list hides its entry for every tenant, which is what
  // a `scim` key did to SCIM Provisioning.
  const INTEGRATIONS_SUB_MODULES = [
    'scm',
    'notifications',
    'ticketing',
    'cloud',
    'siem',
    'scanners',
    'webhooks_int',
    'api_int',
    'pipelines_int',
  ]

  it('every sidebar and settings-rail subModuleKey is a real integrations sub-module', () => {
    const keys: string[] = settingsNavItems.flatMap((i) => (i.subModuleKey ? [i.subModuleKey] : []))
    expect(keys.length).toBeGreaterThan(3)
    for (const group of sidebarData.navGroups) {
      for (const item of group.items) {
        if (isCollapsible(item)) {
          for (const child of item.items) if (child.subModuleKey) keys.push(child.subModuleKey)
        }
      }
    }
    expect(keys.filter((k) => !INTEGRATIONS_SUB_MODULES.includes(k))).toEqual([])
  })
})
