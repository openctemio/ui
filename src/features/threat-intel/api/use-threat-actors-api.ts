'use client'

/**
 * Threat Actor API hooks.
 *
 * Wraps the tenant-scoped threat-actor catalogue backend:
 *   GET    /api/v1/threat-actors        (list, paginated: page/per_page/type/search)
 *   POST   /api/v1/threat-actors        (create)
 *   GET    /api/v1/threat-actors/{id}   (get one)
 *   DELETE /api/v1/threat-actors/{id}   (delete)
 *
 * The backend exposes NO update endpoint, so there is no useUpdate hook.
 * Permissions: threat_intel:read (list/get) / threat_intel:write (create/delete).
 */

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { get, post, del } from '@/lib/api/client'

const BASE = '/api/v1/threat-actors'

// ── Actor type (matches backend threatactor.ActorType) ──────────────────────
export type ActorType = 'apt' | 'cybercrime' | 'hacktivist' | 'insider' | 'nation_state' | 'unknown'

export const ACTOR_TYPES: ActorType[] = [
  'apt',
  'cybercrime',
  'hacktivist',
  'insider',
  'nation_state',
  'unknown',
]

export const ACTOR_TYPE_LABELS: Record<ActorType, string> = {
  apt: 'APT',
  cybercrime: 'Cybercrime',
  hacktivist: 'Hacktivist',
  insider: 'Insider',
  nation_state: 'Nation State',
  unknown: 'Unknown',
}

export interface TTP {
  tactic: string
  technique_id: string
  technique_name: string
}

export interface ExternalReference {
  source: string
  url: string
  description: string
}

export interface ThreatActor {
  id: string
  name: string
  aliases: string[]
  description: string
  actor_type: ActorType
  sophistication?: string
  motivation?: string
  country_of_origin?: string
  is_active: boolean
  mitre_group_id?: string
  ttps: TTP[]
  target_industries: string[]
  target_regions: string[]
  external_references: ExternalReference[]
  tags: string[]
  created_at: string
  updated_at: string
}

/** Backend create payload — the write endpoint accepts this subset. */
export interface CreateThreatActorInput {
  name: string
  actor_type?: ActorType
  aliases?: string[]
  description?: string
  sophistication?: string
  motivation?: string
  country_of_origin?: string
  mitre_group_id?: string
  ttps?: TTP[]
  target_industries?: string[]
  target_regions?: string[]
  tags?: string[]
}

/** pagination.NewResult shape from the API. */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ThreatActorFilters {
  page?: number
  per_page?: number
  /** Backend actor_type filter (query param `type`). */
  type?: ActorType
  search?: string
}

function buildListUrl(filters?: ThreatActorFilters): string {
  const params = new URLSearchParams()
  params.set('per_page', String(filters?.per_page ?? 100))
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.type) params.set('type', filters.type)
  if (filters?.search) params.set('search', filters.search)
  return `${BASE}?${params.toString()}`
}

/** List threat actors for the current tenant. */
export function useThreatActors(filters?: ThreatActorFilters) {
  return useSWR<PaginatedResult<ThreatActor>>(buildListUrl(filters), get, {
    revalidateOnFocus: false,
  })
}

/** Fetch a single threat actor by id (skips when id is null). */
export function useThreatActor(id: string | null) {
  return useSWR<ThreatActor>(id ? `${BASE}/${id}` : null, get, {
    revalidateOnFocus: false,
  })
}

/** Create a threat actor. */
export function useCreateThreatActor() {
  return useSWRMutation(BASE, (url: string, { arg }: { arg: CreateThreatActorInput }) =>
    post<ThreatActor>(url, arg)
  )
}

/** Delete a threat actor by id. */
export function useDeleteThreatActor(id: string) {
  return useSWRMutation(`${BASE}/${id}`, (url: string) => del(url))
}
