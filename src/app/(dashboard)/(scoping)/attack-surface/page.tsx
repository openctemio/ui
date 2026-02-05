'use client'

import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Globe,
  Server,
  Cloud,
  GitBranch,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  Network,
  Eye,
  Database,
} from 'lucide-react'
import { useAttackSurfaceStats } from '@/features/attack-surface'
import { formatDistanceToNow } from 'date-fns'
import { LucideIcon } from 'lucide-react'

// Asset type to icon mapping
const assetTypeIcons: Record<string, { icon: LucideIcon; color: string }> = {
  domain: { icon: Globe, color: 'text-blue-400' },
  website: { icon: Layers, color: 'text-purple-400' },
  service: { icon: Server, color: 'text-green-400' },
  repository: { icon: GitBranch, color: 'text-orange-400' },
  cloud: { icon: Cloud, color: 'text-cyan-400' },
  server: { icon: Database, color: 'text-pink-400' },
}

// Asset type display names
const assetTypeNames: Record<string, string> = {
  domain: 'Domains',
  website: 'Websites',
  service: 'Services',
  repository: 'Repositories',
  cloud: 'Cloud Assets',
  server: 'Servers',
}

// Risk/criticality config for styling
const riskConfig: Record<string, { color: string; bgColor: string }> = {
  critical: { color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  medium: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  low: { color: 'text-green-400', bgColor: 'bg-green-500/20' },
}

// Helper function to format relative time
function formatRelativeTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  } catch {
    return timestamp
  }
}

export default function AttackSurfacePage() {
  const { stats, isLoading, error } = useAttackSurfaceStats()

  // Render trend indicator
  const renderTrend = (change: number, invertColors = false) => {
    if (change === 0) return null
    const isPositive = change > 0
    const TrendIcon = isPositive ? TrendingUp : TrendingDown
    // For exposures, positive change is bad (red), negative is good (green)
    // For total assets, positive is usually neutral/good
    const colorClass = invertColors
      ? isPositive
        ? 'text-red-400'
        : 'text-green-400'
      : isPositive
        ? 'text-green-400'
        : 'text-red-400'

    return (
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <TrendIcon className={`h-3 w-3 ${colorClass}`} />
        <span>
          {isPositive ? '+' : ''}
          {change} this week
        </span>
      </div>
    )
  }

  return (
    <>
      <Main>
        <PageHeader
          title="Attack Surface Overview"
          description="Visualize and monitor your organization's external attack surface"
        />

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            Failed to load attack surface data. Please try again.
          </div>
        )}

        {/* Top Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Total Assets
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <CardTitle className="text-3xl">{stats?.totalAssets || 0}</CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                renderTrend(stats?.totalAssetsChange || 0)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Exposed Services
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <CardTitle className="text-3xl text-yellow-500">
                  {stats?.exposedServices || 0}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                renderTrend(stats?.exposedServicesChange || 0, true)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Critical Exposures
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <CardTitle className="text-3xl text-red-500">
                  {stats?.criticalExposures || 0}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                renderTrend(stats?.criticalExposuresChange || 0, true)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Risk Score
              </CardDescription>
              {isLoading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <CardTitle className="text-3xl text-orange-500">
                  {Math.round(stats?.riskScore || 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-2 w-full" />
              ) : (
                <Progress value={stats?.riskScore || 0} className="h-2" />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Asset Breakdown */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Asset Breakdown</CardTitle>
              <CardDescription>Distribution by type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <div>
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-10" />
                    </div>
                  ))
                : stats?.assetBreakdown?.map((item) => {
                    const typeConfig = assetTypeIcons[item.type] || {
                      icon: Server,
                      color: 'text-gray-400',
                    }
                    const TypeIcon = typeConfig.icon
                    return (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={typeConfig.color}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {assetTypeNames[item.type] || item.type}
                            </p>
                            <p className="text-muted-foreground text-xs">{item.exposed} exposed</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{item.total}</Badge>
                      </div>
                    )
                  })}
              {!isLoading && (!stats?.assetBreakdown || stats.assetBreakdown.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-4">No assets found</p>
              )}
            </CardContent>
          </Card>

          {/* Exposed Services */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Exposed Services</CardTitle>
                  <CardDescription>
                    Publicly accessible services requiring attention
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-40 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    ))
                  : stats?.exposedServicesList?.map((service) => {
                      const risk = riskConfig[service.criticality] || riskConfig.medium
                      return (
                        <div
                          key={service.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-2 ${risk.bgColor}`}>
                              <Server className={`h-4 w-4 ${risk.color}`} />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium">{service.name}</p>
                                {service.port && (
                                  <Badge variant="outline" className="text-xs">
                                    :{service.port}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground text-xs">
                                {service.type} - {formatRelativeTime(service.lastSeen)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={`${risk.bgColor} ${risk.color} border-0`}>
                              {service.findingCount} findings
                            </Badge>
                            <Badge
                              variant={service.exposure === 'public' ? 'destructive' : 'secondary'}
                              className="text-xs capitalize"
                            >
                              {service.exposure}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                {!isLoading &&
                  (!stats?.exposedServicesList || stats.exposedServicesList.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No exposed services found
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Changes */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Recent Attack Surface Changes</CardTitle>
            <CardDescription>Assets added, removed, or modified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ))
                : stats?.recentChanges?.map((change, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            change.type === 'added'
                              ? 'bg-green-500/20 text-green-400 border-0'
                              : change.type === 'removed'
                                ? 'bg-red-500/20 text-red-400 border-0'
                                : 'bg-yellow-500/20 text-yellow-400 border-0'
                          }
                        >
                          {change.type}
                        </Badge>
                        <span className="text-sm font-medium">{change.assetName}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(change.timestamp)}
                      </span>
                    </div>
                  ))}
              {!isLoading && (!stats?.recentChanges || stats.recentChanges.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-4">No recent changes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
