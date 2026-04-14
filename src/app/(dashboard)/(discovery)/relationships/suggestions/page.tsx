'use client'

import { useState } from 'react'
import { Main } from '@/components/layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ArrowRight, Check, CheckCheck, RefreshCw, Sparkles, X, Link2 } from 'lucide-react'
import { toast } from 'sonner'
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
  resolves_to: 'Resolves To',
  runs_on: 'Runs On',
  deployed_to: 'Deployed To',
  depends_on: 'Depends On',
  exposes: 'Exposes',
}

const TYPE_COLORS: Record<string, string> = {
  member_of: 'bg-blue-500/10 text-blue-600',
  resolves_to: 'bg-green-500/10 text-green-600',
  runs_on: 'bg-purple-500/10 text-purple-600',
  deployed_to: 'bg-orange-500/10 text-orange-600',
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-yellow-600' : 'text-red-600'
  return <span className={`text-xs font-mono ${color}`}>{pct}%</span>
}

function SuggestionRow({
  suggestion,
  onApprove,
  onDismiss,
  isApproving,
  isDismissing,
}: {
  suggestion: RelationshipSuggestion
  onApprove: (id: string) => void
  onDismiss: (id: string) => void
  isApproving: boolean
  isDismissing: boolean
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Badge variant="outline" className="text-xs shrink-0">
            {suggestion.source_asset_type}
          </Badge>
          <span className="font-medium truncate max-w-[200px]" title={suggestion.source_asset_name}>
            {suggestion.source_asset_name}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <Badge
            className={`text-xs border-0 ${TYPE_COLORS[suggestion.relationship_type] || 'bg-gray-500/10 text-gray-600'}`}
          >
            {TYPE_LABELS[suggestion.relationship_type] || suggestion.relationship_type}
          </Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Badge variant="outline" className="text-xs shrink-0">
            {suggestion.target_asset_type}
          </Badge>
          <span className="font-medium truncate max-w-[200px]" title={suggestion.target_asset_name}>
            {suggestion.target_asset_name}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{suggestion.reason}</span>
      </TableCell>
      <TableCell>
        <ConfidenceBadge value={suggestion.confidence} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => onApprove(suggestion.id)}
            disabled={isApproving || isDismissing}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Approve
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDismiss(suggestion.id)}
            disabled={isApproving || isDismissing}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export default function RelationshipSuggestionsPage() {
  const [page] = useState(1)
  const { data, isLoading, mutate } = useRelationshipSuggestions('pending', page, 100)
  const { trigger: approve, isMutating: isApproving } = useApproveSuggestion()
  const { trigger: dismiss, isMutating: isDismissing } = useDismissSuggestion()
  const { trigger: approveAll, isMutating: isApprovingAll } = useApproveAllSuggestions()
  const { trigger: generate, isMutating: isGenerating } = useGenerateSuggestions()

  const suggestions = data?.data ?? []
  const total = data?.total ?? 0

  const handleApprove = async (id: string) => {
    try {
      await approve(id)
      toast.success('Relationship created')
      mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to approve'))
    }
  }

  const handleDismiss = async (id: string) => {
    try {
      await dismiss(id)
      toast.success('Suggestion dismissed')
      mutate()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to dismiss'))
    }
  }

  const handleApproveAll = async () => {
    try {
      await approveAll()
      toast.success(`${total} relationships created`)
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
            Scan for Relationships
          </Button>
          {total > 0 && (
            <Button onClick={handleApproveAll} disabled={isApprovingAll}>
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
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Link2 className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No pending suggestions</p>
              <p className="text-xs mt-1">
                Click &quot;Scan for Relationships&quot; to detect new connections
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                    <SuggestionRow
                      key={s.id}
                      suggestion={s}
                      onApprove={handleApprove}
                      onDismiss={handleDismiss}
                      isApproving={isApproving}
                      isDismissing={isDismissing}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </Main>
  )
}
