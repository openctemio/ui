/**
 * Exposure Event API Types
 *
 * TypeScript types for Exposure Event Management (Attack Surface Monitoring)
 * Exposures track non-CVE attack surface changes like port opens, misconfigs, etc.
 */

// Exposure event types - categories of attack surface changes
export type ExposureEventType =
  | 'port_open'
  | 'port_closed'
  | 'service_detected'
  | 'service_changed'
  | 'subdomain_discovered'
  | 'subdomain_removed'
  | 'certificate_expiring'
  | 'certificate_expired'
  | 'bucket_public'
  | 'bucket_private'
  | 'repo_public'
  | 'repo_private'
  | 'api_exposed'
  | 'api_removed'
  | 'credential_leaked'
  | 'sensitive_data_exposed'
  | 'misconfiguration'
  | 'custom'

// Exposure severity levels
export type ExposureSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

// Exposure state - lifecycle management
export type ExposureState = 'active' | 'resolved' | 'accepted' | 'false_positive'

/**
 * Exposure Event entity from API
 */
export interface ExposureEvent {
  id: string
  canonical_asset_id?: string
  native_asset_id?: string
  event_type: ExposureEventType
  severity: ExposureSeverity
  state: ExposureState
  title: string
  description?: string
  details?: Record<string, unknown>
  fingerprint: string
  source: string
  first_seen_at: string
  last_seen_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
  created_at: string
  updated_at: string
}

/**
 * User info for state history attribution
 */
export interface StateHistoryUser {
  id: string
  name: string
  email: string
  avatar_url?: string
}

/**
 * State history entry - audit trail for state changes
 */
export interface ExposureStateHistory {
  id: string
  previous_state: ExposureState
  new_state: ExposureState
  changed_by?: string
  changed_by_user?: StateHistoryUser
  reason?: string
  created_at: string
}

/**
 * Exposure list filters
 */
