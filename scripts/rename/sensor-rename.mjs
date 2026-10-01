#!/usr/bin/env node
/**
 * sensor-rename.mjs — the mechanical half of the agent -> sensor rename in the UI.
 *
 * RFC-023 §9.5 (openctemio/api docs/rfcs/RFC-023-sensor-rename-contract.md):
 * the product moved from "agent" to "sensor" everywhere except where "agent"
 * means something else. This script does the part a machine can do safely; the
 * hand edits (redirects, storage migration, audit labels, Tenable mode, IA)
 * are separate commits.
 *
 * Re-runnable: every step only acts on what still says "agent", so running it
 * on an already-renamed tree is a no-op, and a branch written before the rename
 * catches up by rebasing onto develop and running it again:
 *
 *   node scripts/rename/sensor-rename.mjs            # rename
 *   node scripts/rename/sensor-rename.mjs --dry-run  # report only
 *
 * Steps
 *   1. Paths: `git mv` every tracked file or directory under src/ whose name
 *      says agent (features/agents -> features/sensors, agent-hooks.ts ->
 *      sensor-hooks.ts, the /agents route folder -> /sensors, ...).
 *   2. Module specifiers: rewrite import/export/vi.mock paths that point at a
 *      moved file.
 *   3. Identifiers: rename every identifier containing "agent" through the
 *      TypeScript language service (findRenameLocations), so each rename follows
 *      the symbol — declarations, references, JSX tags, shorthand properties,
 *      re-exports — and never a same-named unrelated symbol in a library.
 *      Interface properties that mirror API JSON (agent_preference, agent_id,
 *      agent_count, ...) move with them, which is the contract's §3.
 *   4. Text: what is left (string literals, comments, JSX copy, JSON
 *      dictionaries) goes through the same case-preserving word map.
 *
 * Every step skips what src/config/sensor-vocabulary-allowlist.json allows
 * (HTTP User-Agent, the AI-triage "agent" mode, historical audit ids, ...) and
 * the vendored OpenAPI spec + generated types (re-vendored, never edited).
 *
 * Word map (case preserving): agent -> sensor, Agent -> Sensor,
 * AGENT -> SENSOR; plurals follow (agents -> sensors).
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DRY = process.argv.includes('--dry-run')
const ALLOW = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src/config/sensor-vocabulary-allowlist.json'), 'utf8')
)
const EXCLUDED = ALLOW.excludedPaths.map((p) => new RegExp(p))
const ENTRIES = ALLOW.entries.map((e) => ({
  ...e,
  filesRe: new RegExp(e.files),
  patternRe: new RegExp(e.pattern, 'g'),
}))
const SCAN_ROOTS = ['src']
const TEXT_EXT = /\.(ts|tsx|mts|js|mjs|json|css)$/

const log = (...a) => console.log('[sensor-rename]', ...a)

// ---------------------------------------------------------------------------
// word map
// ---------------------------------------------------------------------------
function mapCase(word) {
  if (word === word.toUpperCase()) return 'SENSOR'
  if (word[0] === word[0].toUpperCase()) return 'Sensor'
  return 'sensor'
}
export function mapWord(s) {
  return s.replace(/agent/gi, (m) => mapCase(m))
}

// ---------------------------------------------------------------------------
// allow-list
// ---------------------------------------------------------------------------
function rel(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/')
}
function isExcluded(relPath) {
  return EXCLUDED.some((re) => re.test(relPath))
}
/** Spans of `line` that the allow-list keeps for this file. */
function allowedSpans(relPath, line) {
  const spans = []
  for (const e of ENTRIES) {
    if (!e.filesRe.test(relPath)) continue
    e.patternRe.lastIndex = 0
    let m
    while ((m = e.patternRe.exec(line)) !== null) {
      spans.push([m.index, m.index + m[0].length])
      if (m[0].length === 0) e.patternRe.lastIndex++
    }
  }
  return spans
}
function isAllowedAt(relPath, text, offset, length) {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1
  let lineEnd = text.indexOf('\n', offset)
  if (lineEnd === -1) lineEnd = text.length
  const line = text.slice(lineStart, lineEnd)
  const s = offset - lineStart
  return allowedSpans(relPath, line).some(([a, b]) => s >= a && s + length <= b)
}

