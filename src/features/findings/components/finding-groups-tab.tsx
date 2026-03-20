'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  BarChart3,
  User,
  Server,
  ShieldAlert,
  Scan,
  FileCode,
  Layers,
  UserPlus,
} from 'lucide-react'
import { AutoAssignDialog } from './auto-assign-dialog'
import { SeverityBadge } from '@/features/shared'
import {
  useFindingGroups,
  type FindingGroup,
  type GroupByDimension,
} from '../api/use-finding-groups'

const DIMENSIONS: { value: GroupByDimension; label: string; icon: typeof BarChart3 }[] = [
  { value: 'cve_id', label: 'By CVE', icon: ShieldAlert },
  { value: 'asset_id', label: 'By Asset', icon: Server },
  { value: 'owner_id', label: 'By Owner', icon: User },
  { value: 'severity', label: 'By Severity', icon: BarChart3 },
  { value: 'source', label: 'By Source', icon: Scan },
  { value: 'component_id', label: 'By Component', icon: Layers },
  { value: 'finding_type', label: 'By Type', icon: FileCode },
]

interface FindingGroupsTabProps {
  onViewFindings?: (groupKey: string, groupType: string) => void
  onMarkFixed?: (group: FindingGroup) => void
}

export function FindingGroupsTab({ onViewFindings, onMarkFixed }: FindingGroupsTabProps) {
  const [dimension, setDimension] = useState<GroupByDimension>('cve_id')
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)

  const { data, isLoading, mutate } = useFindingGroups({
    group_by: dimension,
    statuses: 'new,confirmed,in_progress,fix_applied,resolved',
  })

  const groups = data?.data ?? []

  return (
    <div className="space-y-4">
      {/* Dimension Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {DIMENSIONS.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={dimension === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDimension(value)}
              className="shrink-0"
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Checkbox
            id="show-mine"
            checked={showOnlyMine}
            onCheckedChange={(v) => setShowOnlyMine(!!v)}
          />
          <label htmlFor="show-mine" className="text-sm text-muted-foreground cursor-pointer">
            Show only mine
          </label>
        </div>
      </div>

      {/* Groups List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No findings grouped yet</h3>
            <p className="text-muted-foreground text-sm">
              Run a scan to discover vulnerabilities, then come back to view groups.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <FindingGroupCard
              key={group.group_key}
              group={group}
              onViewFindings={onViewFindings}
              onMarkFixed={onMarkFixed}
            />
          ))}
        </div>
      )}

      {/* Auto-Assign button for Owner view */}
      {dimension === 'owner_id' && groups.some((g) => g.group_key === 'unassigned') && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setAutoAssignOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Auto-Assign to Asset Owners
          </Button>
        </div>
      )}

      {/* Pagination info */}
      {data && data.pagination.total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {groups.length} of {data.pagination.total} groups
        </p>
      )}

      {/* Auto-Assign Dialog */}
      <AutoAssignDialog
        open={autoAssignOpen}
        onOpenChange={setAutoAssignOpen}
        onSuccess={() => mutate()}
      />
    </div>
  )
}

// ============================================
// Group Card
// ============================================

interface FindingGroupCardProps {
  group: FindingGroup
  onViewFindings?: (groupKey: string, groupType: string) => void
  onMarkFixed?: (group: FindingGroup) => void
}

function FindingGroupCard({ group, onViewFindings, onMarkFixed }: FindingGroupCardProps) {
  const { stats } = group
  const hasFixApplied = stats.fix_applied > 0

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="py-4">
        {/* Row 1: Label + Severity + Stats */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{group.label}</h4>
              {group.severity && group.group_type === 'cve' && (
                <SeverityBadge
                  severity={group.severity as 'critical' | 'high' | 'medium' | 'low' | 'info'}
                />
              )}
              {Boolean(group.metadata?.cisa_kev) && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  KEV
                </Badge>
              )}
            </div>
            {/* Metadata line */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {group.group_type === 'cve' && (
                <>
                  {group.metadata?.cvss_score && (
                    <span>CVSS {String(group.metadata.cvss_score)}</span>
                  )}
                  {group.metadata?.epss_score && (
                    <span>EPSS {(Number(group.metadata.epss_score) * 100).toFixed(1)}%</span>
                  )}
                </>
              )}
              {group.group_type === 'asset' && (
                <>
                  <span>{String(group.metadata?.asset_type ?? '')}</span>
                  {group.metadata?.owner && <span>Owner: {String(group.metadata.owner)}</span>}
                </>
              )}
              {group.group_type === 'owner' && Boolean(group.metadata?.email) && (
                <span>{String(group.metadata.email)}</span>
              )}
              <span>{stats.affected_assets} assets</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewFindings?.(group.group_key, group.group_type)}
            >
              View
            </Button>
            {stats.in_progress > 0 && (
              <Button size="sm" onClick={() => onMarkFixed?.(group)}>
                Mark Fixed
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: 4-column progress */}
        <div className="mt-3">
          <div className="flex items-center gap-4 text-xs mb-1.5">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Open {stats.open}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Fixing {stats.in_progress}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Applied {stats.fix_applied}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Resolved {stats.resolved}
            </span>
            <span className="ml-auto font-medium">{stats.progress_pct.toFixed(0)}% verified</span>
          </div>
          <Progress value={stats.progress_pct} className="h-2" />
        </div>

        {/* Fix Applied indicator */}
        {hasFixApplied && (
          <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
            {stats.fix_applied} findings awaiting verification scan
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FindingGroupsTab
