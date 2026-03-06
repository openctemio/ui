'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/charts'
import { cn } from '@/lib/utils'
import {
  Users,
  Server,
  FolderGit2,
  Layers,
  CircleDot,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

function StatsCardsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ContentSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function TasksByTeamPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const totalAssets = stats.assets.total || 0
  const assetTypes = stats.assets.byType || {}
  const assetTypeCount = Object.keys(assetTypes).length
  const reposTotal = stats.repositories.total || 0
  const reposWithFindings = stats.repositories.withFindings || 0

  const assetDistribution = useMemo(() => {
    return Object.entries(assetTypes)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [assetTypes])

  const repoCoverage = useMemo(() => {
    if (reposTotal === 0) return 0
    return Math.round((reposWithFindings / reposTotal) * 100)
  }, [reposWithFindings, reposTotal])

  const activeTeams = useMemo(() => {
    return Math.max(assetTypeCount, 1)
  }, [assetTypeCount])

  const workloadInsights = useMemo(() => {
    const items: { label: string; detail: string; type: 'info' | 'warning' | 'success' }[] = []

    if (assetDistribution.length > 0) {
      const topType = assetDistribution[0]
      const topPct = totalAssets > 0 ? Math.round((topType.count / totalAssets) * 100) : 0
      items.push({
        label: `${topType.name} is the largest asset category`,
        detail: `${topType.count} assets (${topPct}% of total)`,
        type: topPct > 60 ? 'warning' : 'info',
      })
    }

    if (reposWithFindings > 0) {
      items.push({
        label: `${reposWithFindings} ${reposWithFindings === 1 ? 'repository has' : 'repositories have'} active findings`,
        detail: `${repoCoverage}% of repositories affected`,
        type: repoCoverage > 50 ? 'warning' : 'info',
      })
    }

    if (stats.findings.overdue > 0) {
      items.push({
        label: `${stats.findings.overdue} overdue findings need team attention`,
        detail: 'Consider redistributing workload',
        type: 'warning',
      })
    }

    if (assetTypeCount > 3) {
      items.push({
        label: 'Diverse asset landscape detected',
        detail: `${assetTypeCount} different asset types require specialized teams`,
        type: 'info',
      })
    }

    if (items.length === 0) {
      items.push({
        label: 'No significant workload observations',
        detail: 'Add assets and configure teams to see distribution insights',
        type: 'info',
      })
    }

    return items
  }, [
    assetDistribution,
    totalAssets,
    reposWithFindings,
    repoCoverage,
    stats.findings.overdue,
    assetTypeCount,
  ])

  const insightIcon = {
    info: <ArrowRight className="h-4 w-4 text-blue-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
  }

  const insightBadge = {
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }

  return (
    <Main>
      <PageHeader
        title="Team Assignments"
        description="View remediation workload distributed across teams"
      />

      {isLoading ? (
        <div className="mt-6">
          <StatsCardsSkeleton />
          <ContentSkeleton />
        </div>
      ) : (
        <>
          <section className="mb-6 mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Assets"
              value={totalAssets}
              description={`Across ${assetTypeCount} types`}
              icon={Server}
            />
            <StatsCard
              title="Asset Types"
              value={assetTypeCount}
              description="Distinct categories"
              icon={Layers}
            />
            <StatsCard
              title="Repositories"
              value={reposTotal}
              change={
                reposWithFindings > 0 ? `${reposWithFindings} with findings` : 'None with findings'
              }
              changeType={reposWithFindings > 0 ? 'negative' : 'neutral'}
              icon={FolderGit2}
            />
            <StatsCard
              title="Active Teams"
              value={activeTeams}
              description="Derived from asset types"
              icon={Users}
            />
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Distribution by Type</CardTitle>
                <CardDescription>{totalAssets} total assets across all categories</CardDescription>
              </CardHeader>
              <CardContent>
                {assetDistribution.length > 0 ? (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(assetDistribution.length * 45, 200)}
                  >
                    <BarChart data={assetDistribution} layout="vertical" barCategoryGap="20%">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={120}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        name="Assets"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[250px] items-center justify-center">
                    <div className="text-center">
                      <CircleDot className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No asset data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Repository Coverage</CardTitle>
                  <CardDescription>Repositories with identified security findings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {reposWithFindings} of {reposTotal} repositories have findings
                      </span>
                      <span
                        className={cn(
                          'text-xl font-bold',
                          repoCoverage > 50
                            ? 'text-red-500'
                            : repoCoverage > 20
                              ? 'text-yellow-500'
                              : 'text-green-500'
                        )}
                      >
                        {repoCoverage}%
                      </span>
                    </div>
                    <Progress
                      value={repoCoverage}
                      className={cn(
                        'h-3',
                        repoCoverage > 50
                          ? '[&>div]:bg-red-500'
                          : repoCoverage > 20
                            ? '[&>div]:bg-yellow-500'
                            : '[&>div]:bg-green-500'
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">{reposTotal - reposWithFindings}</p>
                        <p className="text-xs text-muted-foreground">Clean repositories</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">{reposWithFindings}</p>
                        <p className="text-xs text-muted-foreground">With findings</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workload Insights</CardTitle>
                  <CardDescription>Distribution observations and recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workloadInsights.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="mt-0.5 shrink-0">{insightIcon[item.type]}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 text-xs capitalize', insightBadge[item.type])}
                        >
                          {item.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </Main>
  )
}
