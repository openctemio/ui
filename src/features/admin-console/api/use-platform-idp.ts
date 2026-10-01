'use client'

import useSWR from 'swr'
import { adminFetch, adminFetcher } from './admin-client'
import type { PlatformIdP, PlatformIdPInput } from '../types'

const KEY = '/platform-idp'

/** The administrators' identity provider (super admins only). */
export function usePlatformIdP(enabled = true) {
  return useSWR<PlatformIdP>(enabled ? KEY : null, adminFetcher)
}

/**
 * Creates or updates the configuration. The API reads the issuer's discovery
 * document before saving, so an unreachable issuer is reported here.
 */
export function savePlatformIdP(input: PlatformIdPInput) {
  return adminFetch<PlatformIdP>(KEY, { method: 'PUT', body: input })
}

export function deletePlatformIdP() {
  return adminFetch<void>(KEY, { method: 'DELETE' })
}
