'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  RowSelectionState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  Plus,
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { AssetsStatsCards } from './assets-stats-cards'
import { AssetFormDialog } from './asset-form-dialog'
import { AssetDeleteDialog } from './asset-delete-dialog'
import { createAssetColumns, type AssetColumnConfig } from './assets-table-columns'
import { AssetDetailSheet } from '../asset-detail-sheet'
import type { Asset, AssetType, CreateAssetInput, UpdateAssetInput } from '../../types'

export interface AssetsDataTableProps {
  // Data
  assets: Asset[]
  isLoading?: boolean
  isError?: boolean
  error?: Error | null

  // Asset type configuration
  assetType: AssetType
  assetTypeName: string
  assetTypeIcon?: LucideIcon

  // Column configuration
  columnConfig?: AssetColumnConfig
  customColumns?: ColumnDef<Asset>[]

  // Callbacks
  onRefresh?: () => void
  onCreate?: (input: CreateAssetInput) => Promise<void>
  onUpdate?: (assetId: string, input: UpdateAssetInput) => Promise<void>
  onDelete?: (assetId: string) => Promise<void>
  onBulkDelete?: (assetIds: string[]) => Promise<void>

  // Optional features
  showStats?: boolean
  showSearch?: boolean
  showAddButton?: boolean
  showExportButton?: boolean
  showBulkActions?: boolean

