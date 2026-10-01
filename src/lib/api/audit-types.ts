/**
 * Audit Log API Types
 *
 * TypeScript types for Audit Log functionality
 * API endpoint: /api/v1/audit-logs
 */

// ============================================
// VALUE OBJECTS
// ============================================

// ----------------------------------------------------------------------------
// Sensor events before and after the sensor rename
//
// RFC-023 §9.5 (openctemio/api, docs/rfcs/RFC-023-sensor-rename-contract.md §5).
// New events are sensor.* on resource type "sensor" with sensor_* metadata.
// Rows written before the upgrade keep the old action prefix, resource type and
// metadata keys (the HISTORICAL_SENSOR_* constants below) for good:
// the audit log is hash-chained, so history is never rewritten. The API returns
// each row as written (a sensor filter also matches the old spelling), so the
// UI maps the old spelling onto the new one before labelling anything.
// ----------------------------------------------------------------------------

export const SENSOR_AUDIT_VERBS = [
  'created',
  'updated',
  'deleted',
  'activated',
  'deactivated',
  'revoked',
  'key_regenerated',
  'key_renewed',
  'connected',
  'disconnected',
] as const
export type SensorAuditVerb = (typeof SENSOR_AUDIT_VERBS)[number]

/** Action prefix of sensor events written before the rename. */
export const HISTORICAL_SENSOR_ACTION_PREFIX = 'agent.'
/** Resource type of sensor events written before the rename. */
export const HISTORICAL_SENSOR_RESOURCE_TYPE = 'agent'
/** Metadata key prefix (type, id, name) of events written before the rename. */
export const HISTORICAL_SENSOR_METADATA_PREFIX = 'agent_'

const SENSOR_ACTION_PREFIX = 'sensor.'
const SENSOR_METADATA_PREFIX = 'sensor_'
const HISTORICAL_SENSOR_METADATA_KEYS = new Set(['type', 'id', 'name'])

/** Current name of an audit action: a pre-rename sensor action maps onto sensor.*. */
export function canonicalAuditAction<T extends string>(action: T): T {
  return (
    action.startsWith(HISTORICAL_SENSOR_ACTION_PREFIX)
      ? SENSOR_ACTION_PREFIX + action.slice(HISTORICAL_SENSOR_ACTION_PREFIX.length)
      : action
  ) as T
}

/** Current name of an audit resource type (the historical one -> "sensor"). */
export function canonicalAuditResourceType<T extends string>(resourceType: T): T {
  return (resourceType === HISTORICAL_SENSOR_RESOURCE_TYPE ? 'sensor' : resourceType) as T
}

/** Current name of an audit metadata key (historical type/id/name keys -> sensor_*). */
export function canonicalAuditMetadataKey(key: string): string {
  if (!key.startsWith(HISTORICAL_SENSOR_METADATA_PREFIX)) return key
  const rest = key.slice(HISTORICAL_SENSOR_METADATA_PREFIX.length)
  return HISTORICAL_SENSOR_METADATA_KEYS.has(rest) ? SENSOR_METADATA_PREFIX + rest : key
}

/**
 * Audit action types - maps to backend audit.Action
 */
export type AuditAction =
  // User actions
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.suspended'
  | 'user.activated'
  | 'user.deactivated'
  | 'user.login'
  | 'user.logout'
  // Tenant actions
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.deleted'
  | 'tenant.settings_updated'
  // Membership actions
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  // Invitation actions
  | 'invitation.created'
  | 'invitation.accepted'
  | 'invitation.deleted'
  | 'invitation.expired'
  // Repository actions
  | 'repository.created'
  | 'repository.updated'
  | 'repository.deleted'
  | 'repository.archived'
  // Component actions
  | 'component.created'
  | 'component.updated'
  | 'component.deleted'
  // Vulnerability actions
  | 'vulnerability.created'
  | 'vulnerability.updated'
  | 'vulnerability.deleted'
  // Finding actions
  | 'finding.created'
  | 'finding.updated'
  | 'finding.deleted'
  | 'finding.status_changed'
  | 'finding.triaged'
  | 'finding.assigned'
  | 'finding.unassigned'
  | 'finding.commented'
  | 'finding.bulk_updated'
  // Branch actions
  | 'branch.created'
  | 'branch.updated'
  | 'branch.deleted'
  | 'branch.scanned'
  | 'branch.set_default'
  // SLA Policy actions
  | 'sla_policy.created'
  | 'sla_policy.updated'
  | 'sla_policy.deleted'
  // Scan actions
  | 'scan.started'
  | 'scan.completed'
  | 'scan.failed'
  // Security actions
  | 'auth.failed'
  | 'permission.denied'
  | 'token.revoked'
  // Settings actions
  | 'settings.updated'
  // Data actions
  | 'data.exported'
  | 'data.imported'
  // Sensor actions, and the spelling rows written before the rename carry
  | `sensor.${SensorAuditVerb}`
  | `${typeof HISTORICAL_SENSOR_ACTION_PREFIX}${SensorAuditVerb}`
  // Scan zone actions (RFC-023)
  | 'scan_zone.created'
  | 'scan_zone.updated'
  | 'scan_zone.deleted'
  | 'scan_zone.sensor_assigned'
  | 'scan_zone.sensor_unassigned'

