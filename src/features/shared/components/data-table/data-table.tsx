'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
  X,
  Inbox,
} from 'lucide-react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  showColumnToggle?: boolean
  showPagination?: boolean
  showSearch?: boolean
  pageSize?: number
  pageSizeOptions?: number[]
  emptyMessage?: string
  emptyDescription?: string
  onRowClick?: (row: TData) => void
  /**
   * Notified whenever the row selection changes, with the selected row data.
   * The table owns selection state internally (via the `select` column's
   * checkboxes); this is the only way for a parent to observe it (e.g. to drive
   * a bulk-action bar). Optional — existing callers are unaffected.
   */
  onSelectionChange?: (selectedRows: TData[]) => void
  /**
   * Server-side (manual) pagination. When set, the table does NOT slice `data`
   * itself — the parent fetches one page at a time and drives navigation:
   *   - `data` holds only the current page's rows
   *   - `pageCount`/`rowCount` come from the server response (total pages/rows)
   *   - `pagination` is the controlled `{pageIndex, pageSize}` state
   *   - `onPaginationChange` fires when the user pages or changes page size
   * Omit it entirely and the table keeps its default client-side pagination
   * over the full `data` array — existing callers are unaffected.
   */
  manualPagination?: boolean
  pageCount?: number
  rowCount?: number
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  /**
   * Stable row identity. Required for correct selection under manual pagination
   * (index-keyed selection would mis-mark rows when the page's data swaps).
   */
  getRowId?: (row: TData) => string
  /**
   * Server-side sorting (with `manualPagination`): the controlled sort state and
   * its change handler — the parent maps it to its API's sort parameter. Under
   * manual pagination without these, columns are not sortable at all: sorting
   * only the rows on screen would be misleading, and a header that toggles an
   * arrow without reordering anything is a dead control.
   */
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  /** Rendered at the start of the toolbar (e.g. a filter toggle + search). */
  toolbarStart?: React.ReactNode
  /** Rendered at the end of the toolbar, before the column toggle. */
  toolbarEnd?: React.ReactNode
  /**
   * Keep the selection checkbox and the first data column (the row's name) —
   * and the trailing `actions` column — in view while the table scrolls
   * sideways, so a row can be identified and acted on at any scroll position.
   * On by default.
   */
  stickyFirstColumn?: boolean
  /**
   * Change this value to clear the table's row selection (the table owns the
   * checkbox state; clearing only a parent's copy left rows ticked, and the
   * next tick brought the stale selection back).
   */
  resetSelectionKey?: string | number
  /** Hide the "N of M selected" note, e.g. when a bulk-action bar shows it. */
  showSelectionCount?: boolean
}

/** Fixed width of the selection column, so the pinned column after it knows its offset. */
const SELECT_COL_WIDTH = 40

/**
 * Pinned cells must be opaque (content scrolls underneath), so they repeat the
 * row's state colours as solid equivalents: the row hover is muted at 50% over
 * the page background.
 */
const PINNED_CELL_CLASS =
  'sticky z-[1] bg-background group-hover/row:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))] group-data-[state=selected]/row:bg-muted'

/** Soft edge after the start-pinned columns, shown while content is hidden under them. */
const PINNED_START_EDGE_CLASS =
  "after:pointer-events-none after:absolute after:inset-y-0 after:-end-3 after:w-3 after:bg-gradient-to-r after:from-foreground/10 after:to-transparent after:opacity-0 after:transition-opacity after:content-[''] rtl:after:bg-gradient-to-l group-data-[hidden-start=true]/table:after:opacity-100"

