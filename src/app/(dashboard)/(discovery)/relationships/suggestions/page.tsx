'use client'

import { useState, useCallback } from 'react'
import { Main } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowRight, Check, CheckCheck, RefreshCw, Search, Sparkles, X, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  useRelationshipSuggestions,
  useApproveSuggestion,
  useDismissSuggestion,
  useApproveAllSuggestions,
  useGenerateSuggestions,
  type RelationshipSuggestion,
} from '@/features/relationships/api/use-relationship-suggestions'

const TYPE_LABELS: Record<string, string> = {
  member_of: 'Member Of',
  cname_of: 'CNAME Of',
  resolves_to: 'Resolves To',
  runs_on: 'Runs On',
  deployed_to: 'Deployed To',
  depends_on: 'Depends On',
  exposes: 'Exposes',
  contains: 'Contains',
}

const TYPE_COLORS: Record<string, string> = {
  member_of: 'bg-blue-500/10 text-blue-600',
  cname_of: 'bg-blue-500/10 text-blue-600',
  resolves_to: 'bg-green-500/10 text-green-600',
  runs_on: 'bg-purple-500/10 text-purple-600',
  deployed_to: 'bg-orange-500/10 text-orange-600',
}

const ALL_RELATIONSHIP_TYPES = Object.keys(TYPE_LABELS)

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : 'text-red-600'
  return <span className={`text-xs font-mono font-medium ${color}`}>{pct}%</span>
}

export default function RelationshipSuggestionsPage() {
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const debouncedSearch = useDebounce(searchValue, 300)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingType, setEditingType] = useState<string | null>(null)

  const pageSize = 20
  const { data, isLoading, mutate } = useRelationshipSuggestions(
    'pending',
    page,
    pageSize,
    debouncedSearch || undefined
  )
  const { trigger: approve, isMutating: isApproving } = useApproveSuggestion()
  const { trigger: dismiss, isMutating: isDismissing } = useDismissSuggestion()
  const { trigger: approveAll, isMutating: isApprovingAll } = useApproveAllSuggestions()
  const { trigger: generate, isMutating: isGenerating } = useGenerateSuggestions()

  const suggestions = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selected.size === suggestions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(suggestions.map((s) => s.id)))
    }
  }, [suggestions, selected.size])

  const handleApprove = async (id: string) => {
    try {
      await approve(id)
      toast.success('Relationship created')
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve'))
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await dismiss(id)
      toast.success('Suggestion dismissed')
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to dismiss'))
    }
  }

  const handleApproveSelected = async () => {
    const ids = Array.from(selected)
    try {
      const response = await fetch('/api/v1/relationships/suggestions/approve-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids }),
      })
      if (!response.ok) throw new Error('Failed to approve batch')
      const result = await response.json()
      toast.success(`${result.count} relationships created`)
      setSelected(new Set())
      mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve selected'))
    }
  }

  const handleApproveAll = async () => {
    try {
      await approveAll()
      toast.success(`All relationships created`)
      setSelected(new Set())
      mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve all'))
    }
  }

  const handleGenerate = async () => {
    try {
      await generate()
      toast.success('Suggestions generated')
      mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate'))
    }
  }

  return (
    <Main>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relationship Suggestions</h1>
          <p className="text-muted-foreground text-sm">
            Auto-detected relationships between assets. Review and approve to create links.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Scan
          </Button>
          {total > 0 && (
            <Button variant="outline" onClick={handleApproveAll} disabled={isApprovingAll}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Approve All ({total})
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Pending Review
              </CardTitle>
              <CardDescription>
                {total} suggestion{total !== 1 ? 's' : ''} waiting for review
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search + bulk actions */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset name..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value)
                  setPage(1)
                }}
                className="pl-8 h-9"
              />
            </div>
            {selected.size > 0 && (
              <Button size="sm" onClick={handleApproveSelected} disabled={isApproving}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Approve Selected ({selected.size})
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Link2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {debouncedSearch ? 'No matching suggestions' : 'No pending suggestions'}
              </p>
              <p className="text-xs mt-1">
                {debouncedSearch
                  ? 'Try a different search term'
                  : 'Click "Scan" to detect new connections'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selected.size === suggestions.length && suggestions.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suggestions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(s.id)}
                            onCheckedChange={() => toggleSelect(s.id)}
                            aria-label={`Select ${s.source_asset_name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[160px]">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {s.source_asset_type}
                            </Badge>
                            <span
                              className="font-medium truncate max-w-[180px]"
                              title={s.source_asset_name}
                            >
                              {s.source_asset_name || s.source_asset_id.slice(0, 8)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingType === s.id ? (
                            <Select
                              defaultValue={s.relationship_type}
                              onValueChange={(val) => {
                                // Inline edit — for now just show the new label
                                // TODO: wire to PATCH endpoint when backend supports it
                                setEditingType(null)
                                toast.info(`Changed to ${TYPE_LABELS[val] || val}`)
                              }}
                            >
                              <SelectTrigger className="h-7 w-[140px] text-xs">
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
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <Badge
                                className={`text-xs border-0 cursor-pointer ${TYPE_COLORS[s.relationship_type] || 'bg-gray-500/10 text-gray-600'}`}
                                onClick={() => setEditingType(s.id)}
                                title="Click to change type"
                              >
                                {TYPE_LABELS[s.relationship_type] || s.relationship_type}
                              </Badge>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[160px]">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {s.target_asset_type}
                            </Badge>
                            <span
                              className="font-medium truncate max-w-[180px]"
                              title={s.target_asset_name}
                            >
                              {s.target_asset_name || s.target_asset_id.slice(0, 8)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-xs text-muted-foreground max-w-[200px] truncate block"
                            title={s.reason}
                          >
                            {s.reason}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ConfidenceBadge value={s.confidence} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(s.id)}
                              disabled={isApproving || isDismissing}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDismiss(s.id)}
                              disabled={isApproving || isDismissing}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3 mt-2">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Main>
  )
}
