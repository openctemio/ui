/**
 * Workflow API Hooks
 *
 * SWR hooks for Automation Workflows
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { useTenant } from '@/context/tenant-provider'
import { workflowEndpoints, workflowRunEndpoints } from './endpoints'
import type {
  Workflow,
  WorkflowListResponse,
  WorkflowListFilters,
  WorkflowRun,
  WorkflowRunListResponse,
  WorkflowRunListFilters,
  WorkflowNode,
  WorkflowEdge,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  UpdateWorkflowGraphRequest,
  CreateNodeRequest,
  UpdateNodeRequest,
  CreateEdgeRequest,
  TriggerWorkflowRequest,
} from './workflow-types'

// ============================================
// SWR CONFIGURATION
// ============================================

const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error) => {
    if (error?.statusCode >= 400 && error?.statusCode < 500) {
      return false
    }
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

export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters?: WorkflowListFilters) => [...workflowKeys.lists(), filters] as const,
  details: () => [...workflowKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowKeys.details(), id] as const,
}

export const workflowRunKeys = {
  all: ['workflow-runs'] as const,
  lists: () => [...workflowRunKeys.all, 'list'] as const,
  list: (filters?: WorkflowRunListFilters) => [...workflowRunKeys.lists(), filters] as const,
  details: () => [...workflowRunKeys.all, 'detail'] as const,
  detail: (id: string) => [...workflowRunKeys.details(), id] as const,
}

// ============================================
// FETCHER FUNCTIONS
// ============================================

async function fetchWorkflows(url: string): Promise<WorkflowListResponse> {
  return get<WorkflowListResponse>(url)
}

async function fetchWorkflow(url: string): Promise<Workflow> {
  return get<Workflow>(url)
}

async function fetchWorkflowRuns(url: string): Promise<WorkflowRunListResponse> {
  return get<WorkflowRunListResponse>(url)
}

async function fetchWorkflowRun(url: string): Promise<WorkflowRun> {
  return get<WorkflowRun>(url)
}

// ============================================
// WORKFLOW HOOKS
// ============================================

/**
 * Fetch workflows list
 */
export function useWorkflows(filters?: WorkflowListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? workflowEndpoints.list(filters) : null

  return useSWR<WorkflowListResponse>(key, fetchWorkflows, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single workflow by ID
 */
export function useWorkflow(workflowId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && workflowId ? workflowEndpoints.get(workflowId) : null

  return useSWR<Workflow>(key, fetchWorkflow, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Create a new workflow
 */
export function useCreateWorkflow() {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant ? workflowEndpoints.create() : null,
    async (url: string, { arg }: { arg: CreateWorkflowRequest }) => {
      return post<Workflow>(url, arg)
    }
  )
}

/**
 * Update a workflow
 */
export function useUpdateWorkflow(workflowId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId ? workflowEndpoints.update(workflowId) : null,
    async (url: string, { arg }: { arg: UpdateWorkflowRequest }) => {
      return put<Workflow>(url, arg)
    }
  )
}

/**
 * Delete a workflow
 */
export function useDeleteWorkflow(workflowId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId ? workflowEndpoints.delete(workflowId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

/**
 * Update a workflow's graph (atomic replacement of all nodes and edges)
 */
export function useUpdateWorkflowGraph(workflowId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId ? workflowEndpoints.updateGraph(workflowId) : null,
    async (url: string, { arg }: { arg: UpdateWorkflowGraphRequest }) => {
      return put<Workflow>(url, arg)
    }
  )
}

// ============================================
// WORKFLOW NODE HOOKS
// ============================================

/**
 * Add node to workflow
 */
export function useAddNode(workflowId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId ? workflowEndpoints.addNode(workflowId) : null,
    async (url: string, { arg }: { arg: CreateNodeRequest }) => {
      return post<WorkflowNode>(url, arg)
    }
  )
}

/**
 * Update a node
 */
export function useUpdateNode(workflowId: string, nodeId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId && nodeId ? workflowEndpoints.updateNode(workflowId, nodeId) : null,
    async (url: string, { arg }: { arg: UpdateNodeRequest }) => {
      return put<WorkflowNode>(url, arg)
    }
  )
}

/**
 * Delete a node
 */
export function useDeleteNode(workflowId: string, nodeId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId && nodeId ? workflowEndpoints.deleteNode(workflowId, nodeId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

// ============================================
// WORKFLOW EDGE HOOKS
// ============================================

/**
 * Add edge to workflow
 */
export function useAddEdge(workflowId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId ? workflowEndpoints.addEdge(workflowId) : null,
    async (url: string, { arg }: { arg: CreateEdgeRequest }) => {
      return post<WorkflowEdge>(url, arg)
    }
  )
}

/**
 * Delete an edge
 */
export function useDeleteEdge(workflowId: string, edgeId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId && edgeId ? workflowEndpoints.deleteEdge(workflowId, edgeId) : null,
    async (url: string) => {
      return del<void>(url)
    }
  )
}

// ============================================
// WORKFLOW RUN HOOKS
// ============================================

/**
 * Fetch workflow runs list
 */
export function useWorkflowRuns(filters?: WorkflowRunListFilters, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant ? workflowRunEndpoints.list(filters) : null

  return useSWR<WorkflowRunListResponse>(key, fetchWorkflowRuns, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Fetch a single workflow run by ID
 */
export function useWorkflowRun(runId: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()

  const key = currentTenant && runId ? workflowRunEndpoints.get(runId) : null

  return useSWR<WorkflowRun>(key, fetchWorkflowRun, {
    ...defaultConfig,
    ...config,
  })
}

/**
 * Trigger a workflow run
 */
export function useTriggerWorkflow(workflowId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && workflowId ? workflowEndpoints.trigger(workflowId) : null,
    async (url: string, { arg }: { arg: TriggerWorkflowRequest }) => {
      return post<WorkflowRun>(url, arg)
    }
  )
}

/**
 * Cancel a running workflow
 */
export function useCancelWorkflowRun(runId: string) {
  const { currentTenant } = useTenant()

  return useSWRMutation(
    currentTenant && runId ? workflowRunEndpoints.cancel(runId) : null,
    async (url: string) => {
      return post<void>(url, {})
    }
  )
}

// ============================================
// CACHE UTILITIES
// ============================================

/**
 * Invalidate workflows cache
 */
export async function invalidateWorkflowsCache() {
  const { mutate } = await import('swr')
  await mutate((key) => typeof key === 'string' && key.includes('/api/v1/workflows'), undefined, {
    revalidate: true,
  })
}

/**
 * Invalidate workflow runs cache
 */
export async function invalidateWorkflowRunsCache() {
  const { mutate } = await import('swr')
  await mutate(
    (key) => typeof key === 'string' && key.includes('/api/v1/workflow-runs'),
    undefined,
    {
      revalidate: true,
    }
  )
}

/**
 * Invalidate all workflow-related caches
 */
export async function invalidateAllWorkflowCaches() {
  await Promise.all([invalidateWorkflowsCache(), invalidateWorkflowRunsCache()])
}
