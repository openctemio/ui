/**
 * Builds an ATT&CK Navigator layer (v4.5) from a threat-model coverage payload,
 * entirely client-side. Pure + dependency-free so it stays unit-testable.
 *
 * Navigator layer reference: https://github.com/mitre-attack/attack-navigator
 */
import type { ThreatModelCoverage, CoverageTechnique } from '../types'
import { getThreatStatusHex } from './threat-status'

/** A single technique annotation in a Navigator layer. */
export interface NavigatorTechnique {
  techniqueID: string
  tactic: string
  score: number
  color: string
  enabled: boolean
  comment: string
}

/** A minimal ATT&CK Navigator layer (v4.5, enterprise-attack). */
export interface NavigatorLayer {
  name: string
  versions: { attack: string; navigator: string; layer: string }
  domain: 'enterprise-attack'
  description: string
  techniques: NavigatorTechnique[]
  gradient: { colors: string[]; minValue: number; maxValue: number }
  legendItems: { label: string; color: string }[]
}

/**
 * Display-name → Navigator tactic shortname (lowercase-hyphenated). Covers all
 * 14 enterprise ATT&CK tactics so any kill-chain the backend returns resolves.
 */
export const TACTIC_SHORTNAMES: Record<string, string> = {
  Reconnaissance: 'reconnaissance',
  'Resource Development': 'resource-development',
  'Initial Access': 'initial-access',
  Execution: 'execution',
  Persistence: 'persistence',
  'Privilege Escalation': 'privilege-escalation',
  'Defense Evasion': 'defense-evasion',
  'Credential Access': 'credential-access',
  Discovery: 'discovery',
  'Lateral Movement': 'lateral-movement',
  Collection: 'collection',
  'Command and Control': 'command-and-control',
  Exfiltration: 'exfiltration',
  Impact: 'impact',
}

/**
 * Resolve a tactic display name to its Navigator shortname. Falls back to a
 * generic slug so an unknown tactic still exports; unmapped names are reported
 * separately by {@link buildNavigatorLayer} for visibility.
 */
export function tacticShortname(display: string): string {
  return (
    TACTIC_SHORTNAMES[display] ??
    display
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

/** Strip the "attack-" dataset prefix → bare ATT&CK version (e.g. "16.1"). */
export function attackVersion(datasetVersion: string): string {
  return datasetVersion.replace(/^attack-/i, '')
}

function techniqueComment(t: CoverageTechnique): string {
  const c = t.counts
  const parts = [
    t.status,
    `open ${c.open}, mit ${c.mitigated}, cov ${c.covered}, acc ${c.accepted}, theo ${c.theoretical}`,
    `${t.threat_count} threat${t.threat_count === 1 ? '' : 's'}`,
  ]
  if (t.mitigation_ids.length > 0) parts.push(t.mitigation_ids.join(', '))
  return parts.join('; ')
}

export interface BuildNavigatorLayerResult {
  layer: NavigatorLayer
  /** Tactic display names that fell back to the generic slug (not in the map). */
  unmappedTactics: string[]
}

/**
 * Build a Navigator layer from a coverage payload. Every technique becomes an
 * annotation colored by its worst-case status, scored by max_score.
 */
export function buildNavigatorLayer(
  coverage: ThreatModelCoverage,
  name: string
): BuildNavigatorLayerResult {
  const techniques: NavigatorTechnique[] = []
  const unmapped = new Set<string>()

  for (const tactic of coverage.tactics) {
    const shortname = tacticShortname(tactic.tactic)
    if (!(tactic.tactic in TACTIC_SHORTNAMES)) unmapped.add(tactic.tactic)
    for (const tech of tactic.techniques) {
      techniques.push({
        techniqueID: tech.technique_id,
        tactic: shortname,
        score: tech.max_score,
        color: getThreatStatusHex(tech.status),
        enabled: true,
        comment: techniqueComment(tech),
      })
    }
  }

  const layer: NavigatorLayer = {
    name,
    versions: { attack: attackVersion(coverage.dataset_version), navigator: '4.9.1', layer: '4.5' },
    domain: 'enterprise-attack',
    description: `OpenCTEM threat-model coverage — generated ${coverage.generated_at}`,
    techniques,
    gradient: { colors: ['#94a3b8', '#ef4444'], minValue: 0, maxValue: 10 },
    legendItems: [
      { label: 'Open', color: '#ef4444' },
      { label: 'Mitigated', color: '#22c55e' },
      { label: 'Covered', color: '#3b82f6' },
      { label: 'Accepted', color: '#9ca3af' },
      { label: 'Theoretical', color: '#94a3b8' },
    ],
  }

  return { layer, unmappedTactics: [...unmapped] }
}

/** Filesystem-safe base name for the downloaded layer file. */
export function navigatorFileName(name: string): string {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'threat-model'
  return `${slug}-navigator.json`
}
