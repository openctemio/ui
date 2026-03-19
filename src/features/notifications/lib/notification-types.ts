import { AlertTriangle, Bug, CheckCircle, Info, Scan, User, XCircle } from 'lucide-react'

/**
 * All known notification types.
 * Single source of truth shared by the inbox page and settings page.
 */
export const NOTIFICATION_TYPES = [
  {
    id: 'finding_new',
    name: 'New Findings',
    description: 'When new security findings are discovered',
  },
  {
    id: 'finding_assigned',
    name: 'Finding Assigned',
    description: 'When a finding is assigned to you',
  },
  {
    id: 'finding_status_change',
    name: 'Finding Status Change',
    description: 'When a finding status is updated',
  },
  {
    id: 'finding_comment',
    name: 'Finding Comments',
    description: 'When someone comments on a finding',
  },
  {
    id: 'finding_mention',
    name: 'Mentions',
    description: 'When someone mentions you in a comment',
  },
  {
    id: 'scan_started',
    name: 'Scan Started',
    description: 'When a security scan begins running',
  },
  {
    id: 'scan_completed',
    name: 'Scan Completed',
    description: 'When security scans finish running',
  },
  {
    id: 'scan_failed',
    name: 'Scan Failed',
    description: 'When a scan encounters errors',
  },
  {
    id: 'asset_discovered',
    name: 'Asset Discovered',
    description: 'When new assets are discovered in your environment',
  },
  {
    id: 'member_invited',
    name: 'Member Invited',
    description: 'When new team members are invited',
  },
  {
    id: 'member_joined',
    name: 'Member Joined',
    description: 'When invited members join the team',
  },
  {
    id: 'role_changed',
    name: 'Role Changed',
    description: 'When your role or permissions are updated',
  },
  {
    id: 'sla_breach',
    name: 'SLA Breach',
    description: 'When a finding exceeds its SLA deadline',
  },
  {
    id: 'system_alert',
    name: 'System Alerts',
    description: 'Important system-level notifications',
  },
] as const

/** Icon mapping for notification types */
export const NOTIFICATION_TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  finding_new: Bug,
  finding_assigned: User,
  finding_status_change: CheckCircle,
  finding_comment: Info,
  finding_mention: User,
  scan_started: Scan,
  scan_completed: CheckCircle,
  scan_failed: XCircle,
  asset_discovered: Info,
  member_invited: User,
  member_joined: User,
  role_changed: User,
  sla_breach: AlertTriangle,
  system_alert: AlertTriangle,
}

/** Label mapping for notification types */
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.id, t.name])
)
