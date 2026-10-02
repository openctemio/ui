'use client'

import { useAuthProviders } from '../api/use-auth-providers'
import { canCreateOrganization } from '../lib/organization-creation'

export interface CanCreateOrganization {
  /** The user may create an organization (server policy `self_service`). */
  canCreate: boolean
  /** The policy is still loading; `canCreate` is false until it arrives. */
  isLoading: boolean
}

/**
 * Whether this installation lets users create organizations. Every
 * "Create team" affordance goes through this, so `TENANT_CREATION_MODE=admin_only`
 * hides them all.
 *
 * While loading, nothing is offered. If the policy cannot be fetched, creation
 * is offered (the server default) and the server still refuses it under
 * `admin_only`.
 */
export function useCanCreateOrganization(): CanCreateOrganization {
  const { data, error, isLoading } = useAuthProviders()
  const loading = isLoading && !data && !error
  return {
    canCreate: !loading && canCreateOrganization(data?.tenant_creation_mode),
    isLoading: loading,
  }
}
