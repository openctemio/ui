/**
 * Tenant Settings Types
 *
 * Type definitions for tenant/organization settings
 */

// ============================================
// GENERAL SETTINGS
// ============================================

export interface GeneralSettings {
  timezone: string
  language: string
  industry: string
  website: string
}

export interface UpdateGeneralSettingsInput {
  timezone?: string
  language?: string
  industry?: string
  website?: string
}

// ============================================
// SECURITY SETTINGS
// ============================================

export interface SecuritySettings {
  mfa_required: boolean
  session_timeout_min: number
  ip_whitelist: string[]
  allowed_domains: string[]
}

export interface UpdateSecuritySettingsInput {
  mfa_required?: boolean
  session_timeout_min?: number
  ip_whitelist?: string[]
  allowed_domains?: string[]
}

// ============================================
// API SETTINGS
// ============================================

export type WebhookEvent =
  | 'finding.created'
  | 'finding.resolved'
  | 'finding.updated'
  | 'scan.completed'
  | 'scan.failed'
  | 'asset.discovered'
  | 'asset.updated'
  | 'member.joined'
  | 'member.removed'

export interface APISettings {
  api_key_enabled: boolean
  webhook_url: string
  webhook_events: WebhookEvent[]
}

export interface UpdateAPISettingsInput {
  api_key_enabled?: boolean
  webhook_url?: string
  webhook_secret?: string
  webhook_events?: string[]
}

// ============================================
// BRANDING SETTINGS
// ============================================

export interface BrandingSettings {
  primary_color: string
  logo_dark_url: string
  logo_data?: string // Base64 encoded logo image
}

export interface UpdateBrandingSettingsInput {
  primary_color?: string
  logo_dark_url?: string
  logo_data?: string | null // Base64 encoded logo, null to remove
}

// ============================================
// RISK SCORING SETTINGS
// ============================================

export interface ComponentWeights {
  exposure: number
  criticality: number
  findings: number
  ctem: number
}

export interface ExposureScoreConfig {
  public: number
  restricted: number
  private: number
  isolated: number
  unknown: number
}

export interface ExposureMultiplierConfig {
  public: number
  restricted: number
  private: number
  isolated: number
  unknown: number
}

export interface CriticalityScoreConfig {
  critical: number
  high: number
  medium: number
  low: number
  none: number
}

export interface SeverityWeightConfig {
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export interface FindingImpactConfig {
  mode: 'count' | 'severity_weighted'
  per_finding_points: number
  finding_cap: number
  severity_weights: SeverityWeightConfig
}

export interface CTEMPointsConfig {
  enabled: boolean
  internet_accessible: number
  pii_exposed: number
  phi_exposed: number
  high_risk_compliance: number
  restricted_data: number
}

export interface RiskLevelConfig {
  critical_min: number
  high_min: number
  medium_min: number
  low_min: number
}

export interface RiskScoringSettings {
  preset?: string
  weights: ComponentWeights
  exposure_scores: ExposureScoreConfig
  exposure_multipliers: ExposureMultiplierConfig
  criticality_scores: CriticalityScoreConfig
  finding_impact: FindingImpactConfig
  ctem_points: CTEMPointsConfig
  risk_levels: RiskLevelConfig
}

export interface RiskScorePreviewItem {
  asset_id: string
  asset_name: string
  asset_type: string
  current_score: number
  new_score: number
  delta: number
}

export interface PreviewResponse {
  assets: RiskScorePreviewItem[]
  total_count: number
}

export interface RecalculateResponse {
  assets_updated: number
}

export interface PresetInfo {
  name: string
  config: RiskScoringSettings
}

// ============================================
// COMBINED SETTINGS
// ============================================

export interface TenantSettings {
  general: GeneralSettings
  security: SecuritySettings
  api: APISettings
  branding: BrandingSettings
  risk_scoring: RiskScoringSettings
}

// ============================================
// CONSTANTS
// ============================================

export const VALID_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Japan (GMT+9)' },
  { value: 'Asia/Seoul', label: 'Korea (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'China (GMT+8)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
] as const

export const VALID_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tieng Viet' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
] as const

export const VALID_INDUSTRIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'government', label: 'Government' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail' },
  { value: 'other', label: 'Other' },
] as const

export const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
] as const

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  {
    value: 'finding.created',
    label: 'Finding Created',
    description: 'When a new vulnerability finding is created',
  },
  {
    value: 'finding.resolved',
    label: 'Finding Resolved',
    description: 'When a finding is marked as resolved',
  },
  { value: 'finding.updated', label: 'Finding Updated', description: 'When a finding is updated' },
  {
    value: 'scan.completed',
    label: 'Scan Completed',
    description: 'When a security scan completes',
  },
  { value: 'scan.failed', label: 'Scan Failed', description: 'When a security scan fails' },
  {
    value: 'asset.discovered',
    label: 'Asset Discovered',
    description: 'When a new asset is discovered',
  },
  { value: 'asset.updated', label: 'Asset Updated', description: 'When an asset is updated' },
  {
    value: 'member.joined',
    label: 'Member Joined',
    description: 'When a new member joins the team',
  },
  { value: 'member.removed', label: 'Member Removed', description: 'When a member is removed' },
]
