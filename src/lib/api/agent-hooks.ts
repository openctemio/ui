/**
 * Agent API Hooks
 *
 * SWR hooks for Agent Management
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { useTenant } from '@/context/tenant-provider'
import { agentEndpoints } from './endpoints'
import type {
  Agent,
  AgentListResponse,
  AgentListFilters,
  CreateAgentRequest,
  CreateAgentResponse,
  UpdateAgentRequest,
  RegenerateAPIKeyResponse,
  AvailableCapabilitiesResponse,
  AgentSession,
  AgentSessionListResponse,
  AgentSessionStats,
  AgentDailyStats,
  AgentDailyStatsListResponse,
  AgentSessionListFilters,
  AgentDailyStatsListFilters,
} from './agent-types'

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Don't retry on client errors (4xx) - only retry on server/network errors
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors like 403, 404, etc.)
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
    // Retry on 5xx or network errors
    return true
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error) => {
    handleApiError(error, {
      showToast: true,
      logError: true,
    })
  },
}

// ============================================
// CACHE KEYS
// ============================================

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters?: AgentListFilters) => [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
  availableCapabilities: (includePlatform: boolean = true) =>
    [...agentKeys.all, 'available-capabilities', includePlatform] as const,
  // Analytics keys
  sessions: (id: string) => [...agentKeys.detail(id), 'sessions'] as const,
  sessionsList: (id: string, filters?: AgentSessionListFilters) =>
    [...agentKeys.sessions(id), 'list', filters] as const,
  activeSession: (id: string) => [...agentKeys.sessions(id), 'active'] as const,
  sessionStats: (id: string, filters?: { started_at?: string; ended_at?: string }) =>
    [...agentKeys.sessions(id), 'stats', filters] as const,
  dailyStats: (id: string, filters?: AgentDailyStatsListFilters) =>
    [...agentKeys.detail(id), 'daily-stats', filters] as const,
  timeSeries: (id: string, filters?: { from?: string; to?: string }) =>
    [...agentKeys.detail(id), 'timeseries', filters] as const,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchAgents(url: string): Promise<AgentListResponse> {
  return get<AgentListResponse>(url)
}

async function fetchAgent(url: string): Promise<Agent> {
  return get<Agent>(url)
}

async function fetchAvailableCapabilities(url: string): Promise<AvailableCapabilitiesResponse> {
  return get<AvailableCapabilitiesResponse>(url)
}

async function fetchAgentSessions(url: string): Promise<AgentSessionListResponse> {
  return get<AgentSessionListResponse>(url)
}

async function fetchActiveSession(url: string): Promise<AgentSession> {
  return get<AgentSession>(url)
}

async function fetchSessionStats(url: string): Promise<AgentSessionStats> {
  return get<AgentSessionStats>(url)
}

async function fetchDailyStats(url: string): Promise<AgentDailyStatsListResponse> {
  return get<AgentDailyStatsListResponse>(url)
}

async function fetchTimeSeries(url: string): Promise<AgentDailyStats[]> {
  return get<AgentDailyStats[]>(url)
}

// ============================================
// WORKER HOOKS
// ============================================

/**
 * Fetch agents list
 */
