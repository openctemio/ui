/**
 * Integration Types
 *
 * Types for managing external integrations and connections.
 * Integrations are pull-based data sources that the platform connects to.
 */

/**
 * Integration category
 */
export type IntegrationCategory =
  | 'scm' // Source Code Management: GitHub, GitLab, Bitbucket
  | 'security' // Security Tools: Wiz, Snyk, Tenable
  | 'ticketing' // Issue Trackers: Jira, Linear
  | 'cloud' // Cloud Providers: AWS, GCP, Azure
  | 'notification' // Notifications: Slack, Teams, Email

/**
 * Integration provider
 */
export type IntegrationProvider =
  // SCM
  | 'github'
  | 'gitlab'
  | 'bitbucket'
  | 'azure_devops'
  | 'codecommit'
  | 'local'
  // Security
  | 'wiz'
  | 'snyk'
  | 'tenable'
  | 'crowdstrike'
  // Ticketing
  | 'jira'
  | 'linear'
  | 'asana'
  // Cloud
  | 'aws'
  | 'gcp'
  | 'azure'
  // Notification
  | 'slack'
  | 'teams'
  | 'telegram'
  | 'email'
  | 'webhook'

/**
 * Integration status
 */
export type IntegrationStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'pending'
  | 'expired'
  | 'disabled'

/**
 * Authentication type
 */
export type AuthType = 'oauth' | 'token' | 'api_key' | 'basic' | 'app'

/**
 * SCM Extension - additional fields specific to SCM integrations
 */
export interface SCMExtension {
  scm_organization?: string
  repository_count: number
  webhook_id?: string
  webhook_url?: string
  default_branch_pattern?: string
  auto_import_repos: boolean
  import_private_repos: boolean
  import_archived_repos: boolean
  include_patterns?: string[]
  exclude_patterns?: string[]
  last_repo_sync_at?: string
}

/**
 * Severity levels for notification filtering
 */
export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none'

/**
 * All known severity levels for notification filtering
 */
export const ALL_NOTIFICATION_SEVERITIES: {
  value: NotificationSeverity
  label: string
  color: string
}[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-blue-500' },
  { value: 'info', label: 'Info', color: 'bg-gray-500' },
  { value: 'none', label: 'None', color: 'bg-gray-300' },
]

/**
 * Default enabled severities for new notification channels
 */
export const DEFAULT_ENABLED_SEVERITIES: NotificationSeverity[] = ['critical', 'high']

/**
 * Event category for grouping event types
 */
export type NotificationEventCategory = 'system' | 'asset' | 'scan' | 'finding' | 'exposure'

/**
 * Event types that can trigger notifications
 */
export type NotificationEventType =
  // System events
  | 'security_alert'
  | 'system_error'
  // Asset events
  | 'new_asset'
  | 'asset_changed'
  | 'asset_deleted'
  // Scan events
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  // Finding events
  | 'new_finding'
  | 'finding_confirmed'
  | 'finding_triaged'
  | 'finding_fixed'
  | 'finding_reopened'
  // Exposure events
  | 'new_exposure'
  | 'exposure_resolved'
  // Legacy types (backward compatibility)
  | 'findings'
  | 'exposures'
  | 'scans'
  | 'alerts'

/**
 * Event type info with metadata for UI display
 */
export interface NotificationEventTypeInfo {
  value: NotificationEventType
  category: NotificationEventCategory
  label: string
  description: string
  /** Module ID required for this event type (maps to modules.id). If undefined, always available. */
  requiredModule?: string
}

/**
 * All known event types grouped by category
 * Each event type maps to a required module (from modules table)
 * System events have no requiredModule - always available
 */
