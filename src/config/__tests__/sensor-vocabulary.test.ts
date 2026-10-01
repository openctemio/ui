import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

import allowlist from '../sensor-vocabulary-allowlist.json'

/**
 * Sensor vocabulary guard (RFC-023 §9.5).
 *
 * The product renamed "agent" to "sensor" everywhere — routes, components,
 * hooks, types, permission ids, copy. This fails on any new occurrence of the
 * word in src/ outside src/config/sensor-vocabulary-allowlist.json, which
 * lists the few places where it still means something else (HTTP User-Agent,
 * the AI-triage agent mode, the endpoint-agent role) or must keep the old
 * spelling (historical audit rows, the /agents redirects, the one-time storage
 * migration).
 *
 * If you are here because it failed: name the sensor concept with the sensor
 * vocabulary. Add an allow-list entry only for an occurrence that is not a
 * sensor, with the reason. A branch written before the rename catches up with
 * `node scripts/rename/sensor-rename.mjs`.
 */

const ROOT = join(__dirname, '..', '..', '..')
const SCAN = ['src', 'next.config.ts']
const EXT = /\.(ts|tsx|mts|js|mjs|json|css)$/

interface Entry {
  id: string
  filesRe: RegExp
  patternRe: RegExp
}

const ENTRIES: Entry[] = allowlist.entries.map((e) => ({
  id: e.id,
  filesRe: new RegExp(e.files),
  patternRe: new RegExp(e.pattern, 'g'),
}))
const EXCLUDED = allowlist.excludedPaths.map((p) => new RegExp(p))

function walk(path: string, out: string[]) {
  const st = statSync(path)
  if (st.isDirectory()) {
    for (const name of readdirSync(path)) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      walk(join(path, name), out)
    }
  } else if (EXT.test(path)) {
    out.push(path)
  }
}

function relPath(abs: string) {
  return relative(ROOT, abs).split(sep).join('/')
}

/** Allow-list entries whose span covers `line[start, start+length)`. */
function coveringEntries(file: string, line: string, start: number, length: number) {
  const hits: string[] = []
  for (const e of ENTRIES) {
    if (!e.filesRe.test(file)) continue
    e.patternRe.lastIndex = 0
    for (const m of line.matchAll(e.patternRe)) {
      if (m.index !== undefined && start >= m.index && start + length <= m.index + m[0].length) {
        hits.push(e.id)
        break
      }
    }
  }
  return hits
}

/** Occurrences of "agent" in `text` that no allow-list entry covers. */
function findViolations(file: string, text: string, used?: Set<string>) {
  const out: string[] = []
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/agent/gi)) {
      const hits = coveringEntries(file, line, m.index ?? 0, m[0].length)
      if (hits.length === 0) out.push(`${file}:${i + 1}: ${line.trim()}`)
      hits.forEach((h) => used?.add(h))
    }
  })
  return out
}

function sourceFiles() {
  const files: string[] = []
  for (const p of SCAN) walk(join(ROOT, p), files)
  return files
    .map((abs) => ({ file: relPath(abs), abs }))
    .filter(({ file }) => !EXCLUDED.some((re) => re.test(file)))
}

describe('sensor vocabulary guard', () => {
  it('finds the word it guards (the guard is not inert)', () => {
    expect(findViolations('src/features/x/y.ts', 'const agentId = useAgent()')).toHaveLength(2)
    expect(findViolations('src/features/x/y.ts', "fetch('/api/v1/agents')")).toHaveLength(1)
    expect(findViolations('src/features/x/y.tsx', '<p>Deploy an Agent</p>')).toHaveLength(1)
    expect(findViolations('src/features/x/y.ts', 'const ua = navigator.userAgent')).toHaveLength(0)
    expect(findViolations('src/features/x/y.ts', 'const s = useSensor()')).toHaveLength(0)
  })

  it('scans a real tree', () => {
    expect(sourceFiles().length).toBeGreaterThan(500)
  })

  it('src/ names sensor concepts with the sensor vocabulary', () => {
    const violations: string[] = []
    for (const { file, abs } of sourceFiles()) {
      violations.push(...findViolations(file, readFileSync(abs, 'utf8')))
    }
    expect(violations, `"agent" outside the allow-list:\n${violations.join('\n')}`).toEqual([])
  })

  it('every allow-list entry still matches something (no stale exceptions)', () => {
    const used = new Set<string>()
    for (const { file, abs } of sourceFiles()) findViolations(file, readFileSync(abs, 'utf8'), used)
    const stale = ENTRIES.map((e) => e.id).filter((id) => !used.has(id))
    expect(stale).toEqual([])
  })

  it('never calls protocol v1 (/api/v1/agent/*) or a /api/v1/sensor/* path that does not exist', () => {
    const offenders: string[] = []
    const guard =
      /^src\/config\/(__tests__\/sensor-vocabulary\.test\.ts|sensor-vocabulary-allowlist\.json)$/
    for (const { file, abs } of sourceFiles()) {
      if (guard.test(file)) continue
      readFileSync(abs, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/\/api\/v1\/(agent|sensor)(\/|\b(?!s))/.test(line)) offenders.push(`${file}:${i + 1}`)
        })
    }
    expect(offenders).toEqual([])
  })
})
