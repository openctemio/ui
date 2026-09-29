'use client'

import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  DataTable,
  EmptyState,
  ErrorState,
  MetricStrip,
  PageHeader,
  RelativeTime,
  StackedCell,
  type MetricStripItem,
} from '@/features/shared'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Puzzle,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  GitBranch,
  Shield,
  ShieldCheck,
  ArrowRight,
  Workflow,
  TicketCheck,
  KeyRound,
} from 'lucide-react'
import { Can, Permission } from '@/lib/permissions'
import { useSCMConnections } from '@/features/repositories/hooks/use-repositories'
import type { SCMConnection } from '@/features/repositories/types/repository.types'
import { useIntegrationsApi } from '@/features/integrations/api'
import type {
  Integration,
  IntegrationCategory,
} from '@/features/integrations/types/integration.types'

// Integration categories for quick access — these are real navigation cards to
// the management sub-pages, which own the actual connect/configure flows.
const integrationCategories = [
  {
    id: 'scm',
    title: 'SCM connections',
    description: 'Connect GitHub, GitLab, Bitbucket, or Azure DevOps',
    icon: GitBranch,
    href: '/settings/integrations/scm',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Slack, Teams, Telegram, and webhook alerts',
    icon: MessageSquare,
    href: '/settings/integrations/notifications',
  },
  {
    id: 'cicd',
    title: 'CI/CD pipelines',
    description: 'Integrate with Jenkins, GitHub Actions, GitLab CI',
    icon: Workflow,
    href: '/settings/integrations/cicd',
  },
  {
    id: 'ticketing',
    title: 'Ticketing systems',
    description: 'Connect Jira, ServiceNow, or Linear',
    icon: TicketCheck,
    href: '/settings/integrations/ticketing',
  },
  {
    id: 'api-keys',
    title: 'API keys',
    description: 'Issue and revoke programmatic access keys',
    icon: KeyRound,
    href: '/settings/integrations/api-keys',
  },
  {
    id: 'security',
    title: 'Vulnerability scanners',
    description: 'Connect Tenable (Nessus Pro / Tenable.sc)',
    icon: ShieldCheck,
    href: '/settings/integrations/security',
  },
  {
    id: 'siem',
    title: 'SIEM',
    description: 'Forward security events to Splunk',
    icon: Shield,
    href: '/settings/integrations/siem',
  },
]

// Per-category label + the sub-page that manages it.
const categoryMeta: Record<IntegrationCategory, { label: string; href: string }> = {
  scm: { label: 'Source control', href: '/settings/integrations/scm' },
  security: { label: 'Security', href: '/settings/integrations/security' },
  ticketing: { label: 'Ticketing', href: '/settings/integrations/ticketing' },
  cloud: { label: 'Cloud', href: '/settings/integrations' },
  notification: { label: 'Notification', href: '/settings/integrations/notifications' },
}

// Status badge for every IntegrationStatus the API can return. Only a problem
// (error / expired) is coloured; everything else stays neutral.
const statusConfig: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: typeof CheckCircle
    label: string
  }
> = {
  connected: { variant: 'default', icon: CheckCircle, label: 'Connected' },
  disconnected: { variant: 'secondary', icon: XCircle, label: 'Disconnected' },
  error: { variant: 'destructive', icon: XCircle, label: 'Error' },
  pending: { variant: 'outline', icon: RefreshCw, label: 'Pending' },
  expired: { variant: 'destructive', icon: AlertTriangle, label: 'Expired' },
  disabled: { variant: 'secondary', icon: XCircle, label: 'Disabled' },
}

const columns: ColumnDef<Integration>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const i = row.original
      const problem = i.sync_error || i.status_message
      return (
        <StackedCell
          primary={i.name}
          secondary={problem ? <span className="text-destructive">{problem}</span> : i.description}
          truncate
        />
      )
    },
  },
  {
    id: 'category',
    header: 'Category',
    accessorFn: (i) => categoryMeta[i.category]?.label ?? i.category,
    cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = statusConfig[row.original.status] ?? statusConfig.disconnected
      return (
        <Badge variant={s.variant} className="gap-1">
          <s.icon className="h-3 w-3" />
          {s.label}
        </Badge>
      )
    },
  },
  {
    id: 'last_sync',
    header: 'Last sync',
    accessorFn: (i) => i.last_sync_at ?? '',
    cell: ({ row }) => <RelativeTime date={row.original.last_sync_at} />,
  },
  {
    id: 'actions',
    enableSorting: false,
    cell: ({ row }) => (
      <Can permission={Permission.IntegrationsRead} mode="hide">
        <Button variant="ghost" size="sm" asChild>
          <Link href={categoryMeta[row.original.category]?.href ?? '/settings/integrations'}>
            Manage
            <ArrowRight className="ms-1 h-4 w-4" />
          </Link>
        </Button>
      </Can>
    ),
  },
]

export default function IntegrationsPage() {
  const { data: scmConnectionsData } = useSCMConnections()
  const { data: integrationsData, error, isLoading, mutate } = useIntegrationsApi()

  // SCM connections power the per-category badge on the SCM card.
  const scmConnections: SCMConnection[] = Array.isArray(scmConnectionsData)
    ? scmConnectionsData
    : ((scmConnectionsData as unknown as { data?: SCMConnection[] })?.data ?? [])
  const scmConnectedCount = scmConnections.filter((c) => c.status === 'connected').length

  // All configured integrations across every category (real data).
  const integrations: Integration[] = integrationsData?.data ?? []
  const connectedCount = integrations.filter((i) => i.status === 'connected').length
  const needsAttentionCount = integrations.filter(
    (i) => i.status === 'error' || i.status === 'expired'
  ).length
  const pendingCount = integrations.filter(
    (i) => i.status === 'pending' || i.status === 'disconnected'
  ).length

  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Total integrations', value: integrations.length },
    { key: 'connected', label: 'Connected', value: connectedCount },
    {
      key: 'attention',
      label: 'Needs attention',
      value: needsAttentionCount,
      tone: 'danger',
    },
    { key: 'pending', label: 'Pending', value: pendingCount },
  ]

  return (
    <Main>
      <PageHeader
        title="Integrations"
        description="Connect third-party tools and services to your security workflows."
      />

      {/* Categories — navigation to the pages that own each connect flow */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {integrationCategories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardContent className="flex items-start gap-3 p-4">
                <category.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{category.title}</span>
                    {category.id === 'scm' && scmConnections.length > 0 && (
                      <Badge variant="secondary" className="tabular-nums">
                        {scmConnectedCount}/{scmConnections.length}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{category.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

      <div className="mt-5">
        {error ? (
          <ErrorState title="integrations" error={error} onRetry={() => void mutate()} />
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : integrations.length === 0 ? (
          <EmptyState
            icon={Puzzle}
            title="No integrations configured yet"
            description="Pick a category above to connect your first tool."
          />
        ) : (
          <DataTable
            columns={columns}
            data={integrations}
            getRowId={(i) => i.id}
            searchPlaceholder="Search integrations..."
            showSelectionCount={false}
          />
        )}
      </div>
    </Main>
  )
}
