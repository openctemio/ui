/**
 * Asset identity: the identifiers the platform matches assets on, the names an
 * asset is also known by, and the reasons the correlator gives when it flags
 * two assets as likely duplicates.
 *
 * The API matches an incoming asset on strong identifiers first (host ID,
 * cloud instance ID, BIOS UUID, serial number, MAC address, SCM repository
 * ID), then on its exact name, then on an IP address seen within the last
 * 7 days. See docs/architecture/asset-identity-resolution.md in the api repo.
 */

export type IdentifierKind =
  | 'host_id'
  | 'cloud_id'
  | 'bios_uuid'
  | 'serial_number'
  | 'mac'
  | 'scm_repo_id'
  | 'fqdn'
  | 'hostname'
  | 'ip'

/** One row of GET /api/v1/assets/{id}/identifiers. */
export interface AssetIdentifier {
  kind: IdentifierKind | string
  value: string
  strong: boolean
  source?: string
  first_seen: string
  last_seen: string
}

/** Most trusted first; the order the API matches on. */
export const IDENTIFIER_KIND_ORDER: readonly IdentifierKind[] = [
  'host_id',
  'cloud_id',
  'bios_uuid',
  'serial_number',
  'mac',
  'scm_repo_id',
  'fqdn',
  'hostname',
  'ip',
]

export const IDENTIFIER_KIND_LABEL: Record<IdentifierKind, string> = {
  host_id: 'Host ID',
  cloud_id: 'Cloud instance ID',
  bios_uuid: 'BIOS UUID',
  serial_number: 'Serial number',
  mac: 'MAC address',
  scm_repo_id: 'SCM repository ID',
  fqdn: 'FQDN',
  hostname: 'Hostname',
  ip: 'IP address',
}

/** Days a weak identifier (name or IP) keeps counting for matching. */
export const WEAK_IDENTIFIER_WINDOW_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function identifierKindLabel(kind: string): string {
  return IDENTIFIER_KIND_LABEL[kind as IdentifierKind] ?? kind.replace(/_/g, ' ')
}

function kindRank(kind: string): number {
  const i = IDENTIFIER_KIND_ORDER.indexOf(kind as IdentifierKind)
  return i === -1 ? IDENTIFIER_KIND_ORDER.length : i
}

/** Sorts by trust (strong kinds first), then most recently seen first. */
export function sortIdentifiers(list: AssetIdentifier[]): AssetIdentifier[] {
  return [...list].sort((a, b) => {
    const r = kindRank(a.kind) - kindRank(b.kind)
    if (r !== 0) return r
    return (Date.parse(b.last_seen) || 0) - (Date.parse(a.last_seen) || 0)
  })
}

/**
 * Whether the identifier still counts when the platform matches assets.
 * Strong identifiers always do. A weak one (FQDN, hostname, IP) counts only
 * when it was seen within the last 7 days: an IP handed to another machine by
 * DHCP, or a name the host no longer reports, must not pull a new asset in.
 */
export function isUsedForMatching(id: AssetIdentifier, now: number = Date.now()): boolean {
  if (id.strong) return true
  const seen = Date.parse(id.last_seen)
  if (Number.isNaN(seen)) return false
  return now - seen <= WEAK_IDENTIFIER_WINDOW_DAYS * DAY_MS
}

/** Reads `properties.aliases` (former names the API recorded on rename). */
export function readAliases(properties: Record<string, unknown> | null | undefined): string[] {
  const raw = properties?.aliases
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
}

export interface AlsoKnownAs {
  name: string
  /** Where the name comes from: an identifier kind, or 'alias' for a former name. */
  kind: IdentifierKind | 'alias'
  lastSeen?: string
}

/**
 * The other names of an asset: hostname, FQDN and IP identifiers that differ
 * from its current name, plus former names in `properties.aliases`. Each name
 * appears once (case-insensitive), most recently seen first; aliases with no
 * identifier row come last.
 */
export function deriveAlsoKnownAs(
  identifiers: AssetIdentifier[],
  currentName: string,
  aliases: string[] = []
): AlsoKnownAs[] {
  const current = currentName.trim().toLowerCase()
  const seen = new Set<string>([current])
  const out: AlsoKnownAs[] = []

  const named = identifiers
    .filter((i) => i.kind === 'hostname' || i.kind === 'fqdn' || i.kind === 'ip')
    .sort((a, b) => (Date.parse(b.last_seen) || 0) - (Date.parse(a.last_seen) || 0))
  for (const i of named) {
    const key = i.value.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ name: i.value, kind: i.kind as IdentifierKind, lastSeen: i.last_seen })
  }
  for (const a of aliases) {
    const key = a.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({ name: a, kind: 'alias' })
  }
  return out
}

// ============================================
// Duplicate review reasons
// ============================================

export type DedupReason = 'shared_ip' | 'identifier_conflict' | 'shared_identifier' | 'renamed_host'

export const DEDUP_REASON_LABEL: Record<DedupReason, string> = {
  shared_ip: 'Shared IP address',
  identifier_conflict: 'Conflicting identifiers',
  shared_identifier: 'Shared identifier',
  renamed_host: 'Renamed host',
}

export function dedupReasonLabel(reason: string | null | undefined): string {
  if (!reason) return 'Name or IP match'
  return DEDUP_REASON_LABEL[reason as DedupReason] ?? reason.replace(/_/g, ' ')
}

/**
 * One-line evidence for a review, e.g. "MAC address 00:1a:2b:3c:4d:5e",
 * "IP 10.0.0.5 · nessus" or "x → y". Unknown keys are listed as key: value.
 * Returns '' when there is no evidence.
 */
export function describeEvidence(evidence: Record<string, unknown> | null | undefined): string {
  if (!evidence) return ''
  const str = (v: unknown) =>
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''
  const parts: string[] = []
  const used = new Set<string>()

  if (str(evidence.kind) && str(evidence.value)) {
    parts.push(`${identifierKindLabel(str(evidence.kind))} ${str(evidence.value)}`)
    used.add('kind').add('value')
  }
  if (str(evidence.ip)) {
    parts.push(`IP ${str(evidence.ip)}`)
    used.add('ip')
  }
  if (str(evidence.old_name) && str(evidence.new_name)) {
    parts.push(`${str(evidence.old_name)} → ${str(evidence.new_name)}`)
    used.add('old_name').add('new_name')
  }
  if (str(evidence.tool)) {
    parts.push(str(evidence.tool))
    used.add('tool')
  }
  for (const [k, v] of Object.entries(evidence)) {
    if (used.has(k) || !str(v)) continue
    parts.push(`${k.replace(/_/g, ' ')}: ${str(v)}`)
  }
  return parts.join(' · ')
}
