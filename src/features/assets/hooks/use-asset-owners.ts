'use client'

import useSWR from 'swr'
import { get, post, put, del } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { usePermissions, Permission } from '@/lib/permissions'
import type { AssetOwner, OwnershipType, AddAssetOwnerInput, UpdateAssetOwnerInput } from '../types'

/**
 * Backend response format for asset owners list
 */
interface BackendOwnerResponse {
  id: string
  user_id?: string
  user_name?: string
  user_email?: string
  group_id?: string
  group_name?: string
  ownership_type: string
  assigned_at: string
  assigned_by_name?: string
}

interface BackendOwnersListResponse {
  data: BackendOwnerResponse[]
  total: number
}

function transformOwner(backend: BackendOwnerResponse): AssetOwner {
  return {
    id: backend.id,
    userId: backend.user_id,
    userName: backend.user_name,
    userEmail: backend.user_email,
    groupId: backend.group_id,
    groupName: backend.group_name,
    ownershipType: backend.ownership_type as OwnershipType,
    assignedAt: backend.assigned_at,
    assignedByName: backend.assigned_by_name,
  }
}

/**
 * Hook to fetch asset owners
 */
export function useAssetOwners(assetId: string | null) {
  const { can } = usePermissions()
  const canRead = can(Permission.AssetsRead)
  const shouldFetch = assetId && canRead

  const { data, error, isLoading, mutate } = useSWR<BackendOwnersListResponse>(
    shouldFetch ? endpoints.assets.listOwners(assetId) : null,
    (url: string) => get<BackendOwnersListResponse>(url)
  )

  return {
    owners: data?.data?.map(transformOwner) ?? [],
    total: data?.total ?? 0,
    isLoading: shouldFetch ? isLoading : false,
    error,
    mutate,
  }
}

/**
 * Add an owner to an asset
 */
export async function addAssetOwner(
  assetId: string,
  input: AddAssetOwnerInput
): Promise<{ id: string; ownership_type: string }> {
  return post(endpoints.assets.addOwner(assetId), {
    user_id: input.userId,
    group_id: input.groupId,
    ownership_type: input.ownershipType,
  })
}

/**
 * Update an owner's type
 */
export async function updateAssetOwner(
  assetId: string,
  ownerId: string,
  input: UpdateAssetOwnerInput
): Promise<void> {
  await put(endpoints.assets.updateOwner(assetId, ownerId), {
    ownership_type: input.ownershipType,
  })
}

/**
 * Remove an owner from an asset
 */
export async function removeAssetOwner(assetId: string, ownerId: string): Promise<void> {
  await del(endpoints.assets.removeOwner(assetId, ownerId))
}
