'use client'

/**
 * IOC (Indicator of Compromise) API hooks.
 *
 * Wraps the tenant-scoped IOC catalogue backend:
 *   GET    /api/v1/iocs        (list, paginated: limit/offset -> {items, limit, offset})
 *   POST   /api/v1/iocs        (create)
 *   GET    /api/v1/iocs/{id}   (get one)
 *   DELETE /api/v1/iocs/{id}   (soft-deactivate)
 *
 * The backend exposes NO update endpoint (delete soft-deactivates), and the
 * list endpoint has NO server-side type/status filter and returns no total —
 * so type/status filtering is applied client-side over the fetched page.
 * Permissions: threat_intel:read (list/get) / threat_intel:write (create/delete).
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, del } from '@/lib/api/client'

const BASE = '/api/v1/iocs'

// ── IOC type (matches backend ioc.Type) ─────────────────────────────────────
export type IOCType = 'ip' | 'domain' | 'url' | 'file_hash' | 'process_name' | 'user_agent'

export const IOC_TYPES: IOCType[] = [
  'ip',
  'domain',
  'url',
  'file_hash',
  'process_name',
  'user_agent',
]

export const IOC_TYPE_LABELS: Record<IOCType, string> = {
  ip: 'IP',
  domain: 'Domain',
  url: 'URL',
  file_hash: 'File Hash',
  process_name: 'Process',
  user_agent: 'User Agent',
}

// ── IOC source (matches backend ioc.Source) ─────────────────────────────────
export type IOCSource = 'scan_finding' | 'threat_feed' | 'manual'

export const IOC_SOURCES: IOCSource[] = ['scan_finding', 'threat_feed', 'manual']

export const IOC_SOURCE_LABELS: Record<IOCSource, string> = {
  scan_finding: 'Scan Finding',
  threat_feed: 'Threat Feed',
  manual: 'Manual',
}

export interface IOC {
  id: string
  tenant_id: string
  type: IOCType
  value: string
  normalized: string
  source?: IOCSource
  source_finding_id?: string
  active: boolean
  confidence: number
  first_seen_at: string
  last_seen_at: string
}

/** Backend create payload. */
export interface CreateIOCInput {
  type: IOCType
  value: string
  source?: IOCSource
  source_finding_id?: string
  confidence?: number
}

/** Wire shape of GET /api/v1/iocs. */
export interface IOCListResponse {
  items: IOC[]
  limit: number
  offset: number
}

export interface IOCFilters {
  limit?: number
  offset?: number
}

function buildListUrl(filters?: IOCFilters): string {
  const params = new URLSearchParams()
  params.set('limit', String(filters?.limit ?? 200))
  if (filters?.offset) params.set('offset', String(filters.offset))
  return `${BASE}?${params.toString()}`
}

/** List IOCs for the current tenant. */
export function useIOCs(filters?: IOCFilters) {
  return useSWR<IOCListResponse>(buildListUrl(filters), get, {
    revalidateOnFocus: false,
  })
}

/** Fetch a single IOC by id (skips when id is null). */
export function useIOC(id: string | null) {
  return useSWR<IOC>(id ? `${BASE}/${id}` : null, get, {
    revalidateOnFocus: false,
  })
}

/** Create an IOC. */
export function useCreateIOC() {
  return useSWRMutation(BASE, (url: string, { arg }: { arg: CreateIOCInput }) =>
    post<IOC>(url, arg)
  )
}

/** Delete (soft-deactivate) an IOC by id. */
export function useDeleteIOC(id: string) {
  return useSWRMutation(`${BASE}/${id}`, (url: string) => del(url))
}
