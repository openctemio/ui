'use client'

/**
 * Server-paginated table for the unified All-Assets inventory.
 *
 * This is NOT a fork of `assets-data-table` (which is single-type, client-
 * paginated, and owns the create/edit/delete dialog flow). It composes the same
 * shared cell/badge primitives — RiskScoreBadge, CriticalityBadge, ExposureBadge,
 * AssetStatusBadge, the shadcn Table + AssetDetailSheet — into a read-only,
 * multi-type, server-driven grid. Sorting and pagination are `manual`: the page
 * owns them and re-queries the API, so the table never re-paginates a single
 * server page client-side.
 */

import { useMemo, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Globe,
  MinusCircle,
  Package,
  SlidersHorizontal,
  User,
  Users,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RiskScoreBadge } from '@/features/shared'
import { AssetStatusBadge } from '@/features/asset-lifecycle'
import { CriticalityBadge, ExposureBadge } from '../classification-badges'
import { AssetDetailSheet } from '../asset-detail-sheet'
import { getAsset } from '../../hooks'
import { ASSET_TYPE_LABELS, type Asset } from '../../types/asset.types'

export interface InventorySort {
  /** Backend sort field (AllowedSortFields), e.g. "risk_score". */
  field: string
  desc: boolean
}

interface InventoryTableProps {
  assets: Asset[]
  isLoading: boolean
  isError: boolean
  error?: Error | null
  total: number
  page: number
  pageSize: number
  sort?: InventorySort
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onSortChange: (sort: InventorySort | undefined) => void
  onRefresh: () => void
}

function daysSinceISO(iso?: string | null): number | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return undefined
  const diff = Date.now() - t
  if (diff < 0) return undefined
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Human labels for the column-visibility menu + a11y. Keyed by column id
// (which doubles as the backend sort field where the column is sortable).
const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  type: 'Type',
  criticality: 'Criticality',
  exposure: 'Exposure',
  internet: 'Internet',
  owner: 'Owner',
  risk_score: 'Risk',
  finding_count: 'Findings',
  last_seen: 'Last seen',
  tags: 'Tags',
}

