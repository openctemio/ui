/**
 * Sensor manifests (api RFC-033): what a sensor is, registered by the sensor
 * or derived by the platform from its heartbeat, kept per version. These
 * helpers diff two versions the way the API's manifest_changed event does
 * (content versions are left out: they have their own events) and word a
 * diff for the history and the activity timeline.
 */

import type {
  SensorManifestDiff,
  SensorManifestDocument,
  SensorManifestVersion,
} from '@/lib/api/sensor-types'

import { formatBytes } from './format'

type Translate = (key: string, fallback?: string, vars?: Record<string, string | number>) => string

const plain: Translate = (_key, fallback = '', vars) =>
  fallback.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? ''))

function listDiff(prev: string[] = [], next: string[] = []) {
  return {
    added: next.filter((c) => !prev.includes(c)),
    removed: prev.filter((c) => !next.includes(c)),
  }
}

/** What changed from prev to next (the API's DiffManifests). */
export function diffManifests(
  prev: SensorManifestDocument,
  next: SensorManifestDocument
): SensorManifestDiff {
  const d: SensorManifestDiff = {}
  const before = new Map(prev.tools.map((t) => [t.name, t]))
  const after = new Set(next.tools.map((t) => t.name))
  for (const t of next.tools) {
    const p = before.get(t.name)
    if (!p) {
      ;(d.tools_added ??= []).push(t.name)
      continue
    }
    if ((p.version ?? '') !== (t.version ?? '')) {
      ;(d.versions ??= []).push({ tool: t.name, from: p.version ?? '', to: t.version ?? '' })
    }
    if (p.installed !== t.installed) {
      ;(d.installed ??= []).push({
        tool: t.name,
        from: p.installed ? 'installed' : 'not installed',
        to: t.installed ? 'installed' : 'not installed',
      })
    }
    const caps = listDiff(p.capabilities ?? [], t.capabilities ?? [])
    if (caps.added.length || caps.removed.length) {
      ;(d.capabilities ??= []).push({ tool: t.name, ...caps })
    }
  }
  for (const t of prev.tools) if (!after.has(t.name)) (d.tools_removed ??= []).push(t.name)
  const wide = listDiff(prev.capabilities ?? [], next.capabilities ?? [])
  if (wide.added.length || wide.removed.length) d.sensor_wide = wide
  const other: [string, unknown, unknown][] = [
    ['build', prev.sensor, next.sensor],
    ['sdk', prev.sdk, next.sdk],
    ['platform', prev.platform, next.platform],
    ['resources', prev.resources, next.resources],
    ['concurrency', prev.concurrency, next.concurrency],
  ]
  for (const [name, a, b] of other) {
    if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) (d.other ??= []).push(name)
  }
  return d
}

/** Whether a diff has anything to show. */
export function isEmptyDiff(d: SensorManifestDiff | null | undefined): boolean {
  if (!d) return true
  return (
    !d.tools_added?.length &&
    !d.tools_removed?.length &&
    !d.versions?.length &&
    !d.installed?.length &&
    !d.capabilities?.length &&
    !d.sensor_wide &&
    !d.other?.length
  )
}

/** One line per change, for the history and the activity timeline. */
export function manifestDiffLines(d: SensorManifestDiff, t: Translate = plain): string[] {
  const lines: string[] = []
  const caps = (added?: string[], removed?: string[]) =>
    [...(added ?? []).map((c) => `+${c}`), ...(removed ?? []).map((c) => `−${c}`)].join(' ')
  if (d.tools_added?.length) {
    lines.push(
      t('sensors.manifest.toolsAdded', 'Added: {list}', { list: d.tools_added.join(', ') })
    )
  }
  if (d.tools_removed?.length) {
    lines.push(
      t('sensors.manifest.toolsRemoved', 'Removed: {list}', { list: d.tools_removed.join(', ') })
    )
  }
  for (const v of d.versions ?? []) {
    lines.push(`${v.tool} ${v.from || '—'} → ${v.to || '—'}`)
  }
  for (const i of d.installed ?? []) {
    lines.push(`${i.tool}: ${i.to}`)
  }
  for (const c of d.capabilities ?? []) {
    lines.push(
      t('sensors.manifest.toolCapabilities', '{tool} capabilities: {changes}', {
        tool: c.tool ?? '',
        changes: caps(c.added, c.removed),
      })
    )
  }
  if (d.sensor_wide) {
    lines.push(
      t('sensors.manifest.sensorWide', 'Sensor-wide capabilities: {changes}', {
        changes: caps(d.sensor_wide.added, d.sensor_wide.removed),
      })
    )
  }
  if (d.other?.length) {
    lines.push(t('sensors.manifest.otherChanged', 'Changed: {list}', { list: d.other.join(', ') }))
  }
  return lines
}

/** Each version with the diff against the one before it (older); the oldest has none. */
export function manifestHistory(
  versions: SensorManifestVersion[]
): { version: SensorManifestVersion; diff: SensorManifestDiff | null }[] {
  return versions.map((v, i) => {
    const older = versions[i + 1]
    return { version: v, diff: older ? diffManifests(older.manifest, v.manifest) : null }
  })
}

/** "4 CPU cores · 23.5 GB memory", or null when none is known. */
export function resourcesText(m: SensorManifestDocument): string | null {
  const r = m.resources
  const parts: string[] = []
  if (r?.cpu_cores) {
    const cores = Number.isInteger(r.cpu_cores) ? String(r.cpu_cores) : r.cpu_cores.toFixed(1)
    parts.push(`${cores} CPU ${r.cpu_cores === 1 ? 'core' : 'cores'}`)
  }
  if (r?.mem_total_bytes) parts.push(`${formatBytes(r.mem_total_bytes)} memory`)
  return parts.length ? parts.join(' · ') : null
}

/** "operator cap 8 · slots sized from CPU and memory". */
export function concurrencyText(m: SensorManifestDocument): string | null {
  const c = m.concurrency
  if (!c) return null
  const cap = c.ceiling > 0 ? `operator cap ${c.ceiling}` : 'no operator cap'
  if (c.model === 'dynamic') return `${cap} · slots sized from CPU and memory`
  if (c.model === 'fixed') return `${cap} · fixed slots`
  return cap
}

export const MANIFEST_SOURCE_LABEL: Record<string, string> = {
  sensor: 'registered by the sensor',
  heartbeat: 'derived from its heartbeat',
}

export const IGNORED_REASON_LABEL: Record<string, string> = {
  'unknown-member': 'not part of the manifest format',
  'unknown-tool': 'not in the tool catalog',
  'invalid-name': 'not a valid name',
  'unknown-capability': 'not a known capability',
  limit: 'over the limit',
}
