'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher } from './admin-client'
import type {
  AdminCreatedOrganizationUser,
  AdminCreateOrganizationUserInput,
  AdminOrganization,
  AdminOrganizationList,
  AdminOrganizationUserList,
  CreatedOrganization,
  CreateOrganizationInput,
} from '../types'

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

/** Creates the organization (and the owner's account when it does not exist yet). */
export function createOrganization(input: CreateOrganizationInput) {
  return adminFetch<CreatedOrganization>('/tenants', { method: 'POST', body: input })
}

/** Members of one organization, for the console's Users section. */
export function useOrganizationUsers(id: string | null) {
  return useSWR<AdminOrganizationUserList>(id ? `/tenants/${id}/users` : null, adminFetcher)
}

/**
 * Create an account in an organization (ops_admin+). A plain call, not SWR: the
 * response may carry a one-time setup token that must not be cached.
 */
export function createOrganizationUser(id: string, input: AdminCreateOrganizationUserInput) {
  return adminFetch<AdminCreatedOrganizationUser>(`/tenants/${id}/users`, {
    method: 'POST',
    body: input,
  })
}

export function setSSOEnforcement(id: string, enforced: boolean) {
  return adminFetch<{ enforced: boolean }>(`/tenants/${id}/sso/enforcement`, {
    method: 'PUT',
    body: { enforced },
  })
}
