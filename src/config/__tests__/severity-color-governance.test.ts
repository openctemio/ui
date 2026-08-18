import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Severity-color governance guard.
 *
 * The severity → color mapping has a single source of truth at
 * `src/lib/severity-colors.ts`. This test fails if a NEW file hard-codes an
 * inline severity/criticality/priority → Tailwind-color map instead of deriving
 * from that source. It does not (yet) forbid the known legacy sites below — that
 * debt shrinks as they migrate (criticality gets its own `criticality-colors.ts`
 * source next). The point is: the ratchet only tightens. If you're here because
 * this test failed, don't add your file to the allowlist — import the palette
 * from `src/lib/severity-colors.ts` (or `criticality-colors.ts`) instead.
 */

const SRC = join(__dirname, '..', '..')

// Matches an inline "<severity-word>: '…bg/text/border-<hue>-…'" object entry or
// a `case 'critical': return '…bg-…'` switch arm.
const INLINE_MAP =
  /(?:\b(?:critical|high|medium|low|info)\b['"]?\s*:\s*['"`][^'"`]*\b(?:bg|text|border|ring|from|to)-(?:red|orange|amber|yellow|green|emerald|lime|blue|sky|slate|gray|zinc)-)|(?:case\s+['"](?:critical|high|medium|low)['"]\s*:\s*return\s*['"`][^'"`]*(?:bg|text|border)-)/

// Known legacy sites (criticality/priority/other-domain or shape-incompatible
// residual). New code must NOT extend this list — migrate to a *-colors source.
const ALLOWLIST = new Set(
  [
    'app/(dashboard)/(discovery)/assets/[id]/page.tsx',
    'app/(dashboard)/(discovery)/credentials/page.tsx',
    'app/(dashboard)/(prioritization)/attack-paths/page.tsx',
    'app/(dashboard)/(prioritization)/exposure-chains/page.tsx',
    'app/(dashboard)/settings/modules/page.tsx',
    'app/(dashboard)/(mobilization)/remediation/page.tsx',
    'app/(dashboard)/notifications/page.tsx',
    'app/(dashboard)/(scoping)/asset-groups/[id]/page.tsx',
    'app/(dashboard)/(scoping)/asset-groups/page.tsx',
    'app/(dashboard)/(scoping)/attack-surface/cloud/page.tsx',
    'app/(dashboard)/(scoping)/attack-surface/external/page.tsx',
    'app/(dashboard)/(scoping)/attack-surface/internal/page.tsx',
    'app/(dashboard)/(scoping)/business-services/page.tsx',
    'app/(dashboard)/(scoping)/business-units/page.tsx',
    'app/(dashboard)/(scoping)/compliance/page.tsx',
    'components/notification-bell.tsx',
    'features/assets/components/relationships/relationship-table.tsx',
    'features/capabilities/components/capability-card.tsx',
    'features/capabilities/components/capability-detail-panel.tsx',
    'features/capabilities/components/capability-table.tsx',
    'features/components/components/component-detail-sheet.tsx',
    'features/pentest/components/finding-detail-sheet.tsx',
    'features/pipelines/components/node-palette.tsx',
    'features/vulnerabilities/components/vulnerability-detail-sheet.tsx',
    'lib/api/audit-types.ts',
  ].map((p) => p.split('/').join('/'))
)

// Files that DEFINE the palette are allowed to hold color literals.
const SOURCE_FILES = new Set([
  'lib/severity-colors.ts',
  'lib/criticality-colors.ts',
  'lib/impact-colors.ts',
])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec|d)\.ts$/.test(entry)) out.push(full)
  }
  return out
}

describe('severity-color governance', () => {
  it('no new file hard-codes an inline severity→color map (use src/lib/severity-colors.ts)', () => {
    const offenders: string[] = []
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file).split('\\').join('/')
      if (SOURCE_FILES.has(rel)) continue
      if (INLINE_MAP.test(readFileSync(file, 'utf8'))) {
        if (!ALLOWLIST.has(rel)) offenders.push(rel)
      }
    }
    expect(
      offenders,
      `New inline severity→color map(s) found. Import the palette from ` +
        `src/lib/severity-colors.ts instead of hard-coding colors:\n  ${offenders.join('\n  ')}`
    ).toEqual([])
  })
})
