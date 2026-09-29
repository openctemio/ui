'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import { EmptyState, PageHeader, DataTable, BulkActionBar } from '@/features/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCheck,
  RefreshCw,
  Search,
  Sparkles,
  X,
  Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { useUrlFilter, useUrlFilterNumber } from '@/hooks/use-url-param'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  useRelationshipSuggestions,
  useApproveSuggestion,
  useDismissSuggestion,
  useApproveAllSuggestions,
  useGenerateSuggestions,
  useUpdateSuggestionType,
  useApproveBatchSuggestions,
  type RelationshipSuggestion,
} from '@/features/relationships/api/use-relationship-suggestions'

const TYPE_LABELS: Record<string, string> = {
  contains: 'Contains',
  resolves_to: 'Resolves to',
  cname_of: 'CNAME of',
  runs_on: 'Runs on',
  deployed_to: 'Deployed to',
  depends_on: 'Depends on',
  exposes: 'Exposes',
  sends_data_to: 'Sends data to',
  stores_data_in: 'Stores data in',
  authenticates_to: 'Authenticates to',
  granted_to: 'Granted to',
  has_access_to: 'Has access to',
  load_balances: 'Load balances',
  protected_by: 'Protected by',
  monitors: 'Monitors',
  manages: 'Manages',
  peer_of: 'Peer of',
  replicates_to: 'Replicates to',
}

const ALL_RELATIONSHIP_TYPES = Object.keys(TYPE_LABELS)
const PAGE_SIZES = [20, 50, 100]

function AssetCell({ type, name, id }: { type: string; name: string; id: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge variant="outline" className="shrink-0 text-xs">
        {type}
      </Badge>
      <span className="max-w-[200px] truncate font-medium" title={name}>
        {name || id.slice(0, 8)}
      </span>
    </div>
  )
}