// ---------------------------------------------------------------------------
// 1. paths
// ---------------------------------------------------------------------------
function gitLsFiles() {
  return execFileSync('git', ['ls-files', '-z', ...SCAN_ROOTS], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
}

function movePaths() {
  const moves = []
  // Shallowest first, so a directory moves before the files inside it.
  for (;;) {
    const files = gitLsFiles().filter((f) => !isExcluded(f))
    let next = null
    for (const f of files) {
      const segs = f.split('/')
      const i = segs.findIndex(
        (s) => /agent/i.test(s) && !isAllowedAt(f, f, f.indexOf(s), s.length)
      )
      if (i === -1) continue
      const from = segs.slice(0, i + 1).join('/')
      if (!next || from.split('/').length < next.split('/').length) next = from
    }
    if (!next) break
    const segs = next.split('/')
    const to = [...segs.slice(0, -1), mapWord(segs[segs.length - 1])].join('/')
    moves.push([next, to])
    if (DRY) break
    fs.mkdirSync(path.join(ROOT, path.dirname(to)), { recursive: true })
    execFileSync('git', ['mv', next, to], { cwd: ROOT })
  }
  for (const [a, b] of moves) log(`git mv ${a} -> ${b}`)
  return moves
}

// ---------------------------------------------------------------------------
// 2. module specifiers
// ---------------------------------------------------------------------------
const SPECIFIER =
  /(\bfrom\s*|\bimport\s*\(\s*|\bvi\.mock\(\s*|\bimport\s+)(['"])([^'"\n]*agent[^'"\n]*)\2/gi

function rewriteSpecifiers(files) {
  let changed = 0
  for (const f of files) {
    const abs = path.join(ROOT, f)
    const text = fs.readFileSync(abs, 'utf8')
    const out = text.replace(SPECIFIER, (all, pre, q, spec) => {
      if (!/^(@\/|\.)/.test(spec)) return all
      const next = spec
        .split('/')
        .map((seg) => mapWord(seg))
        .join('/')
      return `${pre}${q}${next}${q}`
    })
    if (out !== text) {
      changed++
      if (!DRY) fs.writeFileSync(abs, out)
    }
  }
  log(`module specifiers rewritten in ${changed} files`)
}

// ---------------------------------------------------------------------------
// 3. identifiers (TypeScript language service)
// ---------------------------------------------------------------------------
function renameIdentifiers() {
  const configPath = path.join(ROOT, 'tsconfig.json')
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'))
      },
    }
  )
  const fileNames = parsed.fileNames.filter((f) => !f.includes('/node_modules/'))
  const snapshots = new Map()
  const host = {
    getScriptFileNames: () => fileNames,
    getScriptVersion: () => '0',
    getScriptSnapshot: (f) => {
      if (!fs.existsSync(f)) return undefined
      if (!snapshots.has(f))
        snapshots.set(f, ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')))
      return snapshots.get(f)
    },
    getCurrentDirectory: () => ROOT,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  }
  const service = ts.createLanguageService(host, ts.createDocumentRegistry())
  const program = service.getProgram()

  /** file -> Map(start -> length) of identifier occurrences to rename */
  const edits = new Map()
  const covered = new Set()
  const add = (file, start, length) => {
    if (!edits.has(file)) edits.set(file, new Map())
    edits.get(file).set(start, length)
    covered.add(`${file}:${start}`)
  }

  let seeds = 0
  let skipped = 0
  for (const sf of program.getSourceFiles()) {
    const relPath = rel(sf.fileName)
    if (sf.isDeclarationFile || relPath.startsWith('node_modules/') || relPath.startsWith('..'))
      continue
    if (!SCAN_ROOTS.some((r) => relPath.startsWith(r + '/')) || isExcluded(relPath)) continue
    const text = sf.getFullText()
    const visit = (node) => {
      if (
        (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) &&
        /agent/i.test(node.text) &&
        !covered.has(`${sf.fileName}:${node.getStart(sf)}`) &&
        !isAllowedAt(relPath, text, node.getStart(sf), node.getWidth(sf))
      ) {
        const pos = node.getStart(sf)
        const info = service.getRenameInfo(sf.fileName, pos, { allowRenameOfImportPath: false })
        if (!info.canRename) {
          skipped++
        } else {
          seeds++
          const locs =
            service.findRenameLocations(sf.fileName, pos, false, false, {
              providePrefixAndSuffixTextForRename: false,
            }) ?? []
          for (const l of locs) {
            const lrel = rel(l.fileName)
            if (isExcluded(lrel) || lrel.startsWith('node_modules/')) continue
            const ltext = host.getScriptSnapshot(l.fileName).getText(0, Infinity)
            if (isAllowedAt(lrel, ltext, l.textSpan.start, l.textSpan.length)) continue
            add(l.fileName, l.textSpan.start, l.textSpan.length)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  let total = 0
  for (const [file, spans] of edits) {
    let text = fs.readFileSync(file, 'utf8')
    const ordered = [...spans.entries()].sort((a, b) => b[0] - a[0])
    for (const [start, length] of ordered) {
      const old = text.slice(start, start + length)
      text = text.slice(0, start) + mapWord(old) + text.slice(start + length)
      total++
    }
    if (!DRY) fs.writeFileSync(file, text)
  }
  log(
    `identifiers: ${seeds} symbols renamed at ${total} locations in ${edits.size} files (${skipped} not renameable, e.g. library symbols)`
  )
}

// ---------------------------------------------------------------------------
// 4. remaining text
// ---------------------------------------------------------------------------
function renameText(files) {
  let changedFiles = 0
  let count = 0
  for (const f of files) {
    if (!TEXT_EXT.test(f)) continue
    const abs = path.join(ROOT, f)
    const text = fs.readFileSync(abs, 'utf8')
    let out = ''
    let last = 0
    const re = /agent/gi
    let m
    while ((m = re.exec(text)) !== null) {
      if (isAllowedAt(f, text, m.index, m[0].length)) continue
      out += text.slice(last, m.index) + mapCase(m[0])
      last = m.index + m[0].length
      count++
    }
    if (last === 0) continue
    out += text.slice(last)
    // "an agent" -> "a sensor" (the identifier step never produces this: an
    // article only precedes the word in prose).
    out = out.replace(/\b([Aa])n([\s-]+)(sensor|Sensor)/g, '$1$2$3')
    changedFiles++
    if (!DRY) fs.writeFileSync(abs, out)
  }
  log(`text: ${count} occurrences in ${changedFiles} files`)
}

// ---------------------------------------------------------------------------
function main() {
  movePaths()
  const files = gitLsFiles().filter((f) => !isExcluded(f) && fs.existsSync(path.join(ROOT, f)))
  rewriteSpecifiers(files.filter((f) => /\.(ts|tsx|mts|js|mjs)$/.test(f)))
  renameIdentifiers()
  renameText(files)
  if (DRY) {
    log('dry run: nothing written')
    return
  }
  // A longer name can push a line past the print width; format what changed.
  const changed = execFileSync('git', ['diff', '--name-only', '-z', 'HEAD', '--', ...SCAN_ROOTS], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((f) => /\.(ts|tsx|json)$/.test(f) && fs.existsSync(path.join(ROOT, f)))
  if (changed.length > 0) {
    execFileSync(
      path.join(ROOT, 'node_modules/.bin/prettier'),
      ['--write', '--log-level=warn', ...changed],
      {
        cwd: ROOT,
        stdio: 'inherit',
      }
    )
    log(`prettier: ${changed.length} files formatted`)
  }
}

main()