/** Soft edge before the end-pinned actions column, shown while content remains to scroll. */
const PINNED_END_EDGE_CLASS =
  "before:pointer-events-none before:absolute before:inset-y-0 before:-start-3 before:w-3 before:bg-gradient-to-l before:from-foreground/10 before:to-transparent before:opacity-0 before:transition-opacity before:content-[''] rtl:before:bg-gradient-to-r group-data-[hidden-end=true]/table:before:opacity-100"

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  showColumnToggle = true,
  showPagination = true,
  showSearch = true,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 50, 100],
  emptyMessage = 'No results found',
  emptyDescription = 'Try adjusting your search or filters',
  onRowClick,
  onSelectionChange,
  manualPagination = false,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  getRowId,
  sorting: sortingProp,
  onSortingChange,
  toolbarStart,
  toolbarEnd,
  stickyFirstColumn = true,
  resetSelectionKey,
  showSelectionCount = true,
}: DataTableProps<TData, TValue>) {
  // Which sides of the horizontally-scrolling table have content hidden under
  // the pinned columns — drives the edge shadows.
  const tableWrapRef = React.useRef<HTMLDivElement>(null)
  const [hiddenEdges, setHiddenEdges] = React.useState({ start: false, end: false })
  const measureEdges = React.useCallback(() => {
    const el = tableWrapRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    if (!el) return
    const x = Math.abs(el.scrollLeft)
    const next = { start: x > 0, end: el.scrollWidth - el.clientWidth - x > 1 }
    setHiddenEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next))
  }, [])
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const serverSorting = manualPagination && !!onSortingChange
  const sorting = serverSorting ? (sortingProp ?? []) : internalSorting
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable({
    data,
    columns,
    ...(getRowId ? { getRowId } : {}),
    onSortingChange: serverSorting
      ? (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater)
      : setInternalSorting,
    enableSorting: !manualPagination || serverSorting,
    enableMultiSort: false,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    // In manual (server) pagination the parent already fetched exactly one page,
    // so the table must NOT slice the rows again — omit getPaginationRowModel.
    // Under manual (server) pagination the parent fetched exactly one page, so
    // the table must not slice, sort OR filter the rows again. It previously
    // still did the latter two, which looked global but only ever touched the
    // rows on screen — a sort that silently reorders 20 of 6000 findings is
    // worse than no sort at all. Tell tanstack the server owns all three.
    ...(manualPagination
      ? { manualSorting: true, manualFiltering: true }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
        }),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    manualPagination,
    // Prefer rowCount (tanstack derives pageCount); fall back to explicit pageCount.
    ...(manualPagination ? (rowCount != null ? { rowCount } : { pageCount: pageCount ?? -1 }) : {}),
    onPaginationChange: manualPagination
      ? (updater) => {
          const current = pagination ?? { pageIndex: 0, pageSize }
          const next = typeof updater === 'function' ? updater(current) : updater
          onPaginationChange?.(next)
        }
      : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      ...(manualPagination && pagination ? { pagination } : {}),
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  })

  // Pinned columns: the selection checkbox (if first) + the first data column.
  const visibleColumns = table.getVisibleLeafColumns()
  const selectColumn = visibleColumns[0]?.id === 'select' ? visibleColumns[0] : undefined
  const firstDataColumn = visibleColumns.find((c) => c.id !== 'select' && c.id !== 'actions')
  const pinned = new Map<string, { start: number; last: boolean }>()
  const actionsPinned =
    stickyFirstColumn && visibleColumns[visibleColumns.length - 1]?.id === 'actions'
  if (stickyFirstColumn && firstDataColumn) {
    if (selectColumn) pinned.set(selectColumn.id, { start: 0, last: false })
    pinned.set(firstDataColumn.id, { start: selectColumn ? SELECT_COL_WIDTH : 0, last: true })
  }
  const pinnedProps = (columnId: string) => {
    const isSelect = columnId === 'select'
    const width = isSelect
      ? { width: SELECT_COL_WIDTH, minWidth: SELECT_COL_WIDTH, maxWidth: SELECT_COL_WIDTH }
      : {}
    if (columnId === 'actions' && actionsPinned) {
      return {
        className: cn(PINNED_CELL_CLASS, PINNED_END_EDGE_CLASS),
        style: { insetInlineEnd: 0 },
      }
    }
    const pin = pinned.get(columnId)
    if (!pin) return { className: undefined, style: isSelect ? width : undefined }
    return {
      className: cn(
        PINNED_CELL_CLASS,
        pin.last && PINNED_START_EDGE_CLASS,
        // The pinned name column must leave room for the columns that scroll:
        // cap it and let long names wrap instead of widening the pin.
        pin.last && 'max-w-[min(26rem,38vw)] whitespace-normal'
      ),
      style: { ...width, insetInlineStart: pin.start },
    }
  }

  // Re-measure when the rows, visible columns or container size change.
  React.useEffect(() => {
    measureEdges()
    const el = tableWrapRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]')
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measureEdges)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measureEdges, data, columnVisibility])

  // Clear the selection whenever the parent bumps resetSelectionKey.
  const lastResetKey = React.useRef(resetSelectionKey)
  React.useEffect(() => {
    if (lastResetKey.current === resetSelectionKey) return
    lastResetKey.current = resetSelectionKey
    setRowSelection({})
  }, [resetSelectionKey])

  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const totalCount = table.getFilteredRowModel().rows.length

  // Lift the internally-owned selection up to an optional parent callback so a
  // bulk-action bar can react. Ref keeps the effect from depending on an inline
  // callback identity (which would refire every render).
  const onSelectionChangeRef = React.useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  React.useEffect(() => {
    onSelectionChangeRef.current?.(table.getFilteredSelectedRowModel().rows.map((r) => r.original))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection])

  return (
    <div className="space-y-4">
      {/* Toolbar - Search and Column toggle on same row */}
      <div className="flex items-center gap-2">
        {toolbarStart && (
          <div className="flex min-w-0 flex-1 items-center gap-2">{toolbarStart}</div>
        )}
        {/* Search */}
        {showSearch && (
          <div className="relative flex-1 min-w-0 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={
                searchKey
                  ? ((table.getColumn(searchKey)?.getFilterValue() as string) ?? '')
                  : globalFilter
              }
              onChange={(event) => {
                if (searchKey) {
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                } else {
                  setGlobalFilter(event.target.value)
                }
              }}
              className="ps-9 pe-9"
            />
            {Boolean(searchKey ? table.getColumn(searchKey)?.getFilterValue() : globalFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                onClick={() => {
                  if (searchKey) {
                    table.getColumn(searchKey)?.setFilterValue('')
                  } else {
                    setGlobalFilter('')
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Right side actions */}
        <div className="ms-auto flex items-center gap-2 shrink-0">
          {toolbarEnd}
          {/* Selection info - hidden on mobile when no selection */}
          {showSelectionCount && selectedCount > 0 && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {selectedCount} of {totalCount} selected
            </span>
          )}

          {/* Column visibility toggle */}
          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <SlidersHorizontal className="h-4 w-4 sm:me-2" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id.replace(/_/g, ' ')}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableWrapRef}
        className="group/table rounded-md border overflow-x-auto"
        data-hidden-start={hiddenEdges.start}
        data-hidden-end={hiddenEdges.end}
        // scroll does not bubble, but a capture listener on an ancestor sees the
        // inner table container's scroll.
        onScrollCapture={(e) => {
          if ((e.target as HTMLElement).dataset.slot === 'table-container') measureEdges()
        }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} {...pinnedProps(header.column.id)}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn('group/row', onRowClick && 'cursor-pointer hover:bg-muted/50')}
                  onClick={(e) => {
                    // Don't trigger row click if clicking on checkbox, button, or dropdown
                    const target = e.target as HTMLElement
                    const isInteractiveElement =
                      target.closest('button') ||
                      target.closest('[role="checkbox"]') ||
                      target.closest('[data-radix-collection-item]') ||
                      target.closest('[role="menuitem"]')

                    if (!isInteractiveElement && onRowClick) {
                      onRowClick(row.original)
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} {...pinnedProps(cell.column.id)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                    <p className="text-xs text-muted-foreground">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Row count info - centered on mobile. Under manual pagination the
              total is the server row count, not the current page's length. */}
          {(() => {
            const { pageIndex, pageSize: ps } = table.getState().pagination
            const total = manualPagination
              ? (rowCount ?? data.length)
              : table.getFilteredRowModel().rows.length
            const start = total === 0 ? 0 : pageIndex * ps + 1
            const end = Math.min((pageIndex + 1) * ps, total)
            return (
              <div className="text-sm text-muted-foreground text-center sm:text-start">
                Showing <span className="font-medium">{start}</span>
                {' - '}
                <span className="font-medium">{end}</span>
                {' of '}
                <span className="font-medium">{total}</span>
                {' results'}
              </div>
            )
          })()}

          {/* Pagination controls - centered on mobile */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4">
            {/* Page size selector */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="First page"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Previous page"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page indicator */}
              <span className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Page</span>
                <span className="font-medium">{table.getState().pagination.pageIndex + 1}</span>
                <span className="text-muted-foreground">of</span>
                <span className="font-medium">{table.getPageCount()}</span>
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Next page"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Last page"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
