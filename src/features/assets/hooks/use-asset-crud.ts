'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { createAsset, updateAsset, deleteAsset, bulkDeleteAssets } from './use-assets'
import { getErrorMessage } from '@/lib/api/error-handler'
import type { AssetType, CreateAssetInput, UpdateAssetInput } from '../types'

const MAX_BULK_DELETE = 100

/**
 * Shared CRUD operations for asset pages.
 * Provides create, update, delete, and bulk delete handlers with
 * consistent error handling and toast notifications.
 */
export function useAssetCRUD(
  assetType: AssetType,
  label: string,
  mutate: () => Promise<unknown> | void
) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = useCallback(
    async (data: CreateAssetInput) => {
      setIsSubmitting(true)
      try {
        await createAsset({ ...data, type: assetType })
        await mutate()
        toast.success(`${label} created successfully`)
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, `Failed to create ${label.toLowerCase()}`))
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [assetType, label, mutate]
  )

  const handleUpdate = useCallback(
    async (id: string, data: UpdateAssetInput) => {
      setIsSubmitting(true)
      try {
        await updateAsset(id, data)
        await mutate()
        toast.success(`${label} updated successfully`)
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, `Failed to update ${label.toLowerCase()}`))
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [label, mutate]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      setIsSubmitting(true)
      try {
        await deleteAsset(id)
        await mutate()
        toast.success(`${label} deleted successfully`)
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, `Failed to delete ${label.toLowerCase()}`))
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [label, mutate]
  )

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return false
      if (ids.length > MAX_BULK_DELETE) {
        toast.error(`Cannot delete more than ${MAX_BULK_DELETE} items at once`)
        return false
      }
      setIsSubmitting(true)
      try {
        await bulkDeleteAssets(ids)
        await mutate()
        toast.success(
          `Deleted ${ids.length} ${ids.length === 1 ? label.toLowerCase() : label.toLowerCase() + 's'}`
        )
        return true
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete items'))
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [label, mutate]
  )

  return { handleCreate, handleUpdate, handleDelete, handleBulkDelete, isSubmitting }
}
