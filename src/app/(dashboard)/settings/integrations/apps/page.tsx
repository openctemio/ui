'use client'

import { useMemo } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Puzzle,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  ExternalLink,
  Unplug,
  Zap,
  Clock,
} from 'lucide-react'

interface ConnectedApp {
  id: string
  name: string
  description: string
  category: string
  status: 'connected' | 'disconnected' | 'error'
  lastSync: string | null
  dataPoints: number
}

const PLACEHOLDER_APPS: ConnectedApp[] = [
  {
    id: '1',
    name: 'GitHub',
    description: 'Repository scanning and code analysis integration',
    category: 'Source Control',
    status: 'connected',
    lastSync: '2026-03-06T10:30:00Z',
    dataPoints: 1247,
  },
  {
    id: '2',
    name: 'AWS Security Hub',
    description: 'Cloud security posture and compliance findings',
    category: 'Cloud Security',
    status: 'connected',
    lastSync: '2026-03-06T09:15:00Z',
    dataPoints: 832,
  },
  {
    id: '3',
    name: 'Snyk',
    description: 'Open source dependency vulnerability scanning',
    category: 'Vulnerability Scanner',
    status: 'error',
    lastSync: '2026-03-04T14:00:00Z',
    dataPoints: 456,
  },
  {
    id: '4',
    name: 'Qualys',
    description: 'Network and infrastructure vulnerability scanning',
    category: 'Vulnerability Scanner',
    status: 'disconnected',
    lastSync: null,
    dataPoints: 0,
  },
]

function ConnectionStatusBadge({ status }: { status: ConnectedApp['status'] }) {
  const config: Record<string, { className: string; label: string }> = {
    connected: {
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
      label: 'Connected',
    },
    disconnected: {
      className: 'bg-muted text-muted-foreground',
      label: 'Not Connected',
    },
    error: {
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
      label: 'Error',
    },
  }
  const { className, label } = config[status]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

function AppCard({ app }: { app: ConnectedApp }) {
  const statusIcon =
    app.status === 'connected' ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : app.status === 'error' ? (
      <XCircle className="h-5 w-5 text-red-500" />
    ) : (
      <Unplug className="text-muted-foreground h-5 w-5" />
    )

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {statusIcon}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{app.name}</h3>
                <ConnectionStatusBadge status={app.status} />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">{app.description}</p>
              <div className="mt-2 flex items-center gap-3">
                <Badge variant="secondary" className="text-xs">
                  {app.category}
                </Badge>
                {app.lastSync && (
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    Last sync: {new Date(app.lastSync).toLocaleDateString()}
                  </span>
                )}
                {app.dataPoints > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {app.dataPoints.toLocaleString()} data points
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {app.status === 'connected' && (
              <Button variant="outline" size="sm" disabled title="Sync now">
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync
              </Button>
            )}
            <Button variant="outline" size="sm" disabled title="Settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
    </Main>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Puzzle className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-1 text-lg font-semibold">No Connected Apps</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Connect your first third-party application to start importing data.
        </p>
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Browse Integrations
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ConnectedAppsPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const summaryStats = useMemo(() => {
    const connected = PLACEHOLDER_APPS.filter((a) => a.status === 'connected').length
    const errored = PLACEHOLDER_APPS.filter((a) => a.status === 'error').length
    const totalDataPoints = PLACEHOLDER_APPS.reduce((sum, a) => sum + a.dataPoints, 0)
    return { connected, errored, totalDataPoints, total: PLACEHOLDER_APPS.length }
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader title="Connected Apps" description="Manage third-party application integrations">
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Integration
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Connected Apps"
          value={summaryStats.connected}
          icon={CheckCircle}
          changeType="positive"
          description={`of ${summaryStats.total} available`}
        />
        <StatsCard
          title="Connection Errors"
          value={summaryStats.errored}
          icon={XCircle}
          changeType={summaryStats.errored > 0 ? 'negative' : 'neutral'}
          description="Need attention"
        />
        <StatsCard
          title="Data Points Synced"
          value={summaryStats.totalDataPoints.toLocaleString()}
          icon={Zap}
          description="Across all integrations"
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Installed Integrations</h2>
        {PLACEHOLDER_APPS.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {PLACEHOLDER_APPS.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Integration Marketplace
          </CardTitle>
          <CardDescription>
            Browse available integrations to connect your security tools, cloud providers, and
            development platforms. Data from connected apps is automatically normalized and
            correlated with your existing assets and findings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Vulnerability Scanners',
              'Cloud Providers',
              'Source Control',
              'CI/CD Platforms',
              'SIEM/SOAR',
              'Ticketing Systems',
            ].map((category) => (
              <div
                key={category}
                className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3"
              >
                <Puzzle className="text-muted-foreground h-4 w-4" />
                <span className="text-sm">{category}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}
