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
import {
  Shield,
  Plus,
  Activity,
  Send,
  Settings,
  Clock,
  ArrowRight,
  Database,
  Layers,
  AlertTriangle,
} from 'lucide-react'

interface SiemConnection {
  id: string
  name: string
  platform: string
  status: 'connected' | 'disconnected' | 'error'
  eventsForwarded: number
  lastEvent: string | null
  protocol: string
}

const PLACEHOLDER_CONNECTIONS: SiemConnection[] = [
  {
    id: '1',
    name: 'Production SIEM',
    platform: 'Splunk Enterprise',
    status: 'connected',
    eventsForwarded: 24830,
    lastEvent: '2026-03-06T11:02:00Z',
    protocol: 'Syslog (TLS)',
  },
  {
    id: '2',
    name: 'Cloud SIEM',
    platform: 'Microsoft Sentinel',
    status: 'connected',
    eventsForwarded: 15420,
    lastEvent: '2026-03-06T10:58:00Z',
    protocol: 'REST API',
  },
  {
    id: '3',
    name: 'SOAR Platform',
    platform: 'Palo Alto XSOAR',
    status: 'disconnected',
    eventsForwarded: 0,
    lastEvent: null,
    protocol: 'Webhook',
  },
]

function ConnectionStatusIndicator({ status }: { status: SiemConnection['status'] }) {
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

function SiemConnectionCard({ connection }: { connection: SiemConnection }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{connection.name}</h3>
              <ConnectionStatusIndicator status={connection.status} />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs">
                {connection.platform}
              </Badge>
              <span className="text-muted-foreground text-xs">{connection.protocol}</span>
            </div>
            <div className="flex items-center gap-4">
              {connection.eventsForwarded > 0 && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Send className="h-3 w-3" />
                  {connection.eventsForwarded.toLocaleString()} events forwarded
                </span>
              )}
              {connection.lastEvent && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  Last: {new Date(connection.lastEvent).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" disabled title="Configure">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </Main>
  )
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Shield className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-1 text-lg font-semibold">No SIEM Connections</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Connect your SIEM/SOAR platform to forward security events and enable automated response.
        </p>
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add SIEM Connection
        </Button>
      </CardContent>
    </Card>
  )
}

export default function SIEMIntegrationPage() {
  const { currentTenant } = useTenant()
  const { stats, isLoading } = useDashboardStats(currentTenant?.id || null)

  const summaryStats = useMemo(() => {
    const connected = PLACEHOLDER_CONNECTIONS.filter((c) => c.status === 'connected').length
    const totalEvents = PLACEHOLDER_CONNECTIONS.reduce((s, c) => s + c.eventsForwarded, 0)
    return { connected, totalEvents, total: PLACEHOLDER_CONNECTIONS.length }
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <Main>
      <PageHeader
        title="SIEM Integration"
        description="Connect with Security Information and Event Management systems"
      >
        <Button size="sm" disabled>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Active Connections"
          value={summaryStats.connected}
          icon={Activity}
          changeType="positive"
          description={`of ${summaryStats.total} configured`}
        />
        <StatsCard
          title="Events Forwarded"
          value={summaryStats.totalEvents.toLocaleString()}
          icon={Send}
          description="Total events sent"
        />
        <StatsCard
          title="Findings Detected"
          value={stats.findings.total}
          icon={AlertTriangle}
          description="Available for forwarding"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            SIEM/SOAR Connections
          </CardTitle>
          <CardDescription>
            Forward security findings, asset changes, and scan results to your SIEM or SOAR platform
            for centralized monitoring and automated incident response.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {PLACEHOLDER_CONNECTIONS.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {PLACEHOLDER_CONNECTIONS.map((conn) => (
                <SiemConnectionCard key={conn.id} connection={conn} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Event Forwarding Configuration
          </CardTitle>
          <CardDescription>
            Configure which events are forwarded to your SIEM systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                event: 'New Critical/High Findings',
                desc: 'Forward when new critical or high severity findings are detected',
                enabled: true,
              },
              {
                event: 'Scan Completions',
                desc: 'Forward scan completion events with summary results',
                enabled: true,
              },
              {
                event: 'Asset Discovery',
                desc: 'Forward new asset discovery and change events',
                enabled: false,
              },
              {
                event: 'Policy Violations',
                desc: 'Forward security policy violation events',
                enabled: true,
              },
              {
                event: 'SLA Breaches',
                desc: 'Forward when remediation SLA deadlines are exceeded',
                enabled: false,
              },
            ].map((rule) => (
              <div
                key={rule.event}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm font-medium">{rule.event}</span>
                    <Badge variant={rule.enabled ? 'default' : 'secondary'} className="text-xs">
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5 pl-6 text-xs">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Main>
  )
}
