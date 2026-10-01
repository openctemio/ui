/**
 * A sidebar entry must not lead to a scaffold.
 *
 * 37 pages outside the sidebar render tenant-wide dashboard totals under a domain
 * heading: `/controls/list` is 515 lines and derives "controls" from
 * `stats.assets.byType`; `/exposures/credentials` shows EVERY finding in the tenant
 * beneath a "Credential Exposures" title. See docs/nav-coverage.md.
 *
 * They are harmless while nothing links to them. The risk is the next person who
 * reads "we have 107 unreachable pages" and wires a cluster up — which is what I
 * nearly did: an inventory built on "does it import a data hook" called eleven of
 * them ready, and seven were scaffolds. A chart labelled "Credential Exposures"
 * fed by unrelated numbers is worse than an empty page — an empty page is honest,
 * a wrong one gets believed.
 *
 * Rules, checked against the file each sidebar entry points to:
 *
 *   1. No leaf may point at a page whose ONLY data source is `useDashboardStats`.
 *   2. A leaf whose page renders `ComingSoonPage` must carry a badge (ui#339 —
 *      the badge is what stops an unbuilt entry from looking shipped).
 *   3. The reverse: a "Soon" badge must point at a `ComingSoonPage`. SIEM kept
 *      its badge for months after Splunk HEC shipped because only rule 2
 *      existed. The Integrations overview cards follow the same two rules.
 *   4. Every `ComingSoonPage` in src/app is linked from the nav or a card with a
 *      "Soon" badge, so a placeholder can be neither unlabelled nor orphaned.
 *
 * Rule 1 deliberately keys on the `useDashboardStats` import rather than on
 * "has a domain-scoped hook". The looser form is unreliable here: most real pages
 * delegate to a feature section (`<SensorsSection/>`) or call `useSWR<T>(` with a
 * generic, and a first draft of this test flagged fifteen working pages including
 * /sensors, /reports and /secret-store. Keying on the import is exact — measured
 * 2026-08-01: 46 pages import it, 37 have nothing else, and no working sidebar
 * page imports it at all.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { sidebarData } from '../sidebar-data'
import { INTEGRATION_CATEGORIES } from '@/features/integrations/config/integration-categories'
import type { NavCollapsible, NavItem } from '@/components/types'

const APP_DIR = join(process.cwd(), 'src', 'app')

const SCAFFOLD_HOOK = 'useDashboardStats'

/** Hooks that say nothing about whether a page has data of its own. */
const GENERIC_HOOKS = new Set([
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useRouter',
  'useSearchParams',
  'usePathname',
  'useParams',
  'useTenant',
  'usePermissions',
  'useHasPermission',
  'useToast',
  'useForm',
  'useTheme',
  'useDirection',
  'useTranslation',
  'useSidebar',
  'useIsMobile',
  'useDebounce',
  SCAFFOLD_HOOK,
])

interface Leaf {
  title: string
  url: string
  badge?: string
}

function isCollapsible(item: NavItem): item is NavCollapsible {
  return Array.isArray((item as NavCollapsible).items)
}

function collectLeaves(): Leaf[] {
  const leaves: Leaf[] = []
  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      const candidates = isCollapsible(item) ? item.items : [item]
      for (const c of candidates) {
        if (typeof c.url === 'string' && c.url.startsWith('/')) {
          leaves.push({ title: c.title, url: c.url, badge: c.badge })
        }
      }
    }
  }
  return leaves
}

/**
 * Resolve a route to its page file. App Router route groups — `(dashboard)`,
 * `(discovery)` — are invisible in the URL, so the path cannot be derived by
 * string concatenation; walk the tree and match instead.
 */
function findPageFile(url: string): string | null {
  function walk(dir: string, remaining: string[]): string | null {
    if (remaining.length === 0) {
      const page = join(dir, 'page.tsx')
      return existsSync(page) ? page : null
    }
    const [head, ...tail] = remaining
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (!statSync(full).isDirectory()) continue
      // A route group contributes nothing to the URL — descend without consuming.
      if (entry.startsWith('(') && entry.endsWith(')')) {
        const hit = walk(full, remaining)
        if (hit) return hit
      } else if (entry === head) {
        const hit = walk(full, tail)
        if (hit) return hit
      }
    }
    return null
  }

  return walk(APP_DIR, url.split('/').filter(Boolean))
}

