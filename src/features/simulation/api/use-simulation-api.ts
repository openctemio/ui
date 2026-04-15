'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, put, del, patch } from '@/lib/api/client'

// ============================================
// Types
// ============================================

export interface Simulation {
  id: string
  name: string
  description: string
  simulation_type: string
  status: string
  mitre_tactic: string
  mitre_technique_id: string
  mitre_technique_name: string
  target_assets: string[]
  config: Record<string, unknown>
  schedule_cron: string
  last_run_at: string | null
  total_runs: number
  last_result: string
  detection_rate: number
  prevention_rate: number
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ControlTest {
  id: string
  name: string
  description: string
  framework: string
  control_id: string
  control_name: string
  category: string
  test_procedure: string
  expected_result: string
  status: string
  last_tested_at: string | null
  evidence: string
  notes: string
  risk_level: string
  linked_simulation_ids: string[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface FrameworkStats {
  framework: string
  total: number
  passed: number
  failed: number
  partial: number
  untested: number
  not_applicable: number
}

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================
// Simulation Hooks
// ============================================

export function useSimulations(filters?: { type?: string; status?: string; search?: string }) {
  const params = new URLSearchParams()
  if (filters?.type) params.set('type', filters.type)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  params.set('per_page', '50')
  const url = `/api/v1/simulations?${params.toString()}`
  return useSWR<PaginatedResponse<Simulation>>(url, get, { revalidateOnFocus: false })
}

export function useSimulation(id: string) {
  return useSWR<Simulation>(id ? `/api/v1/simulations/${id}` : null, get)
}

export function useCreateSimulation() {
  return useSWRMutation(
    '/api/v1/simulations',
    (url: string, { arg }: { arg: Partial<Simulation> }) => post(url, arg)
  )
}

export function useUpdateSimulation(id: string) {
  return useSWRMutation(
    `/api/v1/simulations/${id}`,
    (url: string, { arg }: { arg: Partial<Simulation> }) => put(url, arg)
  )
}

export function useDeleteSimulation(id: string) {
  return useSWRMutation(`/api/v1/simulations/${id}`, (url: string) => del(url))
}

export function useRunSimulation() {
  return useSWRMutation('/api/v1/simulations/run', (_url: string, { arg }: { arg: string }) =>
    post<{ id: string; status: string; result: string; detection: string }>(
      `/api/v1/simulations/${arg}/run`,
      {}
    )
  )
}

// ============================================
// Control Test Hooks
// ============================================

export function useControlTests(filters?: {
  framework?: string
  status?: string
  search?: string
}) {
  const params = new URLSearchParams()
  if (filters?.framework) params.set('framework', filters.framework)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.search) params.set('search', filters.search)
  params.set('per_page', '100')
  const url = `/api/v1/control-tests?${params.toString()}`
  return useSWR<PaginatedResponse<ControlTest>>(url, get, { revalidateOnFocus: false })
}

export function useControlTestStats() {
  return useSWR<FrameworkStats[]>('/api/v1/control-tests/stats', get, {
    revalidateOnFocus: false,
  })
}

export function useCreateControlTest() {
  return useSWRMutation(
    '/api/v1/control-tests',
    (url: string, { arg }: { arg: Partial<ControlTest> }) => post(url, arg)
  )
}

export function useRecordControlTestResult(id: string) {
  return useSWRMutation(
    `/api/v1/control-tests/${id}/result`,
    (url: string, { arg }: { arg: { status: string; evidence: string; notes: string } }) =>
      patch(url, arg)
  )
}

export function useDeleteControlTest(id: string) {
  return useSWRMutation(`/api/v1/control-tests/${id}`, (url: string) => del(url))
}
