'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher } from './admin-client'
import type { AdminOrganization, AdminOrganizationList, CreateOrganizationInput } from '../types'

export interface OrganizationQuery {
  search?: string
  page?: number
  perPage?: number
}

function listPath({ search, page = 1, perPage = 25 }: OrganizationQuery): string {
  const q = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (search?.trim()) q.set('search', search.trim())
  return `/tenants?${q.toString()}`
}

/** Cross-tenant organization list (newest first). */
export function useOrganizations(query: OrganizationQuery) {
  return useSWR<AdminOrganizationList>(listPath(query), adminFetcher, { keepPreviousData: true })
}

export function useOrganization(id: string | null) {
  return useSWR<AdminOrganization>(id ? `/tenants/${id}` : null, adminFetcher)
}

export function createOrganization(input: CreateOrganizationInput) {
  return adminFetch<AdminOrganization>('/tenants', { method: 'POST', body: input })
}

export function setSSOEnforcement(id: string, enforced: boolean) {
  return adminFetch<{ enforced: boolean }>(`/tenants/${id}/sso/enforcement`, {
    method: 'PUT',
    body: { enforced },
  })
}