export default function RelationshipSuggestionsPage() {
  // Search and page live in the URL so a review queue position can be linked to.
  const [searchParam, setSearchParam] = useUrlFilter('q', '')
  const [page, setPage] = useUrlFilterNumber('page', 1)
  const [perPage, setPerPage] = useUrlFilterNumber('per_page', 20)
  const [searchValue, setSearchValue] = useState(searchParam)
  const debouncedSearch = useDebounce(searchValue, 300)
  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      setSearchParam(debouncedSearch)
      setPage(1)
    }
    // Only react to the debounced input, not to URL writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const [selected, setSelected] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => {
    setSelected([])
    setSelectionEpoch((n) => n + 1)
  }, [])
  const [editingType, setEditingType] = useState<string | null>(null)

  const pageSize = PAGE_SIZES.includes(perPage) ? perPage : 20
  const { data, error, isLoading, isValidating } = useRelationshipSuggestions(
    'pending',
    page,
    pageSize,
    searchParam || undefined
  )
  const { trigger: approve, isMutating: isApproving } = useApproveSuggestion()
  const { trigger: dismiss, isMutating: isDismissing } = useDismissSuggestion()
  const { trigger: approveAll, isMutating: isApprovingAll } = useApproveAllSuggestions()
  const { trigger: generate, isMutating: isGenerating } = useGenerateSuggestions()
  const { trigger: updateType } = useUpdateSuggestionType()
  const { trigger: approveBatch, isMutating: isBatchApproving } = useApproveBatchSuggestions()

  const suggestions = useMemo(() => data?.data ?? [], [data])
  const total = data?.total ?? 0
  const isMutating = isApproving || isDismissing || isApprovingAll || isBatchApproving

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await approve(id)
        toast.success('Relationship created')
        clearSelection()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to approve'))
      }
    },
    [approve, clearSelection]
  )

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await dismiss(id)
        toast.success('Suggestion dismissed')
        clearSelection()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to dismiss'))
      }
    },
    [dismiss, clearSelection]
  )

  const handleApproveSelected = async () => {
    const ids = [...selected]
    try {
      const result = await approveBatch(ids)
      toast.success(`${result?.count ?? ids.length} relationships created`)
      clearSelection()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve selected'))
    }
  }

  const handleApproveAll = async () => {
    try {
      await approveAll()
      toast.success('All relationships created')
      clearSelection()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve all'))
    }
  }

  const handleGenerate = async () => {
    try {
      await generate()
      toast.success('Suggestions generated')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate'))
    }
  }

  const handleUpdateType = useCallback(
    async (id: string, newType: string) => {
      setEditingType(null)
      try {
        await updateType({ id, relationship_type: newType })
        toast.success(`Changed to ${TYPE_LABELS[newType] || newType}`)
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to update type'))
      }
    },
    [updateType]
  )

  const columns = useMemo<ColumnDef<RelationshipSuggestion>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all on this page"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.source_asset_name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'source',
        header: 'Source',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <AssetCell
            type={row.original.source_asset_type}
            name={row.original.source_asset_name}
            id={row.original.source_asset_id}
          />
        ),
      },
      {
        id: 'relationship',
        header: 'Relationship',
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original
          return editingType === s.id ? (
            <Select
              defaultValue={s.relationship_type}
              onValueChange={(val) => handleUpdateType(s.id, val)}
              onOpenChange={(open) => {
                if (!open) setEditingType(null)
              }}
            >
              <SelectTrigger className="h-7 w-[150px] text-xs" aria-label="Relationship type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-1">
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Badge asChild variant="secondary" className="cursor-pointer text-xs">
                <button
                  type="button"
                  onClick={() => setEditingType(s.id)}
                  title="Change relationship type"
                >
                  {TYPE_LABELS[s.relationship_type] || s.relationship_type}
                </button>
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
          )
        },
      },
      {
        id: 'target',
        header: 'Target',
        enableSorting: false,
        cell: ({ row }) => (
          <AssetCell
            type={row.original.target_asset_type}
            name={row.original.target_asset_name}
            id={row.original.target_asset_id}
          />
        ),
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="block max-w-[240px] truncate text-xs text-muted-foreground"
            title={row.original.reason}
          >
            {row.original.reason}
          </span>
        ),
      },
      {
        accessorKey: 'confidence',
        header: 'Confidence',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{Math.round(row.original.confidence * 100)}%</span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => handleApprove(row.original.id)}
              disabled={isMutating}
            >
              <Check className="me-1 h-3.5 w-3.5" />
              Approve
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDismiss(row.original.id)}
                  disabled={isMutating}
                  aria-label="Dismiss suggestion"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dismiss</TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
    [editingType, handleApprove, handleDismiss, handleUpdateType, isMutating]
  )

  const searchBox = (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search by asset name…"
        aria-label="Search suggestions"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="h-9 ps-9"
      />
    </div>
  )

  return (
    <Main>
      <PageHeader
        title="Relationship suggestions"
        description="Relationships detected between assets. Approve one to create the link."
      >
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <RefreshCw className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="me-2 h-4 w-4" />
          )}
          Scan
        </Button>
        {total > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" disabled={isApprovingAll}>
                <CheckCheck className="me-2 h-4 w-4" />
                Approve all ({total})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve all {total} suggestions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will create {total} relationships between your assets. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleApproveAll}>Approve all</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </PageHeader>

      <div className="mt-5">
        {error && !isLoading ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load suggestions</AlertTitle>
            <AlertDescription>{getErrorMessage(error, 'Please try again later')}</AlertDescription>
          </Alert>
        ) : isLoading || (isValidating && !data) ? (
          <div className="space-y-2 rounded-xl border p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : suggestions.length === 0 && !searchParam ? (
          <EmptyState
            icon={Link2}
            title="No pending suggestions"
            description="Run a scan to detect new connections between assets."
          />
        ) : (
          <DataTable
            columns={columns}
            data={suggestions}
            showSearch={false}
            toolbarStart={searchBox}
            getRowId={(s) => s.id}
            manualPagination
            rowCount={total}
            pagination={{ pageIndex: page - 1, pageSize }}
            onPaginationChange={(p) => {
              if (p.pageSize !== pageSize) {
                setPerPage(p.pageSize)
                setPage(1)
              } else {
                setPage(p.pageIndex + 1)
              }
              clearSelection()
            }}
            pageSizeOptions={PAGE_SIZES}
            onSelectionChange={(rows) => setSelected(rows.map((r) => r.id))}
            resetSelectionKey={selectionEpoch}
            showSelectionCount={false}
            emptyMessage="No matching suggestions"
            emptyDescription="Try a different search term."
          />
        )}
      </div>

      <BulkActionBar count={selected.length} onClear={clearSelection} noun="selected">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8" disabled={isBatchApproving}>
              <Check className="me-2 h-4 w-4" />
              Approve
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Approve {selected.length} selected suggestion{selected.length > 1 ? 's' : ''}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will create {selected.length} relationships between your assets.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApproveSelected}>Approve</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </BulkActionBar>
    </Main>
  )
}