export const ALL_NOTIFICATION_EVENT_TYPES: NotificationEventTypeInfo[] = [
  // System events - always available (no module required)
  {
    value: 'security_alert',
    category: 'system',
    label: 'Security Alert',
    description: 'Security-related alerts and warnings',
  },
  {
    value: 'system_error',
    category: 'system',
    label: 'System Error',
    description: 'System errors and failures',
  },
  // Asset events - require 'assets' module
  {
    value: 'new_asset',
    category: 'asset',
    label: 'New Asset',
    description: 'New asset discovered or added',
    requiredModule: 'assets',
  },
  {
    value: 'asset_changed',
    category: 'asset',
    label: 'Asset Changed',
    description: 'Asset information changed',
    requiredModule: 'assets',
  },
  {
    value: 'asset_deleted',
    category: 'asset',
    label: 'Asset Deleted',
    description: 'Asset removed from inventory',
    requiredModule: 'assets',
  },
  // Scan events - require 'scans' module
  {
    value: 'scan_started',
    category: 'scan',
    label: 'Scan Started',
    description: 'Scan job started',
    requiredModule: 'scans',
  },
  {
    value: 'scan_completed',
    category: 'scan',
    label: 'Scan Completed',
    description: 'Scan job completed successfully',
    requiredModule: 'scans',
  },
  {
    value: 'scan_failed',
    category: 'scan',
    label: 'Scan Failed',
    description: 'Scan job failed',
    requiredModule: 'scans',
  },
  // Finding events - require 'findings' module
  {
    value: 'new_finding',
    category: 'finding',
    label: 'New Finding',
    description: 'New security finding detected',
    requiredModule: 'findings',
  },
  {
    value: 'finding_confirmed',
    category: 'finding',
    label: 'Confirmed Finding',
    description: 'Finding confirmed as valid',
    requiredModule: 'findings',
  },
  {
    value: 'finding_triaged',
    category: 'finding',
    label: 'Need Triage Finding',
    description: 'Finding needs triage/review',
    requiredModule: 'findings',
  },
  {
    value: 'finding_fixed',
    category: 'finding',
    label: 'Fixed Finding',
    description: 'Finding has been remediated',
    requiredModule: 'findings',
  },
  {
    value: 'finding_reopened',
    category: 'finding',
    label: 'Reopened Finding',
    description: 'Finding reopened after fix',
    requiredModule: 'findings',
  },
  // Exposure events - require 'findings' module (exposures are part of findings feature)
  {
    value: 'new_exposure',
    category: 'exposure',
    label: 'New Exposure',
    description: 'New credential/data exposure detected',
    requiredModule: 'findings',
  },
  {
    value: 'exposure_resolved',
    category: 'exposure',
    label: 'Exposure Resolved',
    description: 'Exposure has been resolved',
    requiredModule: 'findings',
  },
]

/**
 * Event category labels for UI grouping
 */
export const EVENT_CATEGORY_LABELS: Record<NotificationEventCategory, string> = {
  system: 'System Events',
  asset: 'Asset Events',
  scan: 'Scan Events',
  finding: 'Finding Events',
  exposure: 'Exposure Events',
}

/**
 * Default enabled event types for new notification channels
 */
export const DEFAULT_ENABLED_EVENT_TYPES: NotificationEventType[] = [
  'security_alert',
  'new_finding',
  'new_exposure',
]

/**
 * Filter event types based on enabled modules
 * @param enabledModuleIds - Array of module IDs that are enabled for the tenant
 * @returns Filtered array of event types that the tenant can use
 */
export function getAvailableEventTypes(enabledModuleIds: string[]): NotificationEventTypeInfo[] {
  return ALL_NOTIFICATION_EVENT_TYPES.filter((et) => {
    // System events are always available (no module required)
    if (!et.requiredModule) return true
    // Check if required module is enabled for tenant
    return enabledModuleIds.includes(et.requiredModule)
  })
}

/**
 * Get default enabled event types filtered by available modules
 * @param enabledModuleIds - Array of module IDs that are enabled for the tenant
 * @returns Default event types that are available for the tenant
 */
export function getDefaultEnabledEventTypes(enabledModuleIds: string[]): NotificationEventType[] {
  const availableTypes = getAvailableEventTypes(enabledModuleIds)
  const availableValues = new Set(availableTypes.map((t) => t.value))
  return DEFAULT_ENABLED_EVENT_TYPES.filter((et) => availableValues.has(et))
}

/**
 * Notification Extension - additional fields specific to notification integrations
 */
export interface NotificationExtension {
  channel_id?: string
  channel_name?: string
  enabled_severities: NotificationSeverity[] // Dynamic severity filtering
  enabled_event_types: string[] // Dynamic event type IDs (database-driven)
  message_template?: string
  include_details: boolean
  min_interval_minutes: number
}

/**
 * Integration entity
 */
export interface Integration {
  id: string
  tenant_id?: string
  name: string
  description?: string
  provider: IntegrationProvider
  category: IntegrationCategory
  status: IntegrationStatus
  status_message?: string

