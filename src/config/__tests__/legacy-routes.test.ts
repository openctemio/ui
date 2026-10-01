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

import { LEGACY_ROUTE_REDIRECTS, type LegacyRouteRedirect } from '../legacy-routes'
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

/** Apply one rule to `path?query`; null when it does not match. */
function applyRule(r: LegacyRouteRedirect, url: string): string | null {
  const [path, qs = ''] = url.split('?')
  const query = new URLSearchParams(qs)
  for (const h of r.has ?? []) {
    if (!query.has(h.key) || (h.value !== undefined && query.get(h.key) !== h.value)) return null
  }
  for (const m of r.missing ?? []) {
    if (query.has(m.key) && (m.value === undefined || query.get(m.key) === m.value)) return null
  }
  let dest: string
  if (r.source.endsWith('/:path*')) {
    const prefix = r.source.slice(0, -'/:path*'.length)
    if (path !== prefix && !path.startsWith(`${prefix}/`)) return null
    dest = r.destination.replace('/:path*', path.slice(prefix.length))
  } else {
    if (path !== r.source) return null
    dest = r.destination
  }
  // Next.js appends the incoming query to the destination's own query.
  const [dPath, dQs = ''] = dest.split('?')
  const merged = new URLSearchParams(dQs)
  query.forEach((v, k) => {
    if (!merged.has(k)) merged.set(k, v)
  })
  const out = merged.toString()
  return out ? `${dPath}?${out}` : dPath
}

/** First matching rule wins, as in Next.js. */
function redirectOnce(url: string): string | null {
  for (const r of LEGACY_ROUTE_REDIRECTS) {
    const hit = applyRule(r, url)
    if (hit !== null) return hit
  }
  return null
}

/** A concrete URL that a rule's source matches. */
function sampleSource(r: LegacyRouteRedirect): string {
  const path = r.source.replace('/:path*', '')
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
  })
})
