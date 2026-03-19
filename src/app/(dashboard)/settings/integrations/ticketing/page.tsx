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
import { Progress } from '@/components/ui/progress'
import {
  Ticket,
  Plus,
  Clock,
  ArrowLeftRight,
  Settings,
  AlertTriangle,
  FileText,
  RefreshCw,
  Link2,
} from 'lucide-react'

interface TicketingConnection {
  id: string
  name: string
  platform: string
  project: string
  status: 'connected' | 'disconnected' | 'error'
  syncDirection: 'one-way' | 'bi-directional'
  ticketsCreated: number
  ticketsSynced: number
  lastSync: string | null
}

const PLACEHOLDER_CONNECTIONS: TicketingConnection[] = [
  {
    id: '1',
    name: 'Security Remediation Board',
    platform: 'Jira Cloud',
    project: 'SEC',
    status: 'connected',
    syncDirection: 'bi-directional',
    ticketsCreated: 287,
    ticketsSynced: 245,
    lastSync: '2026-03-06T10:45:00Z',
  },
  {
    id: '2',
    name: 'Incident Management',
    platform: 'ServiceNow',
    project: 'INC',
    status: 'connected',
    syncDirection: 'one-way',
    ticketsCreated: 56,
    ticketsSynced: 56,
    lastSync: '2026-03-06T09:30:00Z',
  },
  {
    id: '3',
    name: 'DevOps Backlog',
    platform: 'Azure DevOps',
    project: 'Platform',
    status: 'disconnected',
    syncDirection: 'one-way',
    ticketsCreated: 0,
    ticketsSynced: 0,
    lastSync: null,
  },
]

function ConnectionBadge({ status }: { status: TicketingConnection['status'] }) {
  const config: Record<string, { className: string; label: string }> = {
    connected: {
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
      label: 'Connected',
    },
    disconnected: { className: 'bg-muted text-muted-foreground', label: 'Not Connected' },
    error: { className: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Error' },
  }
  const { className, label } = config[status]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

function TicketingConnectionCard({ connection }: { connection: TicketingConnection }) {
  const syncRate =
    connection.ticketsCreated > 0
      ? Math.round((connection.ticketsSynced / connection.ticketsCreated) * 100)
      : 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{connection.name}</h3>
              <ConnectionBadge status={connection.status} />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                {connection.platform}
              </Badge>
              <span className="text-muted-foreground text-xs">Project: {connection.project}</span>
              <Badge variant="outline" className="text-xs">
                <ArrowLeftRight className="mr-1 h-3 w-3" />
                {connection.syncDirection === 'bi-directional' ? 'Bi-directional' : 'One-way'}
              </Badge>
            </div>
            {connection.ticketsCreated > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    {connection.ticketsSynced} / {connection.ticketsCreated} tickets synced
                  </span>
                  <span className="text-muted-foreground text-xs">{syncRate}%</span>
                </div>
                <Progress value={syncRate} className="h-1.5" />
              </div>
            )}
            {connection.lastSync && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Last sync: {new Date(connection.lastSync).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {connection.status === 'connected' && (
              <Button variant="outline" size="sm" disabled title="Sync now">
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync
              </Button>
            )}
            <Button variant="outline" size="sm" disabled title="Configure">
              <Settings className="mr-2 h-4 w-4" />
              Configure
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
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
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
        <Ticket className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-1 text-lg font-semibold">No Ticketing Systems Connected</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Connect a ticketing system to automatically create and track remediation tickets.
        </p>
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Connect Ticketing System
        </Button>
      </CardContent>
    </Card>
  )
}

export default function TicketingIntegrationPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const summaryStats = useMemo(() => {
    const connected = PLACEHOLDER_CONNECTIONS.filter((c) => c.status === 'connected').length
    const totalCreated = PLACEHOLDER_CONNECTIONS.reduce((s, c) => s + c.ticketsCreated, 0)
    const totalSynced = PLACEHOLDER_CONNECTIONS.reduce((s, c) => s + c.ticketsSynced, 0)
    const biDirectional = PLACEHOLDER_CONNECTIONS.filter(
      (c) => c.syncDirection === 'bi-directional'
    ).length
    return {
      connected,
      totalCreated,
      totalSynced,
      biDirectional,
      total: PLACEHOLDER_CONNECTIONS.length,
    }
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader
        title="Ticketing Integration"
        description="Connect with ticketing systems for automated remediation tracking"
      >
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Connected Systems"
          value={summaryStats.connected}
          icon={Link2}
          changeType="positive"
          description={`of ${summaryStats.total} configured`}
        />
        <StatsCard
          title="Tickets Created"
          value={summaryStats.totalCreated}
          icon={FileText}
          description="Auto-generated tickets"
        />
        <StatsCard
          title="Tickets Synced"
          value={summaryStats.totalSynced}
          icon={RefreshCw}
          description="Status synchronized"
        />
        <StatsCard
          title="Overdue Findings"
          value={stats.findings.overdue}
          icon={AlertTriangle}
          changeType={stats.findings.overdue > 0 ? 'negative' : 'neutral'}
          description="Pending remediation"
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Ticketing Connections</h2>
        {PLACEHOLDER_CONNECTIONS.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {PLACEHOLDER_CONNECTIONS.map((conn) => (
              <TicketingConnectionCard key={conn.id} connection={conn} />
            ))}
          </div>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto-Ticketing Rules
          </CardTitle>
          <CardDescription>
            Configure rules for automatic ticket creation based on finding severity and type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                rule: 'Critical findings',
                desc: 'Automatically create tickets for all critical severity findings',
                enabled: true,
              },
              {
                rule: 'High findings (production)',
                desc: 'Create tickets for high severity findings on production assets',
                enabled: true,
              },
              {
                rule: 'SLA breach warning',
                desc: 'Create tickets when findings approach SLA deadline',
                enabled: false,
              },
              {
                rule: 'New exposure detected',
                desc: 'Create tickets when new external exposures are discovered',
                enabled: true,
              },
              {
                rule: 'Compliance violations',
                desc: 'Create tickets for compliance framework violations',
                enabled: false,
              },
            ].map((item) => (
              <div
                key={item.rule}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Ticket className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm font-medium">{item.rule}</span>
                    <Badge variant={item.enabled ? 'default' : 'secondary'} className="text-xs">
                      {item.enabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 pl-6 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}
