/**
 * The full redirect list served by next.config.ts. Each rule is applied the way
 * Next.js applies it (exact source, or `:path*` keeping the rest of the path,
 * optional `has`/`missing` query conditions), then checked for the three ways
 * a redirect list rots: a destination that 404s, a chain (A -> B -> C costs a
 * round trip per hop and hides the real home of B), and a loop.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import {
  LEGACY_ROUTE_REDIRECTS,
  applyLegacyRoute,
  resolveLegacyRoute,
  splitSource,
  type LegacyRouteRedirect,
} from '../legacy-routes'
import nextConfig from '../../../next.config'

const APP = join(__dirname, '..', '..', 'app')

/** Resolve a URL path to its page file, walking through route groups. */
function pageExists(path: string): boolean {
  const segs = path.split('?')[0].split('/').filter(Boolean)
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
      } else if (/^\[\.\.\.[^\]]+\]$/.test(entry) || /^\[\[\.\.\.[^\]]+\]\]$/.test(entry)) {
        return true
      }
    }
    return false
  }
  return walk(APP, segs)
}

const applyRule = applyLegacyRoute
const redirectOnce = (url: string) => resolveLegacyRoute(url)

/** A concrete URL that a rule's source matches. */
function sampleSource(r: LegacyRouteRedirect): string {
  const path =
    '/' +
    splitSource(r.source.replace('/:path*', ''))
      .map((seg) => (seg.startsWith(':') ? 'sample1' : seg))
      .join('/')
  const q = new URLSearchParams()
  for (const h of r.has ?? []) q.set(h.key, h.value ?? 'x')
  const qs = q.toString()
  return qs ? `${path}?${qs}` : path
}

describe('legacy route redirects', () => {
  it('next.config serves exactly this list', async () => {
    expect(await nextConfig.redirects?.()).toEqual(LEGACY_ROUTE_REDIRECTS)
  })

  it('are all permanent (308)', () => {
    expect(LEGACY_ROUTE_REDIRECTS.every((r) => r.permanent === true)).toBe(true)
  })

  it('list each source + condition once', () => {
    const keys = LEGACY_ROUTE_REDIRECTS.map((r) => JSON.stringify([r.source, r.has, r.missing]))
    expect(new Set(keys).size).toBe(keys.length)
  })

  for (const r of LEGACY_ROUTE_REDIRECTS) {
    const from = sampleSource(r)
    describe(`${from}`, () => {
      const to = applyRule(r, from)

      it('is matched by its own rule, and the first matching rule is this one', () => {
        expect(to).not.toBeNull()
        expect(redirectOnce(from)).toBe(to)
      })

      it('lands on a page that exists', () => {
        expect(pageExists(to!), `${from} -> ${to}: no page`).toBe(true)
      })

      it('lands in one hop (no chain, no loop)', () => {
        expect(redirectOnce(to!), `${from} -> ${to} -> ${redirectOnce(to!)}`).toBeNull()
      })

      if (!r.has && !r.missing) {
        it('replaces a page that is gone', () => {
          expect(pageExists(from), `${from} still has a page, so the redirect hides it`).toBe(false)
        })
      }
    })
  }

  it('keeps the rest of the path and the query string', () => {
    expect(redirectOnce('/agents/abc?status=offline')).toBe('/sensors/abc?status=offline')
    expect(redirectOnce('/settings/integrations/apps?x=1')).toBe('/settings/integrations?x=1')
    expect(redirectOnce('/settings/integrations')).toBeNull()
    // Validation, campaign-first.
    expect(redirectOnce('/pentest/findings')).toBe('/findings?sources=pentest')
    expect(redirectOnce('/pentest/findings?campaign=c1')).toBe(
      '/pentest/campaigns/c1?view=findings&campaign=c1'
    )
    expect(redirectOnce('/pentest/findings/new?campaign=c1')).toBeNull()
    expect(redirectOnce('/pentest/reports')).toBe('/reports?tab=pentest')
    expect(redirectOnce('/pentest/reports?campaign=c1')).toBe(
      '/pentest/campaigns/c1?view=report&campaign=c1'
    )
    expect(redirectOnce('/pentest/retests?tab=history')).toBe('/validation/retests?tab=history')
    expect(redirectOnce('/pentest/mitre-coverage')).toBe('/validation/attack-coverage')
    expect(redirectOnce('/pentest/templates/abc/edit')).toBe('/settings/pentest/templates/abc/edit')
    expect(redirectOnce('/pentest/campaigns')).toBeNull()
    // Notification deep links.
    expect(redirectOnce('/pentest/campaigns?id=c9')).toBe('/pentest/campaigns/c9?id=c9')
    expect(redirectOnce('/pentest/findings/f7')).toBe('/findings/f7')
    expect(redirectOnce('/pentest/findings/new')).toBeNull()
    expect(redirectOnce('/pentest/findings/f7/edit')).toBeNull()
    expect(redirectOnce('/settings/notifications')).toBe('/account/notifications')
    expect(redirectOnce('/settings/users')).toBe('/settings/members')
    expect(redirectOnce('/settings/access-control/groups/abc')).toBe('/settings/teams/abc')
    expect(redirectOnce('/settings/access-control/assignment-rules')).toBe(
      '/settings/teams?tab=assignment-rules'
    )
    expect(redirectOnce('/settings/access-control/permission-sets')).toBeNull()
    expect(redirectOnce('/settings/tenant')).toBe('/settings/general')
    expect(redirectOnce('/settings/tenant?tab=storage')).toBe('/settings/general?tab=storage')
    expect(redirectOnce('/settings/tenant?tab=security')).toBe(
      '/settings/authentication?tab=security'
    )
    expect(redirectOnce('/settings/tenant/create')).toBeNull()
    expect(redirectOnce('/settings/audit')).toBe('/settings/audit-log')
    expect(redirectOnce('/settings/scoring')).toBe('/settings/risk-scoring')
    expect(redirectOnce('/settings/priority-rules/x?y=1')).toBe('/priority-rules/x?y=1')
  })
})
