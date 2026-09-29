'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  EmptyState,
  StatsCard,
  RiskScoreBadge,
  DataTable,
  DataTableColumnHeader,
} from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, BarChart3, AlertTriangle, Shield, Activity, Crown } from 'lucide-react'
import { useTenant } from '@/context/tenant-provider'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useAssetStats } from '@/features/assets/hooks/use-assets'
import {
  useBusinessUnits,
  type BusinessUnit,
} from '@/features/business-units/api/use-business-units'
import { useCrownJewels } from '@/features/crown-jewels/api/use-crown-jewels'
import {
  CRITICALITY_DOT_COLORS,
  CRITICALITY_LABELS,
  CRITICALITY_ORDER,
} from '@/lib/criticality-colors'

function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

const buColumns: ColumnDef<BusinessUnit>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Business unit" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <span className="font-medium">{row.original.name}</span>
        {row.original.description && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'owner_name',
    header: 'Owner',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.owner_name || '—'}</span>
    ),
  },
  {
    accessorKey: 'asset_count',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Assets" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.asset_count}</span>,
  },
  {
    accessorKey: 'critical_finding_count',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Critical findings" />,
    cell: ({ row }) => {
      const n = row.original.critical_finding_count
      return (
        <span className={n > 0 ? 'font-medium tabular-nums text-destructive' : 'tabular-nums'}>
          {n}
        </span>
      )
    },
  },
  {
    accessorKey: 'finding_count',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Findings" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.finding_count}</span>,
  },
  {
    accessorKey: 'avg_risk_score',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Avg risk" />,
    cell: ({ row }) => (
      <RiskScoreBadge score={Number((row.original.avg_risk_score || 0).toFixed(1))} size="sm" />
    ),
  },
]

export default function BusinessImpactPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading: statsLoading } = useDashboardStats(currentTenant?.id || null)
  const { stats: assetStats, isLoading: assetStatsLoading } = useAssetStats()
  const { data: buData, isLoading: buLoading } = useBusinessUnits()
  const { data: crownData, isLoading: crownLoading } = useCrownJewels()

  const isLoading = statsLoading || assetStatsLoading || buLoading || crownLoading

  // Derived metrics from real data
  const criticalFindings = stats.findings.bySeverity['critical'] || 0
  const highFindings = stats.findings.bySeverity['high'] || 0
  const criticalAssets = assetStats.byCriticality['critical'] || 0

  // Crown jewel assets sorted by risk score desc
  const topCrownJewels = useMemo(() => {
    const assets = (crownData?.data || []) as Array<{
      id: string
      name: string
      type: string
      risk_score?: number
      finding_count?: number
      criticality?: string
    }>
    return [...assets].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5)
  }, [crownData])

  // Asset criticality breakdown — sorted critical→low
  const criticalityBreakdown = useMemo(() => {
    const total = assetStats.total || 1
    return CRITICALITY_ORDER.map((level) => {
      const count = assetStats.byCriticality[level] || 0
      return { level, count, percentage: Math.round((count / total) * 100) }
    })
  }, [assetStats])

  // Business units sorted by avg_risk_score desc
  const sortedUnits = useMemo(
    () =>
      [...(buData?.data || [])].sort((a, b) => (b.avg_risk_score || 0) - (a.avg_risk_score || 0)),
    [buData]
  )

  return (
    <Main>
      <PageHeader
        title="Business impact"
        description="Where vulnerabilities hit the business hardest — by asset criticality, crown jewel and business unit."
      />

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <StatsCard
              title="Assets"
              value={assetStats.total}
              icon={Activity}
              description={`${assetStats.withFindings} with findings`}
            />
            <StatsCard
              title="Critical findings"
              value={criticalFindings}
              icon={AlertTriangle}
              description={`${highFindings} high severity`}
              valueClassName={criticalFindings > 0 ? 'text-destructive' : undefined}
            />
            <StatsCard
              title="Critical assets"
              value={criticalAssets}
              icon={Shield}
              description={`${assetStats.highRiskCount} high-risk (score ≥ 70)`}
            />
            <StatsCard
              title="Average CVSS"
              value={stats.findings.averageCvss.toFixed(1)}
              icon={BarChart3}
              description={`${stats.findings.total} findings`}
            />
          </>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset criticality</CardTitle>
            <CardDescription>How your assets spread across criticality levels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assetStatsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))
              : criticalityBreakdown.map(({ level, count, percentage }) => (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className={`size-2 shrink-0 rounded-full ${CRITICALITY_DOT_COLORS[level]}`}
                        />
                        {CRITICALITY_LABELS[level]}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {count}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({percentage}%)
                        </span>
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Crown jewels</CardTitle>
            <CardDescription>
              Highest-risk crown-jewel assets ({crownData?.total ?? 0} in total).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {crownLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : topCrownJewels.length === 0 ? (
              <EmptyState
                icon={Crown}
                title="No crown jewels yet"
                description="Mark assets as crown jewels from the Crown jewels page."
                card={false}
              />
            ) : (
              <div className="divide-y">
                {topCrownJewels.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {asset.type} · {asset.finding_count ?? 0} findings
                      </p>
                    </div>
                    <RiskScoreBadge score={asset.risk_score ?? 0} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-5 space-y-3">
        <div>
          <h2 className="text-base font-semibold">Business units</h2>
          <p className="text-sm text-muted-foreground">
            Risk by business area ({buData?.total ?? 0} units), riskiest first.
          </p>
        </div>
        {buLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sortedUnits.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No business units yet"
            description="Create business units from the Scoping section."
          />
        ) : (
          <DataTable
            columns={buColumns}
            data={sortedUnits}
            searchPlaceholder="Search business units…"
            emptyMessage="No business units match"
            emptyDescription="Try a different search."
          />
        )}
      </section>
    </Main>
  )
}
