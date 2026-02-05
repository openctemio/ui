/**
 * Account Types
 *
 * Type definitions for user account management
 */

// ============================================
// USER PROFILE
// ============================================

export interface UserProfile {
  id: string
  email: string
  name: string
  avatar_url?: string
  phone?: string
  bio?: string
  created_at: string
  updated_at: string
  email_verified: boolean
  auth_provider: 'local' | 'google' | 'github' | 'microsoft'
}

export interface UpdateProfileInput {
  name?: string
  phone?: string
  bio?: string
}

export interface UpdateAvatarInput {
  avatar_data: string // Base64 encoded image
}

// ============================================
// SECURITY
// ============================================

export interface ChangePasswordInput {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface TwoFactorStatus {
  enabled: boolean
  verified_at?: string
}

export interface TwoFactorSetupResponse {
  secret: string
  qr_code_url: string
  backup_codes: string[]
}

export interface TwoFactorVerifyInput {
  code: string
}

// ============================================
// SESSIONS
// ============================================

export interface Session {
  id: string
  device: string
  browser: string
  os: string
  ip_address: string
  location?: string
  created_at: string
  last_active_at: string
  is_current: boolean
}

export interface SessionListResponse {
  data: Session[]
  total: number
}

// ============================================
// PREFERENCES
// ============================================

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  date_format: string
  time_format: '12h' | '24h'
  email_notifications: EmailNotificationPreferences
  desktop_notifications: boolean
}

export interface EmailNotificationPreferences {
  security_alerts: boolean
  weekly_digest: boolean
  scan_completed: boolean
  new_findings: boolean
  team_updates: boolean
}

export interface UpdatePreferencesInput {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  timezone?: string
  date_format?: string
  time_format?: '12h' | '24h'
  email_notifications?: Partial<EmailNotificationPreferences>
  desktop_notifications?: boolean
}

// ============================================
// ACTIVITY
// ============================================

export interface ActivityLog {
  id: string
  event_type: ActivityEventType
  description: string
  ip_address: string
  user_agent: string
  location?: string
  created_at: string
  metadata?: Record<string, unknown>
}

export type ActivityEventType =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'profile_update'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'session_revoked'
  | 'api_key_created'
  | 'api_key_revoked'

export interface ActivityListResponse {
  data: ActivityLog[]
  total: number
  page: number
  per_page: number
}

// ============================================
// CONSTANTS
// ============================================

export const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  login: 'Signed in',
  logout: 'Signed out',
  password_change: 'Password changed',
  profile_update: 'Profile updated',
  '2fa_enabled': 'Two-factor authentication enabled',
  '2fa_disabled': 'Two-factor authentication disabled',
  session_revoked: 'Session revoked',
  api_key_created: 'API key created',
  api_key_revoked: 'API key revoked',
}

export const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
] as const

export const SUPPORTED_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (UTC+7)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)' },
  { value: 'America/New_York', label: 'America/New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (UTC-8)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
] as const

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
] as const
