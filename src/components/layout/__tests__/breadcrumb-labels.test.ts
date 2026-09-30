import { describe, it, expect } from 'vitest'
import { breadcrumbLabel } from '../breadcrumb-labels'
import { sidebarData } from '@/config/sidebar-data'

describe('breadcrumbLabel', () => {
  it('uses the sidebar title for a path the sidebar lists', () => {
    // Whatever the menu calls a page, the trail calls it too.
    const first = sidebarData.navGroups
      .flatMap((g) => g.items as Array<{ title: string; url?: string }>)
      .find((i) => i.url && i.url !== '/')!
    expect(breadcrumbLabel(first.url!, first.url!.split('/').pop()!)).toBe(first.title)
  })

  it('falls back to known section names, then to sentence case', () => {
    expect(breadcrumbLabel('/settings', 'settings')).toBe('Settings')
    expect(breadcrumbLabel('/settings/api-keys', 'api-keys')).toBe('API keys')
    expect(breadcrumbLabel('/x/some-new-page', 'some-new-page')).toBe('Some new page')
    // A generic menu title is not a useful trail label.
    expect(breadcrumbLabel('/settings/integrations', 'integrations')).toBe('Integrations')
  })
})
