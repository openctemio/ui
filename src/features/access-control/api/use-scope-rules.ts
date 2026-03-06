'use client'

/**
 * Scope Rules API Hooks
 *
 * SWR hooks for fetching and managing scope rules.
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { fetcher, fetcherWithOptions } from '@/lib/api/client'
import type {
  ScopeRule,
  CreateScopeRuleInput,
  UpdateScopeRuleInput,
  PreviewScopeRuleResult,
  ReconcileGroupResult,
} from '../types'

function scopeRulesUrl(groupId: string | null) {
  return groupId ? `/api/v1/groups/${groupId}/scope-rules` : null
}

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Fetch all scope rules for a group
 */
export function useScopeRules(groupId: string | null, options?: { skip?: boolean }) {
  const url = !options?.skip ? scopeRulesUrl(groupId) : null

  const { data, error, isLoading, mutate } = useSWR<{
    rules: ScopeRule[]
    total_count: number
    limit: number
    offset: number
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  return {
    scopeRules: data?.rules || [],
    totalCount: data?.total_count || 0,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new scope rule
 */
export function useCreateScopeRule(groupId: string | null) {
  const { trigger, isMutating } = useSWRMutation(
    scopeRulesUrl(groupId),
    (url: string, { arg }: { arg: CreateScopeRuleInput }) =>
      fetcherWithOptions(url, { method: 'POST', body: JSON.stringify(arg) })
  )

  return { createScopeRule: trigger, isCreating: isMutating }
}

/**
 * Update a scope rule
 */
export function useUpdateScopeRule(groupId: string | null, ruleId: string | null) {
  const url = groupId && ruleId ? `/api/v1/groups/${groupId}/scope-rules/${ruleId}` : null

  const { trigger, isMutating } = useSWRMutation(
    url,
    (url: string, { arg }: { arg: UpdateScopeRuleInput }) =>
      fetcherWithOptions(url, { method: 'PUT', body: JSON.stringify(arg) })
  )

  return { updateScopeRule: trigger, isUpdating: isMutating }
}

/**
 * Delete a scope rule
 */
export function useDeleteScopeRule(groupId: string | null, ruleId: string | null) {
  const url = groupId && ruleId ? `/api/v1/groups/${groupId}/scope-rules/${ruleId}` : null

  const { trigger, isMutating } = useSWRMutation(url, (url: string) =>
    fetcherWithOptions(url, { method: 'DELETE' })
  )

  return { deleteScopeRule: trigger, isDeleting: isMutating }
}

/**
 * Preview scope rule matches
 */
export function usePreviewScopeRule(groupId: string | null, ruleId: string | null) {
  const url = groupId && ruleId ? `/api/v1/groups/${groupId}/scope-rules/${ruleId}/preview` : null

  const { trigger, isMutating } = useSWRMutation<PreviewScopeRuleResult>(
    url,
    (url: string) => fetcherWithOptions(url, { method: 'POST' }) as Promise<PreviewScopeRuleResult>
  )

  return { previewScopeRule: trigger, isPreviewing: isMutating }
}

/**
 * Reconcile all scope rules for a group
 */
export function useReconcileGroup(groupId: string | null) {
  const url = groupId ? `/api/v1/groups/${groupId}/scope-rules/reconcile` : null

  const { trigger, isMutating } = useSWRMutation<ReconcileGroupResult>(
    url,
    (url: string) => fetcherWithOptions(url, { method: 'POST' }) as Promise<ReconcileGroupResult>
  )

  return { reconcileGroup: trigger, isReconciling: isMutating }
}
