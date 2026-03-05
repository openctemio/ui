'use client'

/**
 * Assignment Rules API Hooks
 *
 * SWR hooks for fetching and managing assignment rules.
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { fetcher, fetcherWithOptions } from '@/lib/api/client'
import type {
  AssignmentRule,
  AssignmentRuleFilters,
  CreateAssignmentRuleInput,
  UpdateAssignmentRuleInput,
  TestRuleResult,
} from '../types'

const API_BASE = '/api/v1/assignment-rules'

// ============================================
// FETCH HOOKS
// ============================================

/**
 * Fetch all assignment rules
 */
export function useAssignmentRules(filters?: AssignmentRuleFilters) {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.is_active !== undefined) params.set('active', String(filters.is_active))

  const queryString = params.toString()
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE

  const { data, error, isLoading, mutate } = useSWR<{ rules: AssignmentRule[] }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  return {
    assignmentRules: data?.rules || [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

/**
 * Fetch a single assignment rule
 */
export function useAssignmentRule(ruleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AssignmentRule>(
    ruleId ? `${API_BASE}/${ruleId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  return {
    assignmentRule: data || null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  }
}

// ============================================
// MUTATION HOOKS
// ============================================

async function createRuleMutation(url: string, { arg }: { arg: CreateAssignmentRuleInput }) {
  return fetcherWithOptions<{ assignment_rule: AssignmentRule }>(url, {
    method: 'POST',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to create a new assignment rule
 */
export function useCreateAssignmentRule() {
  const { trigger, isMutating, error } = useSWRMutation(API_BASE, createRuleMutation)

  return {
    createAssignmentRule: trigger,
    isCreating: isMutating,
    error,
  }
}

async function updateRuleMutation(url: string, { arg }: { arg: UpdateAssignmentRuleInput }) {
  return fetcherWithOptions<{ assignment_rule: AssignmentRule }>(url, {
    method: 'PUT',
    body: JSON.stringify(arg),
  })
}

/**
 * Hook to update an assignment rule
 */
export function useUpdateAssignmentRule(ruleId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    ruleId ? `${API_BASE}/${ruleId}` : null,
    updateRuleMutation
  )

  return {
    updateAssignmentRule: trigger,
    isUpdating: isMutating,
    error,
  }
}

async function deleteRuleMutation(url: string) {
  return fetcherWithOptions<void>(url, {
    method: 'DELETE',
  })
}

/**
 * Hook to delete an assignment rule
 */
export function useDeleteAssignmentRule(ruleId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    ruleId ? `${API_BASE}/${ruleId}` : null,
    deleteRuleMutation
  )

  return {
    deleteAssignmentRule: trigger,
    isDeleting: isMutating,
    error,
  }
}

async function testRuleMutation(url: string) {
  return fetcherWithOptions<TestRuleResult>(url, {
    method: 'POST',
  })
}

/**
 * Hook to test an assignment rule (dry run)
 */
export function useTestAssignmentRule(ruleId: string | null) {
  const { trigger, isMutating, error } = useSWRMutation(
    ruleId ? `${API_BASE}/${ruleId}/test` : null,
    testRuleMutation
  )

  return {
    testAssignmentRule: trigger,
    isTesting: isMutating,
    error,
  }
}

// ============================================
// CACHE KEYS
// ============================================

export function getAssignmentRulesKey(filters?: AssignmentRuleFilters) {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))
  const queryString = params.toString()
  return queryString ? `${API_BASE}?${queryString}` : API_BASE
}

export function getAssignmentRuleKey(ruleId: string) {
  return `${API_BASE}/${ruleId}`
}
