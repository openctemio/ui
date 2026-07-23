/**
 * Threat Model feature types.
 *
 * Mirrors the backend Continuous Threat Modeling payloads
 * (GET/POST /api/v1/threat-models[/generate]). Threats are *derived* from
 * crown jewels, attacker profiles, and attack paths — this surface is
 * read-only.
 */

export type ThreatStatus = 'open' | 'mitigated' | 'covered' | 'accepted' | 'theoretical'

export type ThreatScopeType = 'crown_jewel' | 'tenant' | 'asset_group' | 'business_unit'

export interface Threat {
  id: string
  attacker_profile_id: string
  entry_point_asset_id: string
  target_asset_id: string
  hop_asset_id: string
  hop_index: number
  chain_fingerprint: string
  technique_id: string
  tactic: string
  mitigation_id?: string
  status: ThreatStatus
  status_reason?: string
  evidence_finding_id?: string
  score: number
}

export interface ThreatModelSummary {
  id: string
  tenant_id: string
  scope_type: ThreatScopeType
  scope_ref_id: string
  name: string
  generated_at: string
  input_hash?: string
  technique_dataset_version: string
  threats_total: number
  threats_open: number
  threats_mitigated: number
  threats_covered: number
  coverage_pct: number
  created_at: string
  updated_at: string
}

export interface ThreatModelDetail extends ThreatModelSummary {
  threats: Threat[]
}

/** Minimal attacker-profile shape used to resolve threat rows. */
export interface AttackerProfileLite {
  id: string
  name: string
  profile_type: string
}

/** Client-side filter state for the threat table. */
export interface ThreatFilters {
  status: ThreatStatus | 'all'
  tactic: string
  attacker: string
  technique: string
}
