/**
 * Common Types
 *
 * Shared type definitions used across features
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none'

export type Status = 'active' | 'inactive' | 'archived' | 'pending' | 'completed' | 'failed'

export type Environment = 'production' | 'staging' | 'development' | 'testing'

export type Criticality = 'critical' | 'high' | 'medium' | 'low'

// Security Process Steps
export type SecurityProcessStep =
  | 'scoping'
  | 'discovery'
  | 'prioritization'
  | 'validation'
  | 'mobilization'

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

// Severity configuration for UI
export const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'bg-red-500',
    textColor: 'text-white',
    borderColor: 'border-red-500',
  },
  high: {
    label: 'High',
    color: 'bg-orange-500',
    textColor: 'text-white',
    borderColor: 'border-orange-500',
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-500',
    textColor: 'text-black',
    borderColor: 'border-yellow-500',
  },
  low: {
    label: 'Low',
    color: 'bg-blue-500',
    textColor: 'text-white',
    borderColor: 'border-blue-500',
  },
  info: {
    label: 'Info',
    color: 'bg-gray-500',
    textColor: 'text-white',
    borderColor: 'border-gray-500',
  },
  none: {
    label: 'None',
    color: 'bg-gray-500',
    textColor: 'text-white',
    borderColor: 'border-gray-500',
  },
} as const

// Risk level configuration
export const getRiskLevel = (score: number) => {
  if (score >= 80) return { label: 'Critical', color: 'bg-red-500', textColor: 'text-white' }
  if (score >= 60) return { label: 'High', color: 'bg-orange-500', textColor: 'text-white' }
  if (score >= 40) return { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-black' }
  if (score >= 20) return { label: 'Low', color: 'bg-blue-500', textColor: 'text-white' }
  return { label: 'Info', color: 'bg-green-500', textColor: 'text-white' }
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