  // Connection details
  auth_type: AuthType
  base_url?: string
  credentials_masked?: string // e.g., "ghp_xxxx...xxxx"

  // Sync info
  last_sync_at?: string
  next_sync_at?: string
  sync_interval_minutes?: number
  sync_error?: string

  // Statistics
  stats?: {
    total_assets: number
    total_findings: number
    total_repositories?: number
  }

  // Metadata
  config?: Record<string, unknown>
  metadata?: Record<string, unknown>

  // SCM-specific extension (only present for SCM integrations)
  scm_extension?: SCMExtension

  // Notification-specific extension (only present for notification integrations)
  notification_extension?: NotificationExtension

  // Timestamps
  created_at: string
  updated_at: string
  created_by?: string
}

/**
 * Integration list filters
 */
export interface IntegrationListFilters {
  category?: IntegrationCategory
  provider?: IntegrationProvider
  status?: IntegrationStatus
  search?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

/**
 * Create integration request
 */
export interface CreateIntegrationRequest {
  name: string
  description?: string
  category: IntegrationCategory
  provider: IntegrationProvider
  auth_type: AuthType
  base_url?: string
  credentials?: string
  scm_organization?: string
}

/**
 * Update integration request
 */
export interface UpdateIntegrationRequest {
  name?: string
  description?: string
  credentials?: string
  base_url?: string
  scm_organization?: string
}

/**
 * Create notification integration request
 */
export interface CreateNotificationIntegrationRequest {
  name: string
  description?: string
  provider: 'slack' | 'teams' | 'telegram' | 'webhook' | 'email'
  auth_type: AuthType
  credentials: string
  channel_id?: string
  channel_name?: string
  enabled_severities?: NotificationSeverity[] // Severity levels to notify on
  enabled_event_types?: string[] // Event type IDs (database-driven)
  message_template?: string
  include_details?: boolean
  min_interval_minutes?: number
}

/**
 * Test notification response
 */
export interface TestNotificationResponse {
  success: boolean
  message_id?: string
  error?: string
}

/**
 * Send notification request
 */
export interface SendNotificationRequest {
  title: string
  body: string
  severity?: 'critical' | 'high' | 'medium' | 'low'
  url?: string
  fields?: Record<string, string>
}

/**
 * Test credentials request
 */
export interface TestCredentialsRequest {
  category: IntegrationCategory
  provider: IntegrationProvider
  base_url?: string
  auth_type: AuthType
  credentials: string
  scm_organization?: string
}

/**
 * Test credentials response
 */
export interface TestCredentialsResponse {
  success: boolean
  message: string
  repository_count?: number
  organization?: string
  username?: string
}

/**
 * SCM Repository from provider
 */
export interface SCMRepository {
  id: string
  name: string
  full_name: string
  description?: string
  html_url: string
  clone_url: string
  ssh_url: string
  default_branch: string
  is_private: boolean
  is_fork: boolean
  is_archived: boolean
  language?: string
  languages?: Record<string, number>
  topics?: string[]
  stars: number
  forks: number
  size: number
  created_at: string
  updated_at: string
  pushed_at: string
}

/**
 * List SCM repositories response
 */
export interface ListSCMRepositoriesResponse {
  repositories: SCMRepository[]
  total: number
  has_more: boolean
  next_page: number
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  id: IntegrationProvider
  name: string
  category: IntegrationCategory
  description: string
  icon: string
  authTypes: AuthType[]
  features: string[]
  docUrl: string
  available: boolean
}

/**
 * Provider configurations
 */
export const INTEGRATION_PROVIDERS: Record<IntegrationProvider, ProviderConfig> = {
  // SCM Providers
  github: {
    id: 'github',
    name: 'GitHub',
    category: 'scm',
    description: 'Connect to GitHub repositories for code scanning',
    icon: 'github',
    authTypes: ['oauth', 'token', 'app'],
    features: ['repositories', 'code_scanning', 'webhooks'],
    docUrl: 'https://docs.github.com',
    available: true,
  },
  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    category: 'scm',
    description: 'Connect to GitLab projects for code scanning',
    icon: 'gitlab',
    authTypes: ['oauth', 'token'],
    features: ['repositories', 'code_scanning', 'webhooks'],
    docUrl: 'https://docs.gitlab.com',
    available: true,
  },
  bitbucket: {
    id: 'bitbucket',
    name: 'Bitbucket',
    category: 'scm',
    description: 'Connect to Bitbucket repositories for code scanning',
    icon: 'bitbucket',
    authTypes: ['oauth', 'token', 'app'],
    features: ['repositories', 'code_scanning', 'webhooks'],
    docUrl: 'https://developer.atlassian.com/bitbucket',
    available: true,
  },
  azure_devops: {
    id: 'azure_devops',
    name: 'Azure DevOps',
    category: 'scm',
    description: 'Connect to Azure Repos for code scanning',
    icon: 'azure',
    authTypes: ['oauth', 'token'],
    features: ['repositories', 'code_scanning', 'pipelines'],
    docUrl: 'https://docs.microsoft.com/azure/devops',
    available: true,
  },
  codecommit: {
    id: 'codecommit',
    name: 'AWS CodeCommit',
    category: 'scm',
    description: 'Connect to AWS CodeCommit repositories',
    icon: 'aws',
    authTypes: ['api_key'],
    features: ['repositories', 'code_scanning'],
    docUrl: 'https://docs.aws.amazon.com/codecommit',
    available: false,
  },
  local: {
    id: 'local',
    name: 'Local Repository',
    category: 'scm',
    description: 'Connect to local repositories',
    icon: 'folder',
    authTypes: ['token'],
    features: ['repositories'],
    docUrl: '',
    available: false,
  },

