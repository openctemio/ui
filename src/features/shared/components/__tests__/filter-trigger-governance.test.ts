/**
 * Every filter trigger is the shared `FilterButton` (filter-button.tsx).
 *
 * The owner agreed the Filters button is an icon-only square with the
 * filter-lines icon. Findings got it; every other list page kept a hand-built
 * "[≡ Filters]" text button (scans, vulnerabilities, pentest x4, remediation,
 * the asset property filter), because each page drew its own. This test makes
 * the shared component the only way to draw one, so one change restyles all.
 *
 * Rules, checked over every .tsx file under src/ (tests excluded):
 *
 *   1. No file other than filter-button.tsx imports a filter icon from
 *      lucide-react (ListFilter, Filter, Funnel and their variants). A page
 *      that needs a filter trigger renders `FilterButton` / `FilterPanelToggle`
 *      (or passes `filterToggle` to `DataTable`). A filter icon used for
 *      something that is NOT a trigger must be allowlisted below with a reason.
 *   2. No button-like element (Button, button, a Radix trigger) carries the
 *      bare label "Filter(s)" / "Add filter" / "More filters" as its text — the
 *      text version this replaced, whatever icon sits next to it.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC = join(process.cwd(), 'src')
const SHARED_COMPONENT = 'src/features/shared/components/filter-button.tsx'

const FILTER_ICONS = new Set([
  'Filter',
  'FilterIcon',
  'FilterX',
  'ListFilter',
  'ListFilterIcon',
  'ListFilterPlus',
  'Funnel',
  'FunnelIcon',
  'FunnelPlus',
  'FunnelX',
])

/** file -> icons it may import, and why it is not a filter trigger. */
const ICON_ALLOWLIST: Record<string, { icons: string[]; reason: string }> = {
  'src/app/(dashboard)/findings/page.tsx': {
    icons: ['Filter'],
    reason:
      'Context chip ("filtered to asset X") above the table marks an applied filter; it is a label, not a trigger.',
  },
  'src/app/(dashboard)/(discovery)/assets/repositories/[id]/page.tsx': {
    icons: ['Filter'],
    reason: 'Activity-feed icon for the "finding triaged" event type.',
  },
  'src/features/scans/components/filtering-result-banner.tsx': {
    icons: ['Filter'],
    reason: 'Banner reporting how many scan results the scanner filtered out; no trigger.',
  },
}

/** Elements that act as a button. */
const TRIGGER_TAGS = [
  'Button',
  'button',
  'PopoverTrigger',
  'SheetTrigger',
  'DialogTrigger',
  'DropdownMenuTrigger',
  'CollapsibleTrigger',
  'SelectTrigger',
]

const TEXT_LABEL = /^(add |more |advanced |show |hide )?filters?:?$/i

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      walk(full, out)
    } else if (name.endsWith('.tsx') && !/\.(test|spec)\.tsx$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

const files = walk(SRC).map((full) => ({
  path: relative(process.cwd(), full).split(sep).join('/'),
  source: readFileSync(full, 'utf8'),
}))

/** Names imported from lucide-react (the original name, before any `as`). */
function lucideImports(source: string): string[] {
  const names: string[] = []
  const re = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g
  for (const m of source.matchAll(re)) {
    for (const part of m[1].split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim()
      if (name) names.push(name)
    }
  }
  return names
}

/** Visible text of trigger elements whose whole text is a bare "Filters" label. */
function textFilterTriggers(source: string): string[] {
  const hits: string[] = []
  for (const tag of TRIGGER_TAGS) {
    const re = new RegExp(
      `<${tag}\\b(?:[^>"'{]|"[^"]*"|'[^']*'|\\{[^}]*\\})*>([\\s\\S]*?)</${tag}>`,
      'g'
    )
    for (const m of source.matchAll(re)) {
      // Drop expressions (counts, conditional badges) innermost-first, then
      // child tags (icons, spans), leaving the visible literal text.
      let text = m[1]
      for (let prev = ''; prev !== text;) {
        prev = text
        text = text.replace(/\{[^{}]*\}/g, ' ')
      }
      text = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (TEXT_LABEL.test(text)) hits.push(`<${tag}> "${text}"`)
    }
  }
  return hits
}

describe('filter trigger governance', () => {
  it('scans a real tree', () => {
    expect(files.length).toBeGreaterThan(300)
    expect(files.some((f) => f.path === SHARED_COMPONENT)).toBe(true)
  })

  it('the shared component uses the agreed icon', () => {
    const shared = files.find((f) => f.path === SHARED_COMPONENT)!
    expect(lucideImports(shared.source)).toContain('ListFilter')
  })

  it('only the shared component imports a filter icon (rule 1)', () => {
    const offenders: string[] = []
    for (const f of files) {
      if (f.path === SHARED_COMPONENT) continue
      const allowed = new Set(ICON_ALLOWLIST[f.path]?.icons ?? [])
      for (const name of lucideImports(f.source)) {
        if (FILTER_ICONS.has(name) && !allowed.has(name)) offenders.push(`${f.path}: ${name}`)
      }
    }
    expect(
      offenders,
      'Render <FilterButton>/<FilterPanelToggle> from @/features/shared (or DataTable filterToggle) instead of a filter icon. ' +
        'If the icon is not a filter trigger, add it to ICON_ALLOWLIST with a reason.'
    ).toEqual([])
  })

  it('every allowlist entry is still needed', () => {
    const stale: string[] = []
    for (const [path, { icons, reason }] of Object.entries(ICON_ALLOWLIST)) {
      expect(reason.length).toBeGreaterThan(20)
      const f = files.find((x) => x.path === path)
      const imported = f ? lucideImports(f.source) : []
      for (const icon of icons) if (!imported.includes(icon)) stale.push(`${path}: ${icon}`)
    }
    expect(stale).toEqual([])
  })

  it('no button carries a bare "Filters" text label (rule 2)', () => {
    const offenders: string[] = []
    for (const f of files) {
      if (f.path === SHARED_COMPONENT) continue
      for (const hit of textFilterTriggers(f.source)) offenders.push(`${f.path}: ${hit}`)
    }
    expect(offenders, 'Use the icon-only <FilterButton> from @/features/shared.').toEqual([])
  })

  it('the detectors catch the patterns this replaced', () => {
    expect(lucideImports(`import { Lock, ListFilter as LF } from 'lucide-react'`)).toContain(
      'ListFilter'
    )
    expect(
      textFilterTriggers(`<Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <SlidersHorizontal className="me-2 h-4 w-4" />
        Filters
        {count > 0 && <span>{count}</span>}
      </Button>`)
    ).toHaveLength(1)
    expect(
      textFilterTriggers(
        `<Button variant="outline"><ListFilter /><span className="ms-2">Filters</span>{badge}</Button>`
      )
    ).toHaveLength(1)
    expect(textFilterTriggers(`<Button size="sm">Add Filter</Button>`)).toHaveLength(1)
    // Not triggers: clearing filters, or a sentence.
    expect(textFilterTriggers(`<Button onClick={clear}>Clear filters</Button>`)).toEqual([])
    expect(textFilterTriggers(`<p className="text-sm font-semibold">Filters</p>`)).toEqual([])
  })
})
