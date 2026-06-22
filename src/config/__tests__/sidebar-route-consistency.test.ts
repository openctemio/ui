/**
 * Sidebar ↔ route-permissions consistency
 *
 * Guards against the "Feature Not Available" UX bug: a sidebar item is
 * visible (because its inherited module is enabled) but the route guard
 * blocks it (because the URL is bound to a different, disabled module).
 *
 * For every leaf NavLink with a URL whose route requires a module:
 *   the effective module on the sidebar item (own or inherited from a
 *   collapsible parent) MUST equal the module enforced by the route guard.
 *
 * If this test fails, either:
 *   - add `module: '<id>'` to the sidebar entry, or
 *   - update route-permissions.ts so the route uses the same module.
 */

import { describe, it, expect } from 'vitest'
import { sidebarData } from '../sidebar-data'
import { matchRoutePermission } from '../route-permissions'
import type { NavCollapsible, NavItem } from '@/components/types'

interface LeafBinding {
  title: string
  url: string
  module?: string
  parentTitle?: string
  parentModule?: string
}

function isCollapsible(item: NavItem): item is NavCollapsible {
  return Array.isArray((item as NavCollapsible).items)
}

function collectLeaves(): LeafBinding[] {
  const leaves: LeafBinding[] = []

  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      if (isCollapsible(item)) {
        for (const child of item.items) {
          if (typeof child.url === 'string' && child.url.startsWith('/')) {
            leaves.push({
              title: child.title,
              url: child.url,
              module: child.module,
              parentTitle: item.title,
              parentModule: item.module,
            })
          }
        }
        continue
      }
      if (typeof item.url === 'string' && item.url.startsWith('/')) {
        leaves.push({
          title: item.title,
          url: item.url,
          module: item.module,
        })
      }
    }
  }

  return leaves
}

describe('sidebar ↔ route-permissions module consistency', () => {
  const leaves = collectLeaves()

  it('discovers a non-trivial set of sidebar links', () => {
    expect(leaves.length).toBeGreaterThan(20)
  })

  for (const leaf of leaves) {
    const routeConfig = matchRoutePermission(leaf.url)
    const requiredModule = routeConfig?.module
    if (!requiredModule) continue

    const effectiveModule = leaf.module ?? leaf.parentModule

    it(`${leaf.title} (${leaf.url}) sidebar module matches route guard`, () => {
      expect(
        effectiveModule,
        `Sidebar entry "${leaf.title}" → ${leaf.url} ` +
          `inherits/binds module "${effectiveModule ?? 'NONE'}" but ` +
          `route guard requires "${requiredModule}". Either bind the ` +
          `correct module on the sidebar item or align the route guard.`
      ).toBe(requiredModule)
    })
  }
})
