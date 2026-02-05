/**
 * Audit Log Types
 *
 * Type definitions for audit log viewing
 */

// ============================================
// AUDIT LOG TYPES
// ============================================

export type AuditAction =
  | 'user.created'
  | 'user.updated'
  | 'user.suspended'
  | 'user.deleted'
  | 'member.added'
  | 'member.removed'
  | 'member.role_changed'
  | 'invitation.created'
  | 'invitation.accepted'
  | 'invitation.expired'
  | 'invitation.cancelled'
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.deleted'
  | 'settings.updated'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.failed'
  | 'permission.denied'
  | string

export type AuditResult = 'success' | 'failure' | 'denied'
export type AuditSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type AuditResourceType =
  | 'user'
  | 'tenant'
  | 'membership'
  | 'invitation'
  | 'token'
  | 'settings'
  | 'asset'
  | 'project'
  | 'finding'
  | string

export interface AuditChanges {
  field_changes?: Record<string, { old: unknown; new: unknown }>
}

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
// API RESPONSE TYPES
// ============================================

export interface AuditLogListResponse {
  data: AuditLog[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface AuditStatsResponse {
  total_logs: number
  logs_by_action: Record<string, number>
  logs_by_result: Record<string, number>
  recent_actions: AuditLog[]
}

// ============================================
// FILTER TYPES
// ============================================

export interface AuditLogFilters {
  actor_id?: string
  action?: string[]
  resource_type?: string[]
  resource_id?: string
  result?: AuditResult[]
  severity?: AuditSeverity[]
  since?: string
  until?: string
  search?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  exclude_system?: boolean
}

// ============================================
// DISPLAY CONFIG
// ============================================

export const RESULT_DISPLAY: Record<AuditResult, { label: string; color: string; bgColor: string }> = {
  success: { label: 'Success', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  failure: { label: 'Failure', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  denied: { label: 'Denied', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
}

export const SEVERITY_DISPLAY: Record<AuditSeverity, { label: string; color: string; bgColor: string }> = {
  info: { label: 'Info', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  low: { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

export const ACTION_CATEGORIES: Record<string, { label: string; icon: string }> = {
  user: { label: 'User', icon: 'User' },
  member: { label: 'Member', icon: 'Users' },
  invitation: { label: 'Invitation', icon: 'Mail' },
  tenant: { label: 'Team', icon: 'Building' },
  settings: { label: 'Settings', icon: 'Settings' },
  auth: { label: 'Authentication', icon: 'Key' },
  permission: { label: 'Permission', icon: 'Shield' },
}

// Helper to get action category
export function getActionCategory(action: string): string {
  const parts = action.split('.')
  return parts[0] || 'other'
}

// Helper to format action for display
export function formatAction(action: string): string {
  return action
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
