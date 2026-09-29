/**
 * Customizable dashboards API hooks (RFC-021 Phase-1b).
 *
 * SWR reads + plain mutation helpers over the self-scoped `/me/dashboards`
 * endpoints. Tenant + user are derived from the token server-side.
 */

'use client'

import useSWR, { useSWRConfig, type SWRConfiguration } from 'swr'
import { get, post, put, del } from '@/lib/api/client'
import { useTenant } from '@/context/tenant-provider'
import type {
  Dashboard,
  DashboardListResponse,
  CreateDashboardInput,
  UpdateDashboardInput,
} from './dashboards.types'

export const DASHBOARDS_KEY = '/api/v1/me/dashboards'

const fetchList = (url: string) => get<DashboardListResponse>(url)
const fetchOne = (url: string) => get<Dashboard>(url)

/** List the current user's saved dashboards. */
export function useMyDashboards(config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant ? DASHBOARDS_KEY : null
  return useSWR<DashboardListResponse>(key, fetchList, config)
}

/** Fetch one saved dashboard by id. */
export function useMyDashboard(id: string | null, config?: SWRConfiguration) {
  const { currentTenant } = useTenant()
  const key = currentTenant && id ? `${DASHBOARDS_KEY}/${id}` : null
  return useSWR<Dashboard>(key, fetchOne, config)
}

/** Revalidate the dashboards list (call after any mutation). */
export function useRevalidateDashboards() {
  const { mutate } = useSWRConfig()
  return () => mutate(DASHBOARDS_KEY)
}

export function createDashboard(input: CreateDashboardInput) {
  return post<Dashboard>(DASHBOARDS_KEY, input)
}

export function updateDashboard(id: string, input: UpdateDashboardInput) {
  return put<Dashboard>(`${DASHBOARDS_KEY}/${id}`, input)
}

export function deleteDashboard(id: string) {
  return del(`${DASHBOARDS_KEY}/${id}`)
}

export function setDefaultDashboard(id: string) {
  return post(`${DASHBOARDS_KEY}/${id}/default`, {})
}
