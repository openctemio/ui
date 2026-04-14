'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Building2,
  BarChart3,
  AlertTriangle,
  Shield,
  Activity,
  Crown,
  TrendingUp,
} from 'lucide-react'
import { useTenant } from '@/context/tenant-provider'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useAssetStats } from '@/features/assets/hooks/use-assets'
import { useBusinessUnits } from '@/features/business-units/api/use-business-units'
import { useCrownJewels } from '@/features/crown-jewels/api/use-crown-jewels'

// Risk score → label + color
function riskLabel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 75) return { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' }
  if (score >= 50) return { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20' }
  if (score >= 25) return { label: 'Medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
  return { label: 'Low', color: 'text-green-400', bgColor: 'bg-green-500/20' }
}

const CRITICALITY_ORDER = ['critical', 'high', 'medium', 'low'] as const
const CRITICALITY_CONFIG: Record<string, { color: string; barColor: string }> = {
  critical: { color: 'text-red-400', barColor: 'bg-red-500' },
  high: { color: 'text-orange-400', barColor: 'bg-orange-500' },
  medium: { color: 'text-yellow-400', barColor: 'bg-yellow-500' },
  low: { color: 'text-green-400', barColor: 'bg-green-500' },
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-16 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

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
    <>
      <Main>
        <PageHeader
          title="Business Impact Analysis"
          description="Assess the business impact of security vulnerabilities across assets and business units"
        />

        {/* Overview Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Total Assets
                  </CardDescription>
                  <CardTitle className="text-3xl">{assetStats.total}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <span>{assetStats.withFindings} with findings</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Critical Findings
                  </CardDescription>
                  <CardTitle className="text-3xl text-red-500">{criticalFindings}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <TrendingUp className="h-3 w-3 text-orange-400" />
                    <span>{highFindings} high severity</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Critical Assets
                  </CardDescription>
                  <CardTitle className="text-3xl text-orange-500">{criticalAssets}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs">
                    {assetStats.highRiskCount} high-risk (score &ge; 70)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Avg CVSS Score
                  </CardDescription>
                  <CardTitle className="text-3xl text-yellow-500">
                    {stats.findings.averageCvss.toFixed(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-xs">
                    {stats.findings.total} total findings
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Asset Criticality Breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Asset Criticality Breakdown</CardTitle>
              <CardDescription>Distribution across criticality levels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {assetStatsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))
                : criticalityBreakdown.map(({ level, count, percentage }) => {
                    const config = CRITICALITY_CONFIG[level]
                    return (
                      <div key={level} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium capitalize ${config.color}`}>
                            {level}
                          </span>
                          <span className="text-sm font-bold">
                            {count}{' '}
                            <span className="text-muted-foreground font-normal text-xs">
                              ({percentage}%)
                            </span>
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
            </CardContent>
          </Card>

          {/* Crown Jewels */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-400" />
                  Crown Jewels
                </CardTitle>
                <CardDescription>
                  Most critical assets by risk score ({crownData?.total ?? 0} total)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {crownLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : topCrownJewels.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                  <Crown className="mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">No crown jewels designated yet.</p>
                  <p className="text-xs mt-1">
                    Mark assets as crown jewels from the Crown Jewels page.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topCrownJewels.map((asset) => {
                    const risk = riskLabel(asset.risk_score || 0)
                    return (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Crown className="h-4 w-4 text-yellow-400 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{asset.name}</p>
                            <p className="text-muted-foreground text-xs capitalize">
                              {asset.type} &bull; {asset.finding_count ?? 0} findings
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono">{asset.risk_score ?? 0}</span>
                          <Badge className={`${risk.bgColor} ${risk.color} border-0`}>
                            {risk.label}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Business Unit Impact */}
        <Card className="mt-6">
          <CardHeader>
            <div>
              <CardTitle className="text-base">Business Unit Impact</CardTitle>
              <CardDescription>
                Risk assessment by business area ({buData?.total ?? 0} units)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {buLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedUnits.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="mb-2 h-8 w-8 opacity-30" />
                <p className="text-sm">No business units configured.</p>
                <p className="text-xs mt-1">Create business units from the Scoping section.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business Unit</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Critical Findings</TableHead>
                    <TableHead>Total Findings</TableHead>
                    <TableHead>Avg Risk Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedUnits.map((unit) => {
                    const risk = riskLabel(unit.avg_risk_score || 0)
                    return (
                      <TableRow key={unit.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="text-muted-foreground h-4 w-4 shrink-0" />
                            <div>
                              <span className="font-medium">{unit.name}</span>
                              {unit.description && (
                                <p className="text-muted-foreground text-xs line-clamp-1">
                                  {unit.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">
                            {unit.owner_name || '—'}
                          </span>
                        </TableCell>
                        <TableCell>{unit.asset_count}</TableCell>
                        <TableCell>
                          {unit.critical_finding_count > 0 ? (
                            <Badge className="bg-red-500/20 text-red-400 border-0">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {unit.critical_finding_count}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>{unit.finding_count}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {(unit.avg_risk_score || 0).toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${risk.bgColor} ${risk.color} border-0`}>
                            {risk.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
