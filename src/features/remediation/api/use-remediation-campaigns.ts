'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, patch, del } from '@/lib/api/client'

export interface RemediationCampaign {
  id: string
  name: string
  description: string
  status: string
  priority: string
  finding_filter: Record<string, unknown>
  finding_count: number
  resolved_count: number
  progress: number
  risk_before: number | null
  risk_after: number | null
  risk_reduction: number | null
  assigned_to: string | null
  assigned_team: string | null
  is_overdue: boolean
  start_date: string | null
  due_date: string | null
  completed_at: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

export function useRemediationCampaigns(filters?: {
  status?: string
  priority?: string
  search?: string
}) {
  const params = new URLSearchParams()
  params.set('per_page', '50')
  if (filters?.status) params.set('status', filters.status)
  if (filters?.priority) params.set('priority', filters.priority)
  if (filters?.search) params.set('search', filters.search)
  return useSWR<PaginatedResponse<RemediationCampaign>>(
    `/api/v1/remediation/campaigns?${params.toString()}`,
    get,
    { revalidateOnFocus: false }
  )
}

export function useRemediationCampaign(id: string) {
  return useSWR<RemediationCampaign>(id ? `/api/v1/remediation/campaigns/${id}` : null, get)
}

export function useCreateRemediationCampaign() {
  return useSWRMutation(
    '/api/v1/remediation/campaigns',
    (url: string, { arg }: { arg: Partial<RemediationCampaign> }) => post(url, arg)
  )
}

export function useUpdateRemediationCampaign(id: string) {
  return useSWRMutation(
    `/api/v1/remediation/campaigns/${id}`,
    (url: string, { arg }: { arg: Partial<RemediationCampaign> }) => patch(url, arg)
  )
}

export function useUpdateCampaignStatus(id: string) {
  return useSWRMutation(
    `/api/v1/remediation/campaigns/${id}/status`,
    (url: string, { arg }: { arg: { status: string } }) => patch(url, arg)
  )
}

export function useDeleteRemediationCampaign(id: string) {
  return useSWRMutation(`/api/v1/remediation/campaigns/${id}`, (url: string) => del(url))
}

export interface CampaignTicketInfo {
  campaign_id: string
  provider: string
  issue_key: string
  issue_url: string
  already_existed: boolean
}

/**
 * Creates (or returns the existing) Jira epic for a campaign. Idempotent on the
 * backend — re-invoking returns the existing link with already_existed=true.
 */
export function useCreateCampaignTicket(id: string) {
  return useSWRMutation<CampaignTicketInfo, Error, string, { project_key: string }>(
    `/api/v1/remediation/campaigns/${id}/create-ticket`,
    (url: string, { arg }: { arg: { project_key: string } }) => post(url, arg)
  )
}
