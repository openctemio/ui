'use client'

import type { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  /** Show the "N of M row(s) selected" summary on the left (default true). */
  showSelected?: boolean
  className?: string
}

/**
 * Canonical pagination controls for a TanStack table — first / prev /
 * "Page X of Y" / next / last, with an optional selected-rows summary.
 * Replaces the identical button cluster that was copy-pasted across the
 * settings and discovery list pages. Behaviour is unchanged: it drives the
 * same table.* methods those blocks already called, so it works for both
 * client- and server-paginated tables.
 */
export function DataTablePagination<TData>({
  table,
  showSelected = true,
  className,
}: DataTablePaginationProps<TData>) {
  return (
    <div className={cn('flex items-center justify-between mt-4', className)}>
      {showSelected ? (
        <p className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </p>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