  // Security Tools
  wiz: {
    id: 'wiz',
    name: 'Wiz',
    category: 'security',
    description: 'Import cloud security findings from Wiz',
    icon: 'wiz',
    authTypes: ['api_key'],
    features: ['findings', 'assets', 'compliance'],
    docUrl: 'https://docs.wiz.io',
    available: false,
  },
  snyk: {
    id: 'snyk',
    name: 'Snyk',
    category: 'security',
    description: 'Import vulnerability findings from Snyk',
    icon: 'snyk',
    authTypes: ['api_key', 'token'],
    features: ['findings', 'sbom', 'license'],
    docUrl: 'https://docs.snyk.io',
    available: false,
  },
  tenable: {
    id: 'tenable',
    name: 'Tenable',
    category: 'security',
    description: 'Import vulnerability scan results from Tenable',
    icon: 'tenable',
    authTypes: ['api_key'],
    features: ['findings', 'assets', 'compliance'],
    docUrl: 'https://docs.tenable.com',
    available: false,
  },
  crowdstrike: {
    id: 'crowdstrike',
    name: 'CrowdStrike',
    category: 'security',
    description: 'Import endpoint security data from CrowdStrike',
    icon: 'crowdstrike',
    authTypes: ['api_key', 'oauth'],
    features: ['findings', 'assets', 'threats'],
    docUrl: 'https://falcon.crowdstrike.com/documentation',
    available: false,
  },

  // Ticketing
  jira: {
    id: 'jira',
    name: 'Jira',
    category: 'ticketing',
    description: 'Create and sync issues with Jira',
    icon: 'jira',
    authTypes: ['oauth', 'token', 'basic'],
    features: ['issues', 'webhooks', 'sync'],
    docUrl: 'https://developer.atlassian.com/cloud/jira',
    available: false,
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    category: 'ticketing',
    description: 'Create and sync issues with Linear',
    icon: 'linear',
    authTypes: ['oauth', 'api_key'],
    features: ['issues', 'webhooks', 'sync'],
    docUrl: 'https://developers.linear.app',
    available: false,
  },
  asana: {
    id: 'asana',
    name: 'Asana',
    category: 'ticketing',
    description: 'Create and sync tasks with Asana',
    icon: 'asana',
    authTypes: ['oauth', 'token'],
    features: ['tasks', 'projects', 'sync'],
    docUrl: 'https://developers.asana.com',
    available: false,
  },

  // Cloud Providers
  aws: {
    id: 'aws',
    name: 'Amazon Web Services',
    category: 'cloud',
    description: 'Connect to AWS for cloud asset inventory',
    icon: 'aws',
    authTypes: ['api_key'],
    features: ['assets', 'findings', 'compliance'],
    docUrl: 'https://docs.aws.amazon.com',
    available: false,
  },
  gcp: {
    id: 'gcp',
    name: 'Google Cloud Platform',
    category: 'cloud',
    description: 'Connect to GCP for cloud asset inventory',
    icon: 'gcp',
    authTypes: ['oauth', 'api_key'],
    features: ['assets', 'findings', 'compliance'],
    docUrl: 'https://cloud.google.com/docs',
    available: false,
  },
  azure: {
    id: 'azure',
    name: 'Microsoft Azure',
    category: 'cloud',
    description: 'Connect to Azure for cloud asset inventory',
    icon: 'azure',
    authTypes: ['oauth', 'api_key'],
    features: ['assets', 'findings', 'compliance'],
    docUrl: 'https://docs.microsoft.com/azure',
    available: false,
  },

