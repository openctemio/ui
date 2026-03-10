'use client'

import { useState, useCallback } from 'react'
import type { Asset } from '../types'

/**
 * Shared dialog state management for asset pages.
 * Manages open/close state for create, edit, delete dialogs
 * and tracks the selected/targeted asset.
 */
export function useAssetDialogs() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)

  const openEdit = useCallback((asset: Asset) => {
    setSelectedAsset(asset)
    setEditDialogOpen(true)
  }, [])

  const openDelete = useCallback((asset: Asset) => {
    setAssetToDelete(asset)
    setDeleteDialogOpen(true)
  }, [])

  const closeAll = useCallback(() => {
    setAddDialogOpen(false)
    setEditDialogOpen(false)
    setDeleteDialogOpen(false)
    setSelectedAsset(null)
    setAssetToDelete(null)
  }, [])

  return {
    addDialogOpen,
    setAddDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedAsset,
    setSelectedAsset,
    assetToDelete,
    setAssetToDelete,
    openEdit,
    openDelete,
    closeAll,
  }
}
