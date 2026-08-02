/**
 * Common Types
 *
 * Shared type definitions used across features
 */

import {
  SEVERITY_DOT_COLORS,
  SEVERITY_SOLID_TEXT,
  SEVERITY_BORDER_COLORS,
  type SeverityLevel as SeverityColorLevel,
} from '@/lib/severity-colors'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none'

export type Status =
  'active' | 'stale' | 'inactive' | 'archived' | 'pending' | 'completed' | 'failed'

export type Environment = 'production' | 'staging' | 'development' | 'testing'

export type Criticality = 'critical' | 'high' | 'medium' | 'low'

// Security Process Steps
export type SecurityProcessStep =
  'scoping' | 'discovery' | 'prioritization' | 'validation' | 'mobilization'

export const SECURITY_PROCESS_STEPS: {
  id: SecurityProcessStep
  label: string
  description: string
}[] = [
  { id: 'scoping', label: 'Scoping', description: 'Define attack surface' },
  {
    id: 'discovery',
    label: 'Discovery',
    description: 'Find assets & threats',
  },
  {
    id: 'prioritization',
    label: 'Prioritization',
    description: 'Risk analysis',
  },
  { id: 'validation', label: 'Validation', description: 'Simulate attacks' },
  { id: 'mobilization', label: 'Mobilization', description: 'Remediate' },
]

// Severity configuration for UI. Colors are DERIVED from the single source of
// truth (src/lib/severity-colors.ts) so this map can never drift from it — the
// values are identical to the previous hard-coded ones (no visual change).
const sevEntry = (label: string, level: SeverityColorLevel) => ({
  label,
  color: SEVERITY_DOT_COLORS[level],
  textColor: SEVERITY_SOLID_TEXT[level],
  borderColor: SEVERITY_BORDER_COLORS[level],
})

export const SEVERITY_CONFIG = {
  critical: sevEntry('Critical', 'critical'),
  high: sevEntry('High', 'high'),
  medium: sevEntry('Medium', 'medium'),
  low: sevEntry('Low', 'low'),
  info: sevEntry('Info', 'info'),
  // "none" reuses the neutral info palette.
  none: sevEntry('None', 'info'),
} as const

// Risk level thresholds interface
export interface RiskLevelThresholds {
  critical_min: number
  high_min: number
  medium_min: number
  low_min: number
}

// Default risk level thresholds
export const DEFAULT_RISK_LEVELS: RiskLevelThresholds = {
  critical_min: 80,
  high_min: 60,
  medium_min: 40,
  low_min: 20,
}

// Risk level configuration — supports optional custom thresholds
export const getRiskLevel = (score: number, thresholds?: RiskLevelThresholds) => {
  const t = thresholds ?? DEFAULT_RISK_LEVELS
  if (score >= t.critical_min)
    return { label: 'Critical', color: 'bg-red-500', textColor: 'text-white' }
  if (score >= t.high_min) return { label: 'High', color: 'bg-orange-500', textColor: 'text-white' }
  if (score >= t.medium_min)
    return { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-black' }
  if (score >= t.low_min) return { label: 'Low', color: 'bg-blue-500', textColor: 'text-white' }
  return { label: 'Info', color: 'bg-green-500', textColor: 'text-white' }
}

// ============================================
// Org / asset risk score (single source of truth)
// ============================================
//
// Risk scores across the platform are on a 0–100 scale — matching the
// asset-stats `risk_score_avg` and the executive-summary `risk_score_current`
// the backend computes as AVG(assets.risk_score). Every "Risk Score" surface
// (StatsCards, hero cards, gauges) MUST render through these helpers so the
// value, scale, and level label stay identical across pages. Do NOT hand-roll
// a `/ 10` label or a private threshold ladder.

/** Maximum value of the canonical risk-score scale. */
export const RISK_SCORE_MAX = 100

/**
 * Format a 0–100 risk score for display, e.g. `formatRiskScore(52.7)` → "52.7 / 100".
 * Clamps out-of-range inputs so a stray 0–100 value never renders on a wrong axis.
 */
export function formatRiskScore(score: number, fractionDigits = 1): string {
  const clamped = Math.max(0, Math.min(RISK_SCORE_MAX, score))
  return `${clamped.toFixed(fractionDigits)} / ${RISK_SCORE_MAX}`
}

/** Tailwind text-color class for a 0–100 risk score, aligned with getRiskLevel bands. */
export function getRiskScoreTextColor(score: number, thresholds?: RiskLevelThresholds): string {
  const t = thresholds ?? DEFAULT_RISK_LEVELS
  if (score >= t.critical_min) return 'text-red-500'
  if (score >= t.high_min) return 'text-orange-500'
  if (score >= t.medium_min) return 'text-yellow-500'
  if (score >= t.low_min) return 'text-blue-500'
  return 'text-green-500'
}

/** StatsCard `changeType` for a 0–100 risk score (higher = worse). */
export function getRiskScoreChangeType(
  score: number,
  thresholds?: RiskLevelThresholds
): 'positive' | 'neutral' | 'negative' {
  const t = thresholds ?? DEFAULT_RISK_LEVELS
  if (score >= t.high_min) return 'negative'
  if (score >= t.medium_min) return 'neutral'
  return 'positive'
}

// User types
export type UserRole =
  | 'admin'
  | 'security_analyst'
  | 'security_engineer'
  | 'soc_manager'
  | 'penetration_tester'
  | 'ciso'
  | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  department?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  security_analyst: 'Security Analyst',
  security_engineer: 'Security Engineer',
  soc_manager: 'SOC Manager',
  penetration_tester: 'Penetration Tester',
  ciso: 'CISO',
  viewer: 'Viewer',
}
