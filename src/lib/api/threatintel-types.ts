/**
 * Threat Intelligence API Types
 *
 * TypeScript types for EPSS (Exploit Prediction Scoring System) and
 * CISA KEV (Known Exploited Vulnerabilities) integration
 */

// ============================================
// EPSS TYPES
// ============================================

/**
 * EPSS Score - Exploit Prediction Scoring System
 * Probability (0-1) that a CVE will be exploited in the next 30 days
 */
export interface EPSSScore {
  cve_id: string
  score: number // 0.0 - 1.0
  percentile: number // 0.0 - 100.0
  model_version: string
  score_date: string
  created_at: string
  updated_at: string
}

/**
 * EPSS Statistics (from backend)
 */
export interface EPSSStats {
  total_scores: number
  high_risk_count: number // EPSS > 0.1 (10%)
  critical_risk_count: number // EPSS > 0.3 (30%)
}

// ============================================
// KEV TYPES (Known Exploited Vulnerabilities)
// ============================================

/**
 * KEV Entry - CISA Known Exploited Vulnerability
 */
export interface KEVEntry {
  cve_id: string
  vendor_project: string
  product: string
  vulnerability_name: string
  date_added: string
  short_description: string
  required_action: string
  due_date: string
  known_ransomware_campaign_use: string
  notes?: string
  created_at: string
  updated_at: string
}

/**
 * KEV Statistics (from backend)
 */
export interface KEVStats {
  total_entries: number
  past_due_count: number
  recently_added_last_30_days: number
  ransomware_related_count: number
}

/**
 * KEV data for display in vulnerability context
 */
export interface KEVData {
  date_added?: string
  due_date?: string
  ransomware_use?: string
  notes?: string
  is_past_due?: boolean
}

// ============================================
// SYNC STATUS TYPES
// ============================================

/**
 * Data source types for threat intelligence
 */
export type ThreatIntelSource = 'epss' | 'kev'

/**
 * Sync status for a data source
 */
export interface SyncStatus {
  source: ThreatIntelSource
  enabled: boolean
  last_sync_at?: string
  last_sync_status: 'success' | 'failed' | 'pending' | 'never'
  last_error?: string
  records_synced: number
  next_sync_at?: string
}

/**
 * Request to enable/disable sync
 */
export interface SetSyncEnabledRequest {
  enabled: boolean
}

/**
 * Unified Threat Intelligence Stats (single API call)
 */
export interface ThreatIntelStats {
  epss: EPSSStats | null
  kev: KEVStats | null
  sync_statuses: SyncStatus[]
}

// ============================================
// ENRICHMENT TYPES
// ============================================

/**
 * Enrichment request for a single CVE
 */
export interface EnrichCVERequest {
  cve_id: string
}

/**
 * Enrichment request for multiple CVEs
 */
export interface EnrichCVEsRequest {
  cve_ids: string[]
}

/**
 * Enrichment result for a CVE
 */
export interface CVEEnrichment {
  cve_id: string
  epss?: EPSSScore
  kev?: KEVEntry
  enriched_at: string
}

/**
 * Bulk enrichment response
 */
export interface BulkEnrichmentResponse {
  enrichments: CVEEnrichment[]
  not_found: string[]
}

// ============================================
// RISK LEVEL HELPERS
// ============================================

/**
 * EPSS Risk Level based on score thresholds
 */
export type EPSSRiskLevel = 'critical' | 'high' | 'medium' | 'low'

/**
 * Get EPSS risk level from score
 */
export function getEPSSRiskLevel(score: number): EPSSRiskLevel {
  if (score > 0.7) return 'critical'
  if (score > 0.4) return 'high'
  if (score > 0.1) return 'medium'
  return 'low'
}

/**
 * EPSS Risk Level Configuration
 */
export const EPSS_RISK_CONFIG: Record<
  EPSSRiskLevel,
  { label: string; color: string; bgColor: string; description: string }
> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Very high probability of exploitation (>70%)',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    description: 'High probability of exploitation (40-70%)',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Moderate probability of exploitation (10-40%)',
  },
  low: {
    label: 'Low',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Low probability of exploitation (<10%)',
  },
}

/**
 * KEV Status Configuration
 */
export const KEV_STATUS_CONFIG = {
  inKEV: {
    label: 'In CISA KEV',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Actively exploited vulnerability requiring immediate action',
  },
  pastDue: {
    label: 'Past Due',
    color: 'text-red-700',
    bgColor: 'bg-red-200 dark:bg-red-900/50',
    description: 'Remediation deadline has passed',
  },
  notInKEV: {
    label: 'Not in KEV',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    description: 'Not in the CISA Known Exploited Vulnerabilities catalog',
  },
} as const
