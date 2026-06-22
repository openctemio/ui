/**
 * Vulnerability Types
 *
 * Types for the global CVE catalog. Shapes mirror the backend
 * VulnerabilityResponse DTO in `internal/infra/http/handler/vulnerability_handler.go`.
 *
 * Vulnerabilities are GLOBAL (CVE database) — NOT tenant-scoped.
 */

import type { Severity } from '@/features/shared/types'

export type VulnerabilityStatus =
  | 'open'
  | 'patched'
  | 'mitigated'
  | 'not_affected'
  | 'investigating'

export type ExploitMaturity = 'none' | 'poc' | 'functional' | 'weaponized'

export interface CISAKEVData {
  date_added: string
  due_date: string
  ransomware_use?: string
  notes?: string
  is_past_due: boolean
}

export interface VulnerabilityReference {
  type: string
  url: string
}

export interface AffectedVersion {
  ecosystem: string
  package: string
  introduced?: string
  fixed?: string
}

export interface Vulnerability {
  id: string
  cve_id: string
  aliases?: string[]
  title: string
  description?: string
  severity: Severity
  cvss_score?: number
  cvss_vector?: string
  epss_score?: number
  epss_percentile?: number
  cisa_kev?: CISAKEVData
  exploit_available: boolean
  exploit_maturity: ExploitMaturity
  references?: VulnerabilityReference[]
  affected_versions?: AffectedVersion[]
  fixed_versions?: string[]
  remediation?: string
  published_at?: string
  modified_at?: string
  status: VulnerabilityStatus
  risk_score: number
  created_at: string
  updated_at: string
}

export interface VulnerabilityListFilters {
  cve_ids?: string[]
  severities?: Severity[]
  min_cvss?: number
  max_cvss?: number
  min_epss?: number
  exploit_available?: boolean
  cisa_kev_only?: boolean
  statuses?: VulnerabilityStatus[]
  page?: number
  per_page?: number
}

export interface PaginationLinks {
  first?: string
  prev?: string
  next?: string
  last?: string
}

export interface VulnerabilityListResponse {
  data: Vulnerability[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

export const EXPLOIT_MATURITY_CONFIG: Record<
  ExploitMaturity,
  { label: string; color: string; description: string }
> = {
  none: {
    label: 'None',
    color: 'bg-gray-500 text-white',
    description: 'No known exploit',
  },
  poc: {
    label: 'PoC',
    color: 'bg-yellow-500 text-black',
    description: 'Proof-of-concept exploit exists',
  },
  functional: {
    label: 'Functional',
    color: 'bg-orange-500 text-white',
    description: 'Working exploit available',
  },
  weaponized: {
    label: 'Weaponized',
    color: 'bg-red-600 text-white',
    description: 'Widely exploited in the wild',
  },
}

export const VULNERABILITY_STATUS_LABELS: Record<VulnerabilityStatus, string> = {
  open: 'Open',
  patched: 'Patched',
  mitigated: 'Mitigated',
  not_affected: 'Not Affected',
  investigating: 'Investigating',
}
