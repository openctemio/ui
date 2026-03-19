/**
 * Compliance Framework API Hooks
 *
 * SWR hooks for compliance frameworks, controls, assessments, and mappings.
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, del } from '@/lib/api/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { ControlStatus, Priority } from '../types/compliance.types'

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) return false
    return true
  },
  errorRetryCount: 3,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, { showToast: true, logError: true })
  },
}

// ============================================
// TYPES
// ============================================

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ComplianceFrameworkApi {
  id: string
  name: string
  slug: string
  version: string
  description: string
  category: string
  total_controls: number
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ComplianceControlApi {
  id: string
  framework_id: string
  control_id: string
  title: string
  description: string
  category: string
  parent_control_id?: string
  sort_order: number
  created_at: string
}

export interface ComplianceAssessmentApi {
  id: string
  framework_id: string
  control_id: string
  status: string
  priority?: string
  owner?: string
  notes?: string
  evidence_count: number
  finding_count: number
  assessed_by?: string
  assessed_at?: string
  due_date?: string
  created_at: string
  updated_at: string
}

export interface ComplianceMappingApi {
  id: string
  finding_id: string
  control_id: string
  impact: string
  notes?: string
  created_at: string
  created_by?: string
}

export interface ComplianceStatsApi {
  total_frameworks: number
  total_controls: number
  overdue_controls: number
}

export interface FrameworkStatsApi {
  TotalControls: number
  Implemented: number
  Partial: number
  NotImplemented: number
  NotApplicable: number
  NotAssessed: number
}

// ============================================
// FRAMEWORK HOOKS
// ============================================

export function useFrameworks() {
  return useSWR<PaginatedResponse<ComplianceFrameworkApi>>(
    '/api/v1/compliance/frameworks?per_page=50',
    get,
    defaultConfig
  )
}

export function useFramework(id: string) {
  return useSWR<ComplianceFrameworkApi>(
    id ? `/api/v1/compliance/frameworks/${id}` : null,
    get,
    defaultConfig
  )
}

export function useFrameworkControls(frameworkId: string, page = 1, perPage = 100) {
  return useSWR<PaginatedResponse<ComplianceControlApi>>(
    frameworkId
      ? `/api/v1/compliance/frameworks/${frameworkId}/controls?page=${page}&per_page=${perPage}`
      : null,
    get,
    defaultConfig
  )
}

export function useFrameworkStats(frameworkId: string) {
  return useSWR<FrameworkStatsApi>(
    frameworkId ? `/api/v1/compliance/frameworks/${frameworkId}/stats` : null,
    get,
    defaultConfig
  )
}

// ============================================
// ASSESSMENT HOOKS
// ============================================

export function useAssessments(frameworkId: string, page = 1, perPage = 100) {
  return useSWR<PaginatedResponse<ComplianceAssessmentApi>>(
    frameworkId
      ? `/api/v1/compliance/assessments?framework_id=${frameworkId}&page=${page}&per_page=${perPage}`
      : null,
    get,
    defaultConfig
  )
}

export function useUpdateAssessment(controlId: string) {
  return useSWRMutation(
    `/api/v1/compliance/controls/${controlId}/assess`,
    (
      url: string,
      {
        arg,
      }: {
        arg: {
          framework_id: string
          status: ControlStatus
          priority?: Priority
          owner?: string
          notes?: string
          due_date?: string
        }
      }
    ) => post(url, arg)
  )
}

// ============================================
// STATS HOOKS
// ============================================

export function useComplianceStats() {
  return useSWR<ComplianceStatsApi>('/api/v1/compliance/stats', get, defaultConfig)
}

// ============================================
// MAPPING HOOKS
// ============================================

export function useFindingControls(findingId: string) {
  return useSWR<{ data: ComplianceMappingApi[] }>(
    findingId ? `/api/v1/compliance/findings/${findingId}/controls` : null,
    get,
    defaultConfig
  )
}

export function useMapFindingToControl(findingId: string) {
  return useSWRMutation(
    `/api/v1/compliance/findings/${findingId}/controls`,
    (url: string, { arg }: { arg: { control_id: string; impact?: string } }) => post(url, arg)
  )
}

export function useUnmapFindingFromControl(findingId: string, mappingId: string) {
  return useSWRMutation(
    `/api/v1/compliance/findings/${findingId}/controls/${mappingId}`,
    (url: string) => del(url)
  )
}
