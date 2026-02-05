'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link2, Copy, Eye, ExternalLink, Plus, Repeat, Fingerprint } from 'lucide-react'
import type { FindingDetail, RelatedFinding } from '../../types'
import { FINDING_STATUS_CONFIG } from '../../types'
import { SeverityBadge } from '@/features/shared'

interface RelatedTabProps {
  finding: FindingDetail
}

interface RelatedFindingsTableProps {
  findings: RelatedFinding[]
  emptyMessage: string
  showSimilarity?: boolean
}

function RelatedFindingsTable({
  findings,
  emptyMessage,
  showSimilarity = false,
}: RelatedFindingsTableProps) {
  const router = useRouter()

  if (findings.length === 0) {
    return <div className="text-muted-foreground py-8 text-center text-sm">{emptyMessage}</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Finding</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Asset</TableHead>
          {showSimilarity && <TableHead className="text-right">Match</TableHead>}
          <TableHead className="w-[40px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((finding) => {
          const statusConfig = FINDING_STATUS_CONFIG[finding.status]

          return (
            <TableRow
              key={finding.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/findings/${finding.id}`)}
            >
              <TableCell>
                <div>
                  <p className="font-medium">{finding.title}</p>
                  <p className="text-muted-foreground text-xs">{finding.id}</p>
                </div>
              </TableCell>
              <TableCell>
                <SeverityBadge severity={finding.severity} />
              </TableCell>
              <TableCell>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0`}>
                  {statusConfig.label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{finding.assetName}</TableCell>
              {showSimilarity && (
                <TableCell className="text-right">
                  {finding.similarity && (
                    <span
                      className={`text-sm font-medium ${finding.similarity >= 80 ? 'text-green-400' : finding.similarity >= 50 ? 'text-yellow-400' : 'text-muted-foreground'}`}
                    >
                      {finding.similarity}%
                    </span>
                  )}
                </TableCell>
              )}
              <TableCell>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function RelatedTab({ finding }: RelatedTabProps) {
  const similarFindings = finding.similarFindings || []
  const linkedFindings = finding.linkedFindings || []
  const sameCveFindings = finding.sameCveFindings || []

  const totalRelated = similarFindings.length + linkedFindings.length + sameCveFindings.length

  // Check if there's any tracking info to show
  const hasTrackingInfo =
    finding.occurrenceCount !== undefined ||
    finding.duplicateCount !== undefined ||
    finding.correlationId

  // Empty state - show only when no related findings AND no tracking info
  if (totalRelated === 0 && !hasTrackingInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Link2 className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No Related Findings</h3>
        <p className="text-muted-foreground mb-4 text-center text-sm">
          No similar or linked findings have been identified yet.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Find Similar
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Link Finding
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tracking Info - occurrence, duplicates, correlation */}
      {hasTrackingInfo && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold mb-3">Tracking Info</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {finding.occurrenceCount !== undefined && (
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                  <Repeat className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{finding.occurrenceCount}</p>
                  <p className="text-muted-foreground text-xs">Occurrences</p>
                </div>
              </div>
            )}
            {finding.duplicateCount !== undefined && (
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                  <Copy className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-lg font-bold">{finding.duplicateCount}</p>
                  <p className="text-muted-foreground text-xs">Duplicates</p>
                </div>
              </div>
            )}
            {finding.correlationId && (
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                  <Fingerprint className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p
                    className="text-xs font-mono truncate max-w-[150px]"
                    title={finding.correlationId}
                  >
                    {finding.correlationId}
                  </p>
                  <p className="text-muted-foreground text-xs">Correlation ID</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats - only show when there's related findings data */}
      {totalRelated > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Eye className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{similarFindings.length}</p>
              <p className="text-muted-foreground text-xs">Similar</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Link2 className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{linkedFindings.length}</p>
              <p className="text-muted-foreground text-xs">Linked</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
              <Copy className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sameCveFindings.length}</p>
              <p className="text-muted-foreground text-xs">Same CVE</p>
            </div>
          </div>
        </div>
      )}

      {/* Similar Findings - only show section if has data */}
      {similarFindings.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Eye className="h-4 w-4 text-blue-400" />
                Similar Findings
              </h3>
              <p className="text-muted-foreground text-sm">
                Findings with similar characteristics detected by AI
              </p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="mr-2 h-3 w-3" />
              Find Similar
            </Button>
          </div>
          <RelatedFindingsTable
            findings={similarFindings}
            emptyMessage="No similar findings detected"
            showSimilarity
          />
        </div>
      )}

      {/* Linked Findings - only show section if has data */}
      {linkedFindings.length > 0 && (
        <>
          {similarFindings.length > 0 && <Separator />}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <Link2 className="h-4 w-4 text-purple-400" />
                  Linked Findings
                </h3>
                <p className="text-muted-foreground text-sm">Manually linked related findings</p>
              </div>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-3 w-3" />
                Link Finding
              </Button>
            </div>
            <RelatedFindingsTable findings={linkedFindings} emptyMessage="No linked findings" />
          </div>
        </>
      )}

      {/* Same CVE - only show section if has CVE and data */}
      {finding.cve && sameCveFindings.length > 0 && (
        <>
          {(similarFindings.length > 0 || linkedFindings.length > 0) && <Separator />}
          <div>
            <div className="mb-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <Copy className="h-4 w-4 text-orange-400" />
                Same CVE ({finding.cve})
              </h3>
              <p className="text-muted-foreground text-sm">
                Other findings with the same CVE identifier
              </p>
            </div>
            <RelatedFindingsTable
              findings={sameCveFindings}
              emptyMessage="No other findings with this CVE"
            />
          </div>
        </>
      )}
    </div>
  )
}