export interface ExposureListFilters {
  canonical_asset_id?: string
  native_asset_id?: string
  event_types?: ExposureEventType[]
  severities?: ExposureSeverity[]
  states?: ExposureState[]
  sources?: string[]
  search?: string
  first_seen_after?: number // Unix timestamp
  first_seen_before?: number // Unix timestamp
  last_seen_after?: number // Unix timestamp
  last_seen_before?: number // Unix timestamp
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Paginated list response
 */
export interface ExposureListResponse {
  data: ExposureEvent[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

/**
 * Create exposure event request
 */
export interface CreateExposureRequest {
  canonical_asset_id?: string
  native_asset_id?: string
  event_type: ExposureEventType
  severity: ExposureSeverity
  title: string
  description?: string
  source: string
  details?: Record<string, unknown>
}

/**
 * Bulk ingest request
 */
export interface BulkIngestExposuresRequest {
  exposures: CreateExposureRequest[]
}

/**
 * Bulk ingest response
 */
export interface BulkIngestExposuresResponse {
  ingested: number
  items: ExposureEvent[]
}

/**
 * Change state request (resolve, accept, false-positive)
 */
export interface ChangeExposureStateRequest {
  reason?: string
}

/**
 * State history response
 */
export interface ExposureStateHistoryResponse {
  items: ExposureStateHistory[]
  total: number
}

/**
 * Exposure statistics
 */
export interface ExposureStats {
  total: number
  by_severity: Record<ExposureSeverity, number>
  by_state: Record<ExposureState, number>
  by_event_type: Record<string, number>
  active_count: number
  resolved_count: number
  mttr_hours?: number // Mean Time To Resolve
}

/**
 * Event type configuration for UI display
 */
export const EVENT_TYPE_CONFIG: Record<
  ExposureEventType,
  { label: string; description: string; category: string }
> = {
  port_open: {
    label: 'Port Open',
    description: 'New port opened on host',
    category: 'network',
  },
  port_closed: {
    label: 'Port Closed',
    description: 'Port was closed on host',
    category: 'network',
  },
  service_detected: {
    label: 'Service Detected',
    description: 'New service detected running',
    category: 'service',
  },
  service_changed: {
    label: 'Service Changed',
    description: 'Service version or config changed',
    category: 'service',
  },
  subdomain_discovered: {
    label: 'Subdomain Discovered',
    description: 'New subdomain found',
    category: 'domain',
  },
  subdomain_removed: {
    label: 'Subdomain Removed',
    description: 'Subdomain no longer resolves',
    category: 'domain',
  },
  certificate_expiring: {
    label: 'Certificate Expiring',
    description: 'SSL certificate expiring soon',
    category: 'certificate',
  },
  certificate_expired: {
    label: 'Certificate Expired',
    description: 'SSL certificate has expired',
    category: 'certificate',
  },
  bucket_public: {
    label: 'Bucket Public',
    description: 'Storage bucket is publicly accessible',
    category: 'cloud',
  },
  bucket_private: {
    label: 'Bucket Private',
    description: 'Storage bucket access restricted',
    category: 'cloud',
  },
  repo_public: {
    label: 'Repository Public',
    description: 'Code repository is public',
    category: 'code',
  },
  repo_private: {
    label: 'Repository Private',
    description: 'Code repository made private',
    category: 'code',
  },
  api_exposed: {
    label: 'API Exposed',
    description: 'API endpoint publicly accessible',
    category: 'api',
  },
  api_removed: {
    label: 'API Removed',
    description: 'API endpoint no longer accessible',
    category: 'api',
  },
  credential_leaked: {
    label: 'Credential Leaked',
    description: 'Credentials found in public source',
    category: 'credential',
  },
  sensitive_data_exposed: {
    label: 'Sensitive Data Exposed',
    description: 'Sensitive data publicly accessible',
    category: 'data',
  },
  misconfiguration: {
    label: 'Misconfiguration',
    description: 'Security misconfiguration detected',
    category: 'config',
  },
  custom: {
    label: 'Custom',
    description: 'Custom exposure event',
    category: 'other',
  },
}

/**
 * Severity configuration for UI display
 */
export const EXPOSURE_SEVERITY_CONFIG: Record<
  ExposureSeverity,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  low: {
    label: 'Low',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  info: {
    label: 'Info',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
}

/**
 * State configuration for UI display
 */
export const EXPOSURE_STATE_CONFIG: Record<
  ExposureState,
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: 'Active',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  accepted: {
    label: 'Accepted',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  false_positive: {
    label: 'False Positive',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
}

/**
 * Event category configuration for grouping in UI
 */
export const EVENT_CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: string; events: ExposureEventType[] }
> = {
  network: {
    label: 'Network',
    icon: 'network',
    events: ['port_open', 'port_closed'],
  },
  service: {
    label: 'Services',
    icon: 'server',
    events: ['service_detected', 'service_changed'],
  },
  domain: {
    label: 'Domains',
    icon: 'globe',
    events: ['subdomain_discovered', 'subdomain_removed'],
  },
  certificate: {
    label: 'Certificates',
    icon: 'shield-check',
    events: ['certificate_expiring', 'certificate_expired'],
  },
  cloud: {
    label: 'Cloud',
    icon: 'cloud',
    events: ['bucket_public', 'bucket_private'],
  },
  code: {
    label: 'Code',
    icon: 'code',
    events: ['repo_public', 'repo_private'],
  },
  api: {
    label: 'APIs',
    icon: 'plug',
    events: ['api_exposed', 'api_removed'],
  },
  credential: {
    label: 'Credentials',
    icon: 'key',
    events: ['credential_leaked'],
  },
  data: {
    label: 'Data',
    icon: 'database',
    events: ['sensitive_data_exposed'],
  },
  config: {
    label: 'Configuration',
    icon: 'settings',
    events: ['misconfiguration'],
  },
  other: {
    label: 'Other',
    icon: 'help-circle',
    events: ['custom'],
  },
}