export function useAgents(filters?: AgentListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? agentEndpoints.list(filters) : null

  return useSWR<AgentListResponse>(key, fetchAgents, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single agent by ID
 */
export function useAgent(agentId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && agentId ? agentEndpoints.get(agentId) : null

  return useSWR<Agent>(key, fetchAgent, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch available capabilities for the current tenant.
 * Returns unique capability names from all agents accessible to the tenant:
 * - Tenant's own agents (active + online)
 * - Platform agents (if includePlatform=true, which is default)
 *
 * Use case: Determine what capabilities a tenant can use based on their available agents.
 * Example: If platform agents have capabilities A, B, C and tenant adds an agent with capability D,
 * the tenant will see they have access to capabilities A, B, C, D.
 *
 * @param includePlatform - Whether to include platform agents' capabilities (default: true)
 * @param config - SWR configuration options
 */
export function useAvailableCapabilities(
  includePlatform: boolean = true,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? agentEndpoints.availableCapabilities(includePlatform) : null

  return useSWR<AvailableCapabilitiesResponse>(key, fetchAvailableCapabilities, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// ANALYTICS HOOKS
// ============================================

/**
 * Fetch agent sessions list
 */
export function useAgentSessions(
  agentId: string | null,
  filters?: AgentSessionListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && agentId ? agentEndpoints.listSessions(agentId, filters) : null

  return useSWR<AgentSessionListResponse>(key, fetchAgentSessions, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch active session for an agent
 */
export function useActiveAgentSession(agentId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && agentId ? agentEndpoints.getActiveSession(agentId) : null

  return useSWR<AgentSession | null>(key, fetchActiveSession, {
    ...defaultConfig,
    // Don't show error toast for 404 (no active session)
    onError: (error) => {
      if (error?.statusCode !== 404) {
        handleApiError(error, { showToast: true, logError: true })
      }
    },
    ...config,
  })
}

/**
 * Fetch session stats for an agent
 */
export function useAgentSessionStats(
  agentId: string | null,
  filters?: { started_at?: string; ended_at?: string },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && agentId ? agentEndpoints.getSessionStats(agentId, filters) : null

  return useSWR<AgentSessionStats>(key, fetchSessionStats, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch daily stats for an agent
 */
export function useAgentDailyStats(
  agentId: string | null,
  filters?: AgentDailyStatsListFilters,
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && agentId ? agentEndpoints.listDailyStats(agentId, filters) : null

  return useSWR<AgentDailyStatsListResponse>(key, fetchDailyStats, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch time series data for an agent
 */
export function useAgentTimeSeries(
  agentId: string | null,
  filters?: { from?: string; to?: string },
  config?: SWRConfiguration
) {
  const { currentTenant } = useTenant()

  const key = currentTenant && agentId ? agentEndpoints.getTimeSeries(agentId, filters) : null

  return useSWR<AgentDailyStats[]>(key, fetchTimeSeries, {
    ...defaultConfig,
    ...config,
  })
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Create a new agent
 */
export function useCreateAgent() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? agentEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateAgentRequest }) => {
      return post<CreateAgentResponse>(url, arg)
    }
  )
}

/**
 * Update an agent
 */
export function useUpdateAgent(agentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && agentId ? agentEndpoints.update(agentId) : null,
    async (url: string, { arg }: { arg: UpdateAgentRequest }) => {
      return put<Agent>(url, arg)
    }
  )
}

/**
 * Delete an agent
 */
export function useDeleteAgent(agentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && agentId ? agentEndpoints.delete(agentId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Delete multiple agents (bulk delete)
 */
export function useBulkDeleteAgents() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? 'bulk-delete-agents' : null,
    async (_key: string, { arg: agentIds }: { arg: string[] }) => {
      // Delete agents sequentially to avoid overwhelming the server
      const results: { id: string; success: boolean; error?: string }[] = []

      for (const id of agentIds) {
        try {
          await del<void>(agentEndpoints.delete(id))
          results.push({ id, success: true })
        } catch (error) {
          results.push({
            id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      return results
    }
  )
}

/**
 * Regenerate agent API key
 */
export function useRegenerateAgentKey(agentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && agentId ? agentEndpoints.regenerateKey(agentId) : null,
    async (url: string) => {
      return post<RegenerateAPIKeyResponse>(url, {})
    },
    {
      // Don't revalidate other SWR hooks after mutation
      // We'll manually invalidate when user closes the dialog
      revalidate: false,
      populateCache: false,
    }
  )
}

/**
 * Activate an agent (set status to active)
 */
export function useActivateAgent(agentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && agentId ? agentEndpoints.activate(agentId) : null,
    async (url: string) => {
      return post<Agent>(url, {})
    }
  )
}

/**
 * Deactivate an agent (set status to disabled)
 */
export function useDeactivateAgent(agentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && agentId ? agentEndpoints.deactivate(agentId) : null,
    async (url: string) => {
      return post<Agent>(url, {})
    }
  )
}

/**
 * Revoke an agent (permanently revoke access)
 */
export function useRevokeAgent(agentId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && agentId ? agentEndpoints.revoke(agentId) : null,
    async (url: string) => {
      return post<Agent>(url, {})
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate agents cache
 */
export async function invalidateAgentsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/api/v1/agents'), undefined, {
    revalidate: true,
  })
}
