/**
 * Sheet Primitives — small reusable building blocks for detail sheets/drawers.
 *
 * Distinct from `StatsCard` (dashboard kpi card) — these are designed for
 * the dense, vertically-scrolling layout of `<SheetContent>` panels.
 */

'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// SheetStatCard — compact KPI tile for the sheet header / overview tab
// ============================================================================

export interface SheetStatCardProps {
  icon: React.ElementType
  label: string
  value: string | number
  /** Tailwind color class for icon + value (e.g. 'text-red-500'). */
  color?: string
  description?: string
  className?: string
}

export function SheetStatCard({
  icon: Icon,
  label,
  value,
  color,
  description,
  className,
}: SheetStatCardProps) {
  return (
    <div className={cn('rounded-lg border p-3 space-y-1', className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

// ============================================================================
// SheetInfoRow — key/value horizontal row inside a Card
// ============================================================================

export interface SheetInfoRowProps {
  label: string
  children: React.ReactNode
}

export function SheetInfoRow({ label, children }: SheetInfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

// ============================================================================
// SheetSectionHeading — section title with optional icon
// ============================================================================

export interface SheetSectionHeadingProps {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}

export function SheetSectionHeading({ icon: Icon, children, className }: SheetSectionHeadingProps) {
  return (
    <h3 className={cn('flex items-center gap-2 text-sm font-semibold text-foreground', className)}>
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </h3>
  )
}

// ============================================================================
// SheetPaginationFooter — prev/next + indicator, used inside list tabs
// ============================================================================

export interface SheetPaginationFooterProps {
  page: number
  totalPages: number
  pageSize: number
  total: number
  rendered: number
  onPageChange: (n: number) => void
}

export function SheetPaginationFooter({
  page,
  totalPages,
  pageSize,
  total,
  rendered,
  onPageChange,
}: SheetPaginationFooterProps) {
  const start = (page - 1) * pageSize + 1
  const end = (page - 1) * pageSize + rendered
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-xs">
          <span className="font-medium">{page}</span>
          <span className="text-muted-foreground"> / {totalPages}</span>
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
