'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { get, post, patch, del, getApiBaseUrl } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type {
  ReportSchedule,
  ReportSchedulesResponse,
  CreateReportScheduleInput,
  ExecutiveSummary,
} from '../types'

/**
 * List report schedules for the current tenant. The backend scopes by tenant
 * from the JWT, so no tenant param is needed here.
 */
export function useReportSchedules() {
  const key = endpoints.reports.schedules()
  const { data, error, isLoading, mutate } = useSWR<ReportSchedulesResponse>(key, (url: string) =>
    get<ReportSchedulesResponse>(url)
  )

  const createSchedule = useCallback(
    async (input: CreateReportScheduleInput): Promise<ReportSchedule> => {
      const created = await post<ReportSchedule>(key, input)
      await mutate()
      return created
    },
    [key, mutate]
  )

  const toggleSchedule = useCallback(
    async (id: string, active: boolean): Promise<void> => {
      await patch(endpoints.reports.toggle(id), { active })
      await mutate()
    },
    [mutate]
  )

  const deleteSchedule = useCallback(
    async (id: string): Promise<void> => {
      await del(endpoints.reports.schedule(id))
      await mutate()
    },
    [mutate]
  )

  return {
    schedules: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
    createSchedule,
    toggleSchedule,
    deleteSchedule,
  }
}

/**
 * Executive summary metrics for a trailing window. Cheap headline numbers to
 * accompany the CSV export — nothing is fabricated, it is the same JSON the
 * export flattens.
 */
export function useExecutiveSummary(days: number) {
  const key = endpoints.dashboard.executiveSummary(days)
  const { data, error, isLoading } = useSWR<ExecutiveSummary>(key, (url: string) =>
    get<ExecutiveSummary>(url)
  )
  return { summary: data, error, isLoading }
}

/**
 * Download the server-rendered executive-summary CSV. GET is not a mutation, so
 * no CSRF header is needed; `credentials: 'include'` carries the auth cookies
 * (same pattern the pentest report download uses). Returns nothing but throws
 * on a non-2xx so callers can toast.
 */
export async function downloadExecutiveSummaryCsv(days: number): Promise<void> {
  const url = `${getApiBaseUrl()}${endpoints.dashboard.executiveSummaryExport(days, 'csv')}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(`Export failed (${res.status})`)
  }
  const blob = await res.blob()
  let objectUrl: string | null = null
  try {
    objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `executive-summary-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
