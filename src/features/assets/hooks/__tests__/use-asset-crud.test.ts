import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast } from 'sonner'
import { useAssetCRUD } from '../use-asset-crud'
import type { CreateAssetInput, UpdateAssetInput } from '../../types'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock the asset API functions
const mockCreateAsset = vi.fn()
const mockUpdateAsset = vi.fn()
const mockDeleteAsset = vi.fn()
const mockBulkDeleteAssets = vi.fn()

vi.mock('../use-assets', () => ({
  createAsset: (...args: unknown[]) => mockCreateAsset(...args),
  updateAsset: (...args: unknown[]) => mockUpdateAsset(...args),
  deleteAsset: (...args: unknown[]) => mockDeleteAsset(...args),
  bulkDeleteAssets: (...args: unknown[]) => mockBulkDeleteAssets(...args),
}))

// Mock error handler
vi.mock('@/lib/api/error-handler', () => ({
  getErrorMessage: (_err: unknown, fallback: string) => fallback,
}))

describe('useAssetCRUD', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockMutate.mockResolvedValue(undefined)
    mockCreateAsset.mockResolvedValue({ id: 'new-1', name: 'Test' })
    mockUpdateAsset.mockResolvedValue({ id: '1', name: 'Updated' })
    mockDeleteAsset.mockResolvedValue(undefined)
    mockBulkDeleteAssets.mockResolvedValue(undefined)
  })

  // ============================================
  // handleCreate
  // ============================================
  describe('handleCreate', () => {
    it('calls createAsset with data and asset type, then mutate on success', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      const input: CreateAssetInput = { name: 'example.com', type: 'domain' }
      let returnValue: boolean | undefined

      await act(async () => {
        returnValue = await result.current.handleCreate(input)
      })

      expect(mockCreateAsset).toHaveBeenCalledWith({ ...input, type: 'domain' })
      expect(mockMutate).toHaveBeenCalled()
      expect(returnValue).toBe(true)
    })

    it('shows success toast on successful creation', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      await act(async () => {
        await result.current.handleCreate({ name: 'test.com', type: 'domain' })
      })

      expect(toast.success).toHaveBeenCalledWith('Domain created successfully')
    })

    it('shows error toast on failure and returns false', async () => {
      mockCreateAsset.mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      let returnValue: boolean | undefined

      await act(async () => {
        returnValue = await result.current.handleCreate({ name: 'test.com', type: 'domain' })
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to create domain')
      expect(returnValue).toBe(false)
      expect(mockMutate).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // handleUpdate
  // ============================================
  describe('handleUpdate', () => {
    it('calls updateAsset with correct id and data', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      const updateData: UpdateAssetInput = { name: 'updated.com' }

      await act(async () => {
        await result.current.handleUpdate('asset-1', updateData)
      })

      expect(mockUpdateAsset).toHaveBeenCalledWith('asset-1', updateData)
      expect(mockMutate).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Domain updated successfully')
    })

    it('shows error toast on update failure', async () => {
      mockUpdateAsset.mockRejectedValue(new Error('Not found'))
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      const returnValue = await act(async () => {
        return await result.current.handleUpdate('asset-1', { name: 'x' })
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to update domain')
      expect(returnValue).toBe(false)
    })
  })

  // ============================================
  // handleDelete
  // ============================================
  describe('handleDelete', () => {
    it('calls deleteAsset with correct id and mutates', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      await act(async () => {
        await result.current.handleDelete('asset-1')
      })

      expect(mockDeleteAsset).toHaveBeenCalledWith('asset-1')
      expect(mockMutate).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Domain deleted successfully')
    })

    it('shows error toast on delete failure', async () => {
      mockDeleteAsset.mockRejectedValue(new Error('Forbidden'))
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      const returnValue = await act(async () => {
        return await result.current.handleDelete('asset-1')
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to delete domain')
      expect(returnValue).toBe(false)
    })
  })

  // ============================================
  // handleBulkDelete
  // ============================================
  describe('handleBulkDelete', () => {
    it('calls bulkDeleteAssets and shows success toast', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      await act(async () => {
        await result.current.handleBulkDelete(['id-1', 'id-2', 'id-3'])
      })

      expect(mockBulkDeleteAssets).toHaveBeenCalledWith(['id-1', 'id-2', 'id-3'])
      expect(mockMutate).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Deleted 3 domains')
    })

    it('uses singular label for single item', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      await act(async () => {
        await result.current.handleBulkDelete(['id-1'])
      })

      expect(toast.success).toHaveBeenCalledWith('Deleted 1 domain')
    })

    it('enforces MAX_BULK_DELETE=100 limit', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      const tooManyIds = Array.from({ length: 101 }, (_, i) => `id-${i}`)

      const returnValue = await act(async () => {
        return await result.current.handleBulkDelete(tooManyIds)
      })

      expect(toast.error).toHaveBeenCalledWith('Cannot delete more than 100 items at once')
      expect(mockBulkDeleteAssets).not.toHaveBeenCalled()
      expect(returnValue).toBe(false)
    })

    it('returns false for empty array without calling API', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      const returnValue = await act(async () => {
        return await result.current.handleBulkDelete([])
      })

      expect(returnValue).toBe(false)
      expect(mockBulkDeleteAssets).not.toHaveBeenCalled()
    })

    it('shows error toast on bulk delete failure', async () => {
      mockBulkDeleteAssets.mockRejectedValue(new Error('Server error'))
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      const returnValue = await act(async () => {
        return await result.current.handleBulkDelete(['id-1'])
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to delete items')
      expect(returnValue).toBe(false)
    })
  })

  // ============================================
  // isSubmitting state
  // ============================================
  describe('isSubmitting state', () => {
    it('starts as false', () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))
      expect(result.current.isSubmitting).toBe(false)
    })

    it('is false after successful operation completes', async () => {
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      await act(async () => {
        await result.current.handleCreate({ name: 'test.com', type: 'domain' })
      })

      expect(result.current.isSubmitting).toBe(false)
    })

    it('is false after failed operation completes', async () => {
      mockCreateAsset.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useAssetCRUD('domain', 'Domain', mockMutate))

      await act(async () => {
        await result.current.handleCreate({ name: 'test.com', type: 'domain' })
      })

      expect(result.current.isSubmitting).toBe(false)
    })
  })
})
