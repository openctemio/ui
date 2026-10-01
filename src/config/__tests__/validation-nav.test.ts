/**
 * The Validation section is campaign-first and at most two levels deep (group,
 * then item): a campaign's findings, retests and report are tabs of its page,
 * not sidebar entries.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { sidebarData } from '../sidebar-data'
import { resolveLegacyRoute } from '../legacy-routes'
import type { NavCollapsible, NavItem } from '@/components/types'

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
      } else if (entry === head || /^\[[^.\]]+\]$/.test(entry)) {
        if (walk(full, tail)) return true
      }
    }
    return false
  }
  return walk(APP, url.split('?')[0].split('/').filter(Boolean))
}

const group = (title: string) => sidebarData.navGroups.find((g) => g.title === title)!
const isCollapsible = (i: NavItem): i is NavCollapsible =>
  Array.isArray((i as NavCollapsible).items)

describe('Validation section', () => {
  const validation = group('Validation')

  it('is two levels deep: no nested sections', () => {
    expect(validation.items.filter(isCollapsible)).toEqual([])
  })

  it('lists the approved items, in order', () => {
    expect(validation.items.map((i) => [i.title, (i as { url: string }).url])).toEqual([
      ['Overview', '/validation'],
      ['Pentest campaigns', '/pentest/campaigns'],
      ['Attack simulation', '/attack-simulation'],
      ['Control testing', '/control-testing'],
      ['Retest queue', '/validation/retests'],
      ['ATT&CK coverage', '/validation/attack-coverage'],
    ])
  })

  it('keeps every module gate', () => {
    expect(validation.items.map((i) => i.module)).toEqual([
      undefined,
      'pentest',
      'attack_simulation',
      'control_testing',
      'pentest',
      'mitre_coverage',
    ])
  })

  it('every item has a page', () => {
    for (const i of validation.items) {
      const url = (i as { url: string }).url
      expect(pageExists(url), url).toBe(true)
    }
  })

  it('Compensating controls moved to Prioritization', () => {
    const urls = (title: string) => group(title).items.map((i) => (i as { url?: string }).url)
    expect(urls('Prioritization')).toContain('/controls')
    expect(urls('Validation')).not.toContain('/controls')
  })

  it('every old pentest list URL resolves to a page', () => {
    for (const old of [
      '/pentest/findings',
      '/pentest/findings?campaign=abc',
      '/pentest/retests',
      '/pentest/reports',
      '/pentest/reports?campaign=abc',
      '/pentest/templates',
      '/pentest/templates/new',
      '/pentest/mitre-coverage',
    ]) {
      const to = resolveLegacyRoute(old)
      expect(to, old).not.toBeNull()
      expect(pageExists(to!), `${old} -> ${to}`).toBe(true)
    }
  })

  it('the campaign page, retest queue, overview and finding library exist', () => {
    for (const u of [
      '/pentest/campaigns/x',
      '/validation',
      '/validation/retests',
      '/validation/attack-coverage',
      '/settings/pentest/templates',
      '/settings/pentest/templates/new',
      '/settings/pentest/templates/x/edit',
      '/pentest/findings/new',
    ]) {
      expect(pageExists(u), u).toBe(true)
    }
  })
})
