import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAssetDialogs } from '../use-asset-dialogs'
import type { Asset } from '../../types'

describe('useAssetDialogs', () => {
  // Helper to create a mock asset
  const createMockAsset = (overrides: Partial<Asset> = {}): Asset => ({
    id: 'asset-1',
    type: 'domain',
    name: 'example.com',
    criticality: 'high',
    status: 'active',
    scope: 'external',
    exposure: 'public',
    riskScore: 75,
    findingCount: 3,
    metadata: {},
    firstSeen: '2026-01-01T00:00:00Z',
    lastSeen: '2026-03-09T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-09T00:00:00Z',
    ...overrides,
  })

  // ============================================
  // Initial state
  // ============================================
  describe('initial state', () => {
    it('all dialogs are closed initially', () => {
      const { result } = renderHook(() => useAssetDialogs())

      expect(result.current.addDialogOpen).toBe(false)
      expect(result.current.editDialogOpen).toBe(false)
      expect(result.current.deleteDialogOpen).toBe(false)
      expect(result.current.selectedAsset).toBeNull()
      expect(result.current.assetToDelete).toBeNull()
    })
  })

  // ============================================
  // openEdit
  // ============================================
  describe('openEdit', () => {
    it('sets selectedAsset and opens edit dialog', () => {
      const { result } = renderHook(() => useAssetDialogs())
      const asset = createMockAsset()

      act(() => {
        result.current.openEdit(asset)
      })

      expect(result.current.selectedAsset).toEqual(asset)
      expect(result.current.editDialogOpen).toBe(true)
    })

    it('does not affect other dialogs', () => {
      const { result } = renderHook(() => useAssetDialogs())
      const asset = createMockAsset()

      act(() => {
        result.current.openEdit(asset)
      })

      expect(result.current.addDialogOpen).toBe(false)
      expect(result.current.deleteDialogOpen).toBe(false)
      expect(result.current.assetToDelete).toBeNull()
    })
  })

  // ============================================
  // openDelete
  // ============================================
  describe('openDelete', () => {
    it('sets assetToDelete and opens delete dialog', () => {
      const { result } = renderHook(() => useAssetDialogs())
      const asset = createMockAsset({ id: 'delete-me' })

      act(() => {
        result.current.openDelete(asset)
      })

      expect(result.current.assetToDelete).toEqual(asset)
      expect(result.current.deleteDialogOpen).toBe(true)
    })

    it('does not affect other dialogs', () => {
      const { result } = renderHook(() => useAssetDialogs())
      const asset = createMockAsset()

      act(() => {
        result.current.openDelete(asset)
      })

      expect(result.current.addDialogOpen).toBe(false)
      expect(result.current.editDialogOpen).toBe(false)
      expect(result.current.selectedAsset).toBeNull()
    })
  })

  // ============================================
  // Closing edit dialog preserves selectedAsset
  // ============================================
  describe('closing edit dialog', () => {
    it('closing edit dialog via setter preserves selectedAsset', () => {
      const { result } = renderHook(() => useAssetDialogs())
      const asset = createMockAsset()

      act(() => {
        result.current.openEdit(asset)
      })

      // Close only the dialog, not clear the asset
      act(() => {
        result.current.setEditDialogOpen(false)
      })

      expect(result.current.editDialogOpen).toBe(false)
      expect(result.current.selectedAsset).toEqual(asset)
    })
  })

  // ============================================
  // State independence between dialogs
  // ============================================
  describe('state independence', () => {
    it('opening edit and delete dialogs independently', () => {
      const { result } = renderHook(() => useAssetDialogs())
      const editAsset = createMockAsset({ id: 'edit-1', name: 'edit-me.com' })
      const deleteAsset = createMockAsset({ id: 'delete-1', name: 'delete-me.com' })

      act(() => {
        result.current.openEdit(editAsset)
      })

      act(() => {
        result.current.openDelete(deleteAsset)
      })

      expect(result.current.selectedAsset).toEqual(editAsset)
      expect(result.current.assetToDelete).toEqual(deleteAsset)
      expect(result.current.editDialogOpen).toBe(true)
      expect(result.current.deleteDialogOpen).toBe(true)
    })

    it('add dialog state is independent of edit and delete', () => {
      const { result } = renderHook(() => useAssetDialogs())

      act(() => {
        result.current.setAddDialogOpen(true)
      })

      expect(result.current.addDialogOpen).toBe(true)
      expect(result.current.editDialogOpen).toBe(false)
      expect(result.current.deleteDialogOpen).toBe(false)
    })
  })

  // ============================================
  // closeAll
  // ============================================
  describe('closeAll', () => {
    it('closes all dialogs and clears all assets', () => {
      const { result } = renderHook(() => useAssetDialogs())
      const asset = createMockAsset()

      // Open everything
      act(() => {
        result.current.setAddDialogOpen(true)
        result.current.openEdit(asset)
        result.current.openDelete(asset)
      })

      // Close all
      act(() => {
        result.current.closeAll()
      })

      expect(result.current.addDialogOpen).toBe(false)
      expect(result.current.editDialogOpen).toBe(false)
      expect(result.current.deleteDialogOpen).toBe(false)
      expect(result.current.selectedAsset).toBeNull()
      expect(result.current.assetToDelete).toBeNull()
    })
  })
})