  // Pagination (server-side)
  totalItems?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export function AssetsDataTable({
  assets,
  isLoading = false,
  isError = false,
  error,
  assetType,
  assetTypeName,
  assetTypeIcon = Package,
  columnConfig,
  customColumns,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  onBulkDelete,
  showStats = true,
  showSearch = true,
  showAddButton = true,
  showExportButton = true,
  showBulkActions = true,
  totalItems: _totalItems,
  currentPage: _currentPage = 1,
  pageSize: _pageSize = 20,
  onPageChange: _onPageChange,
  onPageSizeChange: _onPageSizeChange,
}: AssetsDataTableProps) {
  // Note: Server-side pagination props are available but not yet implemented
  void _totalItems
  void _currentPage
  void _pageSize
  void _onPageChange
  void _onPageSizeChange
  // Table state
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Dialog states
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

  // Loading states
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter data by status
  const filteredAssets = useMemo(() => {
    let data = [...assets]
    if (statusFilter === 'with_findings') {
      data = data.filter((a) => a.findingCount > 0)
    } else if (statusFilter) {
      data = data.filter((a) => a.status === statusFilter)
    }
    return data
  }, [assets, statusFilter])

  // Create columns
  const columns = useMemo(
    () =>
      createAssetColumns(
        assetTypeIcon,
        assetTypeName,
        {
          onView: (asset) => setSelectedAsset(asset),
          onEdit: (asset) => {
            setAssetToEdit(asset)
            setShowEditDialog(true)
          },
          onDelete: (asset) => {
            setAssetToDelete(asset)
            setShowDeleteDialog(true)
          },
          onCopy: (asset) => {
            navigator.clipboard.writeText(asset.name)
            toast.success('Copied to clipboard')
          },
        },
        {
          ...columnConfig,
          customColumns,
        }
      ),
    [assetTypeIcon, assetTypeName, columnConfig, customColumns]
  )

  // Table instance
  const table = useReactTable({
    data: filteredAssets,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  // Selected rows
  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const selectedFindingsCount = selectedRows.reduce(
    (sum, row) => sum + (row.original.findingCount || 0),
    0
  )

  // Handlers
  const handleCreate = useCallback(
    async (input: CreateAssetInput | UpdateAssetInput) => {
      if (!onCreate) return
      // Ensure it's a CreateAssetInput (has type field)
      const createInput = input as CreateAssetInput
      if (!createInput.type) {
        createInput.type = assetType
      }
      setIsCreating(true)
      try {
        await onCreate(createInput)
        toast.success(`${assetTypeName} created successfully`)
        setShowAddDialog(false)
        onRefresh?.()
      } catch (err) {
        toast.error(getErrorMessage(err, `Failed to create ${assetTypeName.toLowerCase()}`))
      } finally {
        setIsCreating(false)
      }
    },
    [onCreate, assetType, assetTypeName, onRefresh]
  )

  const handleUpdate = useCallback(
    async (input: CreateAssetInput | UpdateAssetInput) => {
      if (!onUpdate || !assetToEdit) return
      setIsUpdating(true)
      try {
        await onUpdate(assetToEdit.id, input as UpdateAssetInput)
        toast.success(`${assetTypeName} updated successfully`)
        setShowEditDialog(false)
        setAssetToEdit(null)
        onRefresh?.()
      } catch (err) {
        toast.error(getErrorMessage(err, `Failed to update ${assetTypeName.toLowerCase()}`))
      } finally {
        setIsUpdating(false)
      }
    },
    [onUpdate, assetToEdit, assetTypeName, onRefresh]
  )

  const handleDelete = useCallback(async () => {
    if (!onDelete || !assetToDelete) return
    setIsDeleting(true)
    try {
      await onDelete(assetToDelete.id)
      toast.success(`${assetTypeName} deleted successfully`)
      setShowDeleteDialog(false)
      setAssetToDelete(null)
      onRefresh?.()
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to delete ${assetTypeName.toLowerCase()}`))
    } finally {
      setIsDeleting(false)
    }
  }, [onDelete, assetToDelete, assetTypeName, onRefresh])

  const handleBulkDelete = useCallback(async () => {
    if (!onBulkDelete || selectedCount === 0) return
    setIsDeleting(true)
    try {
      const ids = selectedRows.map((row) => row.original.id)
      await onBulkDelete(ids)
      toast.success(`Deleted ${selectedCount} ${assetTypeName.toLowerCase()}s`)
      setShowBulkDeleteDialog(false)
      setRowSelection({})
      onRefresh?.()
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to delete ${assetTypeName.toLowerCase()}s`))
    } finally {
      setIsDeleting(false)
    }
  }, [onBulkDelete, selectedRows, selectedCount, assetTypeName, onRefresh])

  const handleExport = useCallback(() => {
    const data = filteredAssets.map((asset) => ({
      name: asset.name,
      type: asset.type,
      status: asset.status,
      criticality: asset.criticality,
      scope: asset.scope,
      exposure: asset.exposure,
      riskScore: asset.riskScore,
      findingCount: asset.findingCount,
      tags: asset.tags?.join(', '),
      createdAt: asset.createdAt,
    }))
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map((row) => Object.values(row).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${assetType}-assets.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported to CSV')
  }, [filteredAssets, assetType])

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-muted-foreground">Failed to load {assetTypeName.toLowerCase()}s</p>
        {error && <p className="text-sm text-red-400">{error.message}</p>}
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {showStats && (
        <AssetsStatsCards
          assets={assets}
          isLoading={isLoading}
          assetTypeName={assetTypeName}
          assetTypeIcon={assetTypeIcon}
          onFilterByStatus={setStatusFilter}
          currentStatusFilter={statusFilter}
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          {showSearch && (
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${assetTypeName.toLowerCase()}s...`}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk actions */}
          {showBulkActions && selectedCount > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedCount})
            </Button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}

          {/* Export */}
          {showExportButton && filteredAssets.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}

          {/* Add button */}
          {showAddButton && onCreate && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add {assetTypeName}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {React.createElement(assetTypeIcon, {
                      className: 'h-8 w-8 text-muted-foreground/50',
                    })}
                    <p className="text-muted-foreground">No {assetTypeName.toLowerCase()}s found</p>
                    {showAddButton && onCreate && (
                      <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add your first {assetTypeName.toLowerCase()}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer"
                  onClick={() => setSelectedAsset(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => e.stopPropagation()}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {selectedCount > 0
            ? `${selectedCount} of ${filteredAssets.length} row(s) selected`
            : `${filteredAssets.length} ${assetTypeName.toLowerCase()}(s)`}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} rows
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
        onEdit={() => {
          if (selectedAsset) {
            setAssetToEdit(selectedAsset)
            setShowEditDialog(true)
            setSelectedAsset(null)
          }
        }}
        onDelete={() => {
          if (selectedAsset) {
            setAssetToDelete(selectedAsset)
            setShowDeleteDialog(true)
            setSelectedAsset(null)
          }
        }}
        icon={assetTypeIcon}
        iconColor="text-primary"
        gradientFrom="from-primary/20"
        assetTypeName={assetTypeName}
      />

      {/* Add Dialog */}
      <AssetFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        mode="create"
        assetType={assetType}
        assetTypeName={assetTypeName}
        assetTypeIcon={assetTypeIcon}
        onSubmit={handleCreate}
        isSubmitting={isCreating}
      />

      {/* Edit Dialog */}
      <AssetFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        mode="edit"
        asset={assetToEdit}
        assetType={assetType}
        assetTypeName={assetTypeName}
        assetTypeIcon={assetTypeIcon}
        onSubmit={handleUpdate}
        isSubmitting={isUpdating}
      />

      {/* Delete Dialog */}
      <AssetDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        asset={assetToDelete}
        assetTypeName={assetTypeName}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Dialog */}
      <AssetDeleteDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        asset={null}
        assetTypeName={assetTypeName}
        bulkCount={selectedCount}
        bulkFindingsCount={selectedFindingsCount}
        onConfirm={handleBulkDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
