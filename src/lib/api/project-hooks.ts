/**
 * Project API Hooks
 *
 * Custom React hooks for project data fetching using SWR
 */

'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del } from './client'
import { handleApiError } from './error-handler'
import { projectEndpoints } from './project-endpoints'
import type {
  Project,
  ProjectListResponse,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
} from './project-types'

// ============================================
// SWR CONFIGURATION
// ============================================

/**
 * Default SWR configuration for projects
 */
export const defaultProjectSwrConfig: SWRConfiguration = {
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
// PROJECT HOOKS
// ============================================

/**
 * Fetch projects list with pagination and filters
 *
 * @example
 * ```typescript
 * const { data, error, isLoading, mutate } = useProjects('tenant-123', {
 *   page: 1,
 *   per_page: 20,
 *   providers: ['github'],
 * })
 * ```
 */
export function useProjects(filters?: ProjectFilters, config?: SWRConfiguration) {
  return useSWR<ProjectListResponse>(projectEndpoints.list(filters), get, {
    ...defaultProjectSwrConfig,
    ...config,
  })
}

/**
 * Fetch single project by ID
 *
 * @example
 * ```typescript
 * const { data: project } = useProject('project-456')
 * ```
 */
export function useProject(projectId: string | null, config?: SWRConfiguration) {
  return useSWR<Project>(projectId ? projectEndpoints.get(projectId) : null, get, {
    ...defaultProjectSwrConfig,
    ...config,
  })
}

/**
 * Create project mutation
 *
 * @example
 * ```typescript
 * const { trigger, isMutating } = useCreateProject()
 *
 * const handleSubmit = async (data) => {
 *   try {
 *     const newProject = await trigger(data)
 *     toast.success('Project created!')
 *   } catch (error) {
 *     // Error handled by SWR
 *   }
 * }
 * ```
 */
export function useCreateProject() {
  return useSWRMutation(projectEndpoints.create(), (url, { arg }: { arg: CreateProjectRequest }) =>
    post<Project>(url, arg)
  )
}

/**
 * Update project mutation
 */
export function useUpdateProject(projectId: string) {
  return useSWRMutation(
    projectEndpoints.update(projectId),
    (url, { arg }: { arg: UpdateProjectRequest }) => put<Project>(url, arg)
  )
}

/**
 * Delete project mutation
 */
export function useDeleteProject(projectId: string) {
  return useSWRMutation(projectEndpoints.delete(projectId), (url) => del(url))
}

// ============================================
// UTILITIES
// ============================================

/**
 * Build cache key for projects list
 * Useful for manual cache invalidation
 */
export function getProjectsListKey(filters?: ProjectFilters) {
  return projectEndpoints.list(filters)
}

/**
 * Build cache key for single project
 */
export function getProjectKey(projectId: string) {
  return projectEndpoints.get(projectId)
}

/**
 * Mutate (revalidate) projects cache after mutation
 */
export async function invalidateProjectsCache() {
  const { mutate } = await import('swr')
  // Mutate all keys matching the project list pattern
  await mutate(
    (key: string) => typeof key === 'string' && key.includes('/api/v1/projects'),
    undefined,
    { revalidate: true }
  )
}