  // Notifications
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'notification',
    description: 'Send notifications to Slack channels',
    icon: 'slack',
    authTypes: ['oauth', 'token'],
    features: ['notifications', 'alerts', 'commands'],
    docUrl: 'https://api.slack.com',
    available: true,
  },
  teams: {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'notification',
    description: 'Send notifications to Teams channels',
    icon: 'teams',
    authTypes: ['oauth', 'token'],
    features: ['notifications', 'alerts'],
    docUrl: 'https://docs.microsoft.com/microsoftteams',
    available: true,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    category: 'notification',
    description: 'Send notifications to Telegram chats',
    icon: 'telegram',
    authTypes: ['token'],
    features: ['notifications', 'alerts'],
    docUrl: 'https://core.telegram.org/bots/api',
    available: true,
  },
  email: {
    id: 'email',
    name: 'Email',
    category: 'notification',
    description: 'Send email notifications',
    icon: 'email',
    authTypes: ['basic', 'api_key'],
    features: ['notifications', 'reports'],
    docUrl: '',
    available: false,
  },
  webhook: {
    id: 'webhook',
    name: 'Webhook',
    category: 'notification',
    description: 'Send notifications to custom webhooks',
    icon: 'webhook',
    authTypes: ['token', 'basic'],
    features: ['notifications', 'events'],
    docUrl: '',
    available: true,
  },
}

/**
 * Category configuration
 */
export const INTEGRATION_CATEGORIES: Record<
  IntegrationCategory,
  {
    label: string
    description: string
    icon: string
  }
> = {
  scm: {
    label: 'Source Control',
    description: 'Connect to code repositories',
    icon: 'git-branch',
  },
  security: {
    label: 'Security Tools',
    description: 'Import security findings',
    icon: 'shield',
  },
  ticketing: {
    label: 'Issue Tracking',
    description: 'Create and sync issues',
    icon: 'ticket',
  },
  cloud: {
    label: 'Cloud Providers',
    description: 'Cloud asset inventory',
    icon: 'cloud',
  },
  notification: {
    label: 'Notifications',
    description: 'Send alerts and notifications',
    icon: 'bell',
  },
}

// =============================================================================
// Notification Events (audit trail)
// =============================================================================

/**
 * Notification event status (final processing status)
 */
export type NotificationEventStatus = 'completed' | 'failed' | 'skipped'

/**
 * Send result for a single integration
 */
export interface NotificationEventSendResult {
  integration_id: string
  name: string
  provider: string
  status: 'success' | 'failed'
  message_id?: string
  error?: string
  sent_at: string
}

/**
 * Notification event entry (from notification_events table)
 */
export interface NotificationEventEntry {
  id: string
  event_type: string
  aggregate_type?: string
  aggregate_id?: string
  title: string
  body?: string
  severity: string
  url?: string
  status: NotificationEventStatus
  integrations_total: number
  integrations_matched: number
  integrations_succeeded: number
  integrations_failed: number
  send_results: NotificationEventSendResult[]
  last_error?: string
  retry_count: number
  created_at: string
  processed_at: string
}

/**
 * Notification events response with pagination
 */
export interface NotificationEventsResponse {
  data: NotificationEventEntry[]
  total: number
  limit: number
  offset: number
}

/**
 * Status configuration
 */
export const INTEGRATION_STATUS_CONFIG: Record<
  IntegrationStatus,
  {
    label: string
    color: string
    bgColor: string
  }
> = {
  connected: {
    label: 'Connected',
    color: 'text-green-500',
    bgColor: 'bg-green-500',
  },
  disconnected: {
    label: 'Disconnected',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500',
  },
  error: {
    label: 'Error',
    color: 'text-red-500',
    bgColor: 'bg-red-500',
  },
  pending: {
    label: 'Pending',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
  },
  expired: {
    label: 'Expired',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
  },
  disabled: {
    label: 'Disabled',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
  },
}