/**
 * Resource types - maps to backend audit.ResourceType
 */
export type AuditResourceType =
  | 'user'
  | 'tenant'
  | 'membership'
  | 'invitation'
  | 'repository'
  | 'branch'
  | 'component'
  | 'vulnerability'
  | 'finding'
  | 'finding_comment'
  | 'sla_policy'
  | 'scan'
  | 'asset'
  | 'settings'
  | 'token'
  | 'sensor'
  | 'scan_zone'
  | typeof HISTORICAL_SENSOR_RESOURCE_TYPE

/**
 * Audit result - maps to backend audit.Result
 */
export type AuditResult = 'success' | 'failure' | 'denied'

/**
 * Audit severity - maps to backend audit.Severity
 */
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical'

// ============================================
// ENTITIES
// ============================================

/**
 * Changes object for tracking before/after values
 */
export interface AuditChanges {
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

/**
 * Audit log entity - maps to backend AuditLogResponse
 */
export interface AuditLog {
  id: string
  tenant_id?: string
  actor_id?: string
  actor_email: string
  actor_ip?: string
  action: AuditAction
  resource_type: AuditResourceType
  resource_id: string
  resource_name?: string
  changes?: AuditChanges
  result: AuditResult
  severity: AuditSeverity
  message: string
  metadata?: Record<string, unknown>
  request_id?: string
  timestamp: string
}

// ============================================
// LIST RESPONSE & FILTERS
// ============================================

/**
 * Audit log list response
 */
export interface AuditLogListResponse {
  items: AuditLog[]
  total: number
  page: number
  page_size: number
}

/**
 * Audit log list filters
 */
export interface AuditLogListFilters {
  resource_type?: AuditResourceType
  resource_id?: string
  action?: AuditAction
  actor_id?: string
  result?: AuditResult
  severity?: AuditSeverity
  from_date?: string
  to_date?: string
  search?: string
  page?: number
  page_size?: number
}

// ============================================
// STATS
// ============================================

/**
 * Audit log statistics
 */
export interface AuditLogStats {
  total_logs: number
  logs_today: number
  logs_this_week: number
  logs_this_month: number
  by_action: Record<string, number>
  by_resource_type: Record<string, number>
  by_result: Record<string, number>
  by_severity: Record<string, number>
}

// ============================================
// HELPERS
// ============================================

/**
 * Get display label for action
 */
export function getActionLabel(action: AuditAction): string {
  const labels: Partial<Record<AuditAction, string>> = {
    // User actions
    'user.created': 'User Created',
    'user.updated': 'User Updated',
    'user.deleted': 'User Deleted',
    'user.suspended': 'User Suspended',
    'user.activated': 'User Activated',
    'user.deactivated': 'User Deactivated',
    'user.login': 'User Login',
    'user.logout': 'User Logout',
    // Tenant actions
    'tenant.created': 'Team Created',
    'tenant.updated': 'Team Updated',
    'tenant.deleted': 'Team Deleted',
    'tenant.settings_updated': 'Team Settings Updated',
    // Membership actions
    'member.added': 'Member Added',
    'member.removed': 'Member Removed',
    'member.role_changed': 'Member Role Changed',
    // Invitation actions
    'invitation.created': 'Invitation Created',
    'invitation.accepted': 'Invitation Accepted',
    'invitation.deleted': 'Invitation Deleted',
    'invitation.expired': 'Invitation Expired',
    // Repository actions
    'repository.created': 'Repository Created',
    'repository.updated': 'Repository Updated',
    'repository.deleted': 'Repository Deleted',
    'repository.archived': 'Repository Archived',
    // Component actions
    'component.created': 'Component Created',
    'component.updated': 'Component Updated',
    'component.deleted': 'Component Deleted',
    // Vulnerability actions
    'vulnerability.created': 'Vulnerability Created',
    'vulnerability.updated': 'Vulnerability Updated',
    'vulnerability.deleted': 'Vulnerability Deleted',
    // Finding actions
    'finding.created': 'Finding Created',
    'finding.updated': 'Finding Updated',
    'finding.deleted': 'Finding Deleted',
    'finding.status_changed': 'Finding Status Changed',
    'finding.triaged': 'Finding Triaged',
    'finding.assigned': 'Finding Assigned',
    'finding.unassigned': 'Finding Unassigned',
    'finding.commented': 'Finding Commented',
    'finding.bulk_updated': 'Findings Bulk Updated',
    // Branch actions
    'branch.created': 'Branch Created',
    'branch.updated': 'Branch Updated',
    'branch.deleted': 'Branch Deleted',
    'branch.scanned': 'Branch Scanned',
    'branch.set_default': 'Default Branch Set',
    // SLA Policy actions
    'sla_policy.created': 'SLA Policy Created',
    'sla_policy.updated': 'SLA Policy Updated',
    'sla_policy.deleted': 'SLA Policy Deleted',
    // Scan actions
    'scan.started': 'Scan Started',
    'scan.completed': 'Scan Completed',
    'scan.failed': 'Scan Failed',
    // Security actions
    'auth.failed': 'Authentication Failed',
    'permission.denied': 'Permission Denied',
    'token.revoked': 'Token Revoked',
    // Settings actions
    'settings.updated': 'Settings Updated',
    // Data actions
    'data.exported': 'Data Exported',
    'data.imported': 'Data Imported',
    // Sensor actions (pre-rename rows are mapped onto these first)
    'sensor.created': 'Sensor Created',
    'sensor.updated': 'Sensor Updated',
    'sensor.deleted': 'Sensor Deleted',
    'sensor.activated': 'Sensor Activated',
    'sensor.deactivated': 'Sensor Deactivated',
    'sensor.revoked': 'Sensor Revoked',
    'sensor.key_regenerated': 'Sensor API Key Regenerated',
    'sensor.key_renewed': 'Sensor API Key Renewed',
    'sensor.connected': 'Sensor Connected',
    'sensor.disconnected': 'Sensor Disconnected',
    // Scan zone actions
    'scan_zone.created': 'Scan Zone Created',
    'scan_zone.updated': 'Scan Zone Updated',
    'scan_zone.deleted': 'Scan Zone Deleted',
    'scan_zone.sensor_assigned': 'Sensor Assigned to Scan Zone',
    'scan_zone.sensor_unassigned': 'Sensor Unassigned from Scan Zone',
  }
  const canonical = canonicalAuditAction(action)
  return labels[canonical] || action
}

/**
 * Get severity badge color class
 */
export function getSeverityColor(severity: AuditSeverity): string {
  const colors: Record<AuditSeverity, string> = {
    low: 'bg-gray-500/10 text-gray-500',
    medium: 'bg-blue-500/10 text-blue-500',
    high: 'bg-amber-500/10 text-amber-500',
    critical: 'bg-red-500/10 text-red-500',
  }
  return colors[severity] || colors.low
}

/**
 * Get result badge color class
 */
export function getResultColor(result: AuditResult): string {
  const colors: Record<AuditResult, string> = {
    success: 'bg-green-500/10 text-green-500',
    failure: 'bg-red-500/10 text-red-500',
    denied: 'bg-amber-500/10 text-amber-500',
  }
  return colors[result] || colors.success
}

/**
 * Get action category from action string
 */
export function getActionCategory(action: AuditAction): string {
  const [category] = action.split('.')
  return category
}