/** Hooks the page calls itself, excluding plumbing. Matches `useX(` and `useX<T>(`. */
function ownHooks(source: string): string[] {
  const found = source.match(/\buse[A-Z][A-Za-z0-9]*[(<]/g) ?? []
  return [...new Set(found.map((h) => h.slice(0, -1)))].filter((h) => !GENERIC_HOOKS.has(h))
}

describe('sidebar entries do not lead to scaffolds', () => {
  const leaves = collectLeaves()

  it('walks a non-trivial set of sidebar links', () => {
    expect(leaves.length).toBeGreaterThan(30)
  })

  for (const leaf of leaves) {
    it(`${leaf.title} (${leaf.url})`, () => {
      const file = findPageFile(leaf.url)
      // A sidebar URL with no page file is a separate defect, covered by
      // sidebar-route-consistency.test.ts. Don't fail twice for it.
      if (!file) return

      const source = readFileSync(file, 'utf8')

      if (leaf.badge === 'Soon') {
        expect(
          source.includes('ComingSoonPage'),
          `${leaf.url} is badged "Soon" but its page is not a ComingSoonPage, so the ` +
            `nav says a shipped feature is unbuilt. Drop the badge.`
        ).toBe(true)
      }

      if (source.includes('ComingSoonPage')) {
        expect(
          leaf.badge,
          `${leaf.url} renders ComingSoonPage but carries no badge, so in the nav it ` +
            `looks like every shipped entry. Add badge: 'Soon' (see ui#339).`
        ).toBeTruthy()
        return
      }

      if (!source.includes(SCAFFOLD_HOOK)) return

      expect(
        ownHooks(source),
        `${leaf.url} is in the sidebar but its only data source is ${SCAFFOLD_HOOK}, ` +
          `which returns tenant-wide totals. Under its own heading those numbers will ` +
          `be read as this feature's — in a security product that is worse than an ` +
          `empty page. Give it a scoped hook, make it a ComingSoonPage with a badge, ` +
          `or leave it out of the nav. See docs/nav-coverage.md.`
      ).not.toEqual([])
    })
  }
})

/** Every page file under src/app, with the URL it serves (route groups dropped). */
function allPages(): { url: string; file: string }[] {
  const out: { url: string; file: string }[] = []
  function walk(dir: string, segments: string[]) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        const grouped = entry.startsWith('(') && entry.endsWith(')')
        walk(full, grouped ? segments : [...segments, entry])
      } else if (entry === 'page.tsx') {
        out.push({ url: '/' + segments.join('/'), file: full })
      }
    }
  }
  walk(APP_DIR, [])
  return out
}

describe('"Soon" badges and placeholder pages match both ways', () => {
  const isPlaceholder = (url: string) => {
    const file = findPageFile(url)
    return !!file && readFileSync(file, 'utf8').includes('ComingSoonPage')
  }

  for (const card of INTEGRATION_CATEGORIES) {
    it(`integrations card ${card.title} (${card.href})`, () => {
      expect(
        card.badge === 'Soon',
        `${card.href}: the card badge ("${card.badge ?? 'none'}") does not match the page ` +
          `(${isPlaceholder(card.href) ? 'a ComingSoonPage' : 'a shipped page'}).`
      ).toBe(isPlaceholder(card.href))
    })
  }

  it('every ComingSoonPage is linked somewhere with a "Soon" badge', () => {
    const badged = new Set([
      ...collectLeaves()
        .filter((l) => l.badge === 'Soon')
        .map((l) => l.url),
      ...INTEGRATION_CATEGORIES.filter((c) => c.badge === 'Soon').map((c) => c.href),
    ])
    const placeholders = allPages()
      .filter((p) => readFileSync(p.file, 'utf8').includes('ComingSoonPage'))
      .map((p) => p.url)
    expect(placeholders.length).toBeGreaterThan(0)
    expect(
      placeholders.filter((url) => !badged.has(url)),
      'ComingSoonPage routes with no "Soon"-badged link. Link them with a badge, or ' +
        'delete the placeholder (an orphan placeholder is dead code).'
    ).toEqual([])
  })
})