export function InventoryTable({
  assets,
  isLoading,
  isError,
  error,
  total,
  page,
  pageSize,
  sort,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRefresh,
}: InventoryTableProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  // Drive tanstack's SortingState from the page-owned sort so the header arrows
  // reflect the active server sort. Toggling a header calls onSortChange.
  const sortingState: SortingState = sort ? [{ id: sort.field, desc: sort.desc }] : []

  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: sortableHeader('Name'),
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.name}</p>
              {row.original.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {row.original.description}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: sortableHeader('Type'),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {ASSET_TYPE_LABELS[row.original.type] ?? row.original.type}
          </Badge>
        ),
      },
      {
        id: 'criticality',
        accessorKey: 'criticality',
        header: sortableHeader('Criticality'),
        cell: ({ row }) => (
          <CriticalityBadge criticality={row.original.criticality} size="sm" showTooltip={false} />
        ),
      },
      {
        id: 'exposure',
        accessorKey: 'exposure',
        header: sortableHeader('Exposure'),
        cell: ({ row }) => (
          <ExposureBadge exposure={row.original.exposure} size="sm" showTooltip={false} />
        ),
      },
      {
        id: 'internet',
        header: 'Internet',
        enableSorting: false,
        cell: ({ row }) => {
          const v = row.original.isInternetAccessible
          if (v === undefined) return <span className="text-muted-foreground">—</span>
          return v ? (
            <span className="inline-flex items-center gap-1 text-xs text-warning">
              <Globe className="h-3.5 w-3.5" />
              Facing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MinusCircle className="h-3.5 w-3.5" />
              No
            </span>
          )
        },
      },
      {
        id: 'owner',
        header: 'Owner',
        enableSorting: false,
        cell: ({ row }) => {
          const owner = row.original.primaryOwner
          if (owner) {
            const Icon = owner.type === 'group' ? Users : User
            return (
              <div className="flex max-w-[160px] items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">{owner.name}</span>
              </div>
            )
          }
          if (row.original.ownerRef) {
            return <span className="truncate text-sm">{row.original.ownerRef}</span>
          }
          return <span className="text-sm text-muted-foreground">Unowned</span>
        },
      },
      {
        id: 'risk_score',
        accessorKey: 'riskScore',
        header: sortableHeader('Risk'),
        cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
      },
      {
        id: 'finding_count',
        accessorKey: 'findingCount',
        header: sortableHeader('Findings'),
        cell: ({ row }) => {
          const count = row.original.findingCount
          if (!count) return <span className="text-muted-foreground">0</span>
          return <Badge variant={count > 5 ? 'destructive' : 'secondary'}>{count}</Badge>
        },
      },
      {
        id: 'last_seen',
        accessorKey: 'lastSeen',
        header: sortableHeader('Last seen'),
        cell: ({ row }) => (
          <AssetStatusBadge
            status={row.original.status}
            daysSinceLastSeen={daysSinceISO(row.original.lastSeen)}
            snoozedUntil={row.original.lifecyclePausedUntil}
          />
        ),
      },
      {
        id: 'tags',
        header: 'Tags',
        enableSorting: false,
        cell: ({ row }) => {
          const tags = row.original.tags ?? []
          if (tags.length === 0) return <span className="text-muted-foreground">—</span>
          const visible = tags.slice(0, 2)
          const rest = tags.length - visible.length
          return (
            <div className="flex flex-wrap gap-1">
              {visible.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">
                  {t}
                </Badge>
              ))}
              {rest > 0 && (
                <Badge variant="outline" className="text-xs">
                  +{rest}
                </Badge>
              )}
            </div>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: assets,
    columns,
    state: { sorting: sortingState, columnVisibility },
    manualPagination: true,
    manualSorting: true,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sortingState) : updater
      const first = next[0]
      onSortChange(first ? { field: first.id, desc: first.desc } : undefined)
    },
    getCoreRowModel: getCoreRowModel(),
  })

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Failed to load assets</p>
        {error?.message && <p className="text-sm text-destructive">{error.message}</p>}
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="me-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Column visibility */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Loading…' : `${total.toLocaleString()} asset${total === 1 ? '' : 's'}`}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                >
                  {COLUMN_LABELS[column.id] ?? column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
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
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {table.getVisibleFlatColumns().map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleFlatColumns().length}
                  className="h-32 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No assets match these filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedAsset(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Server-side pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
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
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AssetDetailSheet
        asset={selectedAsset}
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
        icon={Package}
        iconColor="text-primary"
        gradientFrom="from-primary/20"
        assetTypeName="Asset"
        // Inventory is a read-only lens: edit/delete happen on the per-type
        // pages, so the sheet's danger-zone actions are gated off here.
        onEdit={() => {}}
        onDelete={() => {}}
        canEdit={false}
        canDelete={false}
        onNavigateToAsset={async (id: string) => {
          const local = assets.find((a) => a.id === id)
          if (local) {
            setSelectedAsset(local)
            return
          }
          try {
            setSelectedAsset(await getAsset(id))
          } catch {
            // getAsset surfaces its own errors; keep navigation silent.
          }
        }}
      />
    </div>
  )
}

/** A sortable column header button (three-state: none → asc → desc via tanstack). */
function sortableHeader(label: string) {
  const Header = ({ column }: { column: import('@tanstack/react-table').Column<Asset> }) => {
    const sorted = column.getIsSorted()
    const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
    return (
      <Button
        variant="ghost"
        className="-ms-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {label}
        <Icon className="ms-2 h-3.5 w-3.5" />
      </Button>
    )
  }
  Header.displayName = `SortableHeader(${label})`
  return Header
}
