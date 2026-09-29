'use client'

import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  AlertCircle,
  Layers,
  Network,
  Database,
  HardDrive,
  Key,
  Lock,
  History,
} from 'lucide-react'
import { useAttackSurfaceStats } from '@/features/attack-surface'
import { formatDistanceToNow } from 'date-fns'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Asset type to icon mapping. Icons stay muted: the type name carries the meaning.
const assetTypeIcons: Record<string, LucideIcon> = {
  domain: Globe,
  subdomain: Globe,
  website: Layers,
  service: Server,
  repository: GitBranch,
  cloud: Cloud,
  cloud_account: Cloud,
  host: Server,
  container: Layers,
  database: Database,
  network: Shield,
  storage: HardDrive,
  identity: Key,
  ip_address: Globe,
  certificate: Lock,
  kubernetes: Layers,
  application: Layers,
}

// Asset type display names
const assetTypeNames: Record<string, string> = {
  domain: 'Domains',
  subdomain: 'Subdomains',
  website: 'Websites',
  service: 'Services',
  repository: 'Repositories',
  cloud: 'Cloud assets',
  cloud_account: 'Cloud accounts',
  host: 'Hosts',
  container: 'Containers',
  database: 'Databases',
  network: 'Networks',
  storage: 'Storage',
  identity: 'Identities',
  ip_address: 'IP addresses',
  certificate: 'Certificates',
  kubernetes: 'Kubernetes',
  application: 'Applications',
  mobile: 'Mobile apps',
  serverless: 'Serverless',
}

// Helper function to format relative time
function formatRelativeTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  } catch {
    return timestamp
  }
}

/** "+3 this week" for the stat caption; nothing when there was no change. */
function weeklyChange(change: number): string | undefined {
  if (!change) return undefined
  return `${change > 0 ? '+' : ''}${change} this week`
}

function ListRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  )
}

export default function AttackSurfacePage() {
  const { stats, isLoading, error } = useAttackSurfaceStats()

  const breakdown = (stats?.assetBreakdown ?? []).filter((item) => item.total > 0)
  const exposed = stats?.exposedServicesList ?? []
  const changes = stats?.recentChanges ?? []
  const criticalExposures = stats?.criticalExposures || 0

  return (
    <Main>
      <PageHeader
        title="Attack surface"
        description="What your organization exposes, and how it changed this week."
      />

      {error && (
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load attack surface data</AlertTitle>
          <AlertDescription>Reload the page to try again.</AlertDescription>
        </Alert>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-xl" />
          ))
        ) : (
          <>
            <StatsCard
              title="Total assets"
              value={stats?.totalAssets || 0}
              icon={Layers}
              description={weeklyChange(stats?.totalAssetsChange || 0)}
            />
            <StatsCard
              title="Exposed services"
              value={stats?.exposedServices || 0}
              icon={Network}
              description={weeklyChange(stats?.exposedServicesChange || 0)}
            />
            <StatsCard
              title="Critical exposures"
              value={criticalExposures}
              icon={AlertTriangle}
              valueClassName={criticalExposures > 0 ? 'text-destructive' : undefined}
              description={weeklyChange(stats?.criticalExposuresChange || 0)}
            />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk score</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {Math.round(stats?.riskScore || 0)}
                  <span className="ms-1 text-xs font-normal text-muted-foreground">of 100</span>
                </div>
                <Progress value={stats?.riskScore || 0} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Asset breakdown</CardTitle>
            <CardDescription>Assets by type, with how many are exposed</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListRowsSkeleton rows={6} />
            ) : breakdown.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No assets yet"
                description="Assets appear here once discovery or an import adds them."
                card={false}
                className="py-8"
              />
            ) : (
              <div className="divide-y">
                {breakdown.map((item) => {
                  const TypeIcon = assetTypeIcons[item.type] || Server
                  return (
                    <div key={item.type} className="flex items-center justify-between py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {assetTypeNames[item.type] || item.type}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {item.exposed} exposed
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums">{item.total}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="text-base">Exposed services</CardTitle>
              <CardDescription>Publicly reachable services that need attention</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/attack-surface/external">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ListRowsSkeleton rows={5} />
            ) : exposed.length === 0 ? (
              <EmptyState
                icon={Network}
                title="No exposed services"
                description="Nothing publicly reachable has been discovered."
                card={false}
                className="py-8"
              />
            ) : (
              <div className="divide-y">
                {exposed.map((service) => (
                  <div key={service.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{service.name}</p>
                          {service.port && (
                            <span className="font-mono text-xs text-muted-foreground">
                              :{service.port}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {service.type} · {formatRelativeTime(service.lastSeen)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          service.findingCount > 0
                            ? 'font-medium text-destructive'
                            : 'text-muted-foreground'
                        )}
                      >
                        {service.findingCount} findings
                      </span>
                      <Badge
                        variant={service.exposure === 'public' ? 'destructive' : 'secondary'}
                        className="capitalize"
                      >
                        {service.exposure}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Recent changes</CardTitle>
          <CardDescription>Assets added, removed or modified</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListRowsSkeleton rows={5} />
          ) : changes.length === 0 ? (
            <EmptyState
              icon={History}
              title="No recent changes"
              description="The attack surface has not changed recently."
              card={false}
              className="py-8"
            />
          ) : (
            <div className="divide-y">
              {changes.map((change, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge
                      variant={change.type === 'added' ? 'secondary' : 'outline'}
                      className="w-20 justify-center capitalize"
                    >
                      {change.type}
                    </Badge>
                    <span className="truncate text-sm font-medium">{change.assetName}</span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(change.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Main>
  )
}
