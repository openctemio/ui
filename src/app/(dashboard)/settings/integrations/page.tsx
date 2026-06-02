'use client'

import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Puzzle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  AlertTriangle,
  Cloud,
  MessageSquare,
  GitBranch,
  Shield,
  Clock,
  ArrowRight,
  Workflow,
  TicketCheck,
  type LucideIcon,
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
    title: 'SCM Connections',
    description: 'Connect GitHub, GitLab, Bitbucket, or Azure DevOps',
    icon: GitBranch,
    href: '/settings/integrations/scm',
    color: 'bg-gray-500/10 text-gray-500',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Slack, Teams, Telegram, and Webhook alerts',
    icon: MessageSquare,
    href: '/settings/integrations/notifications',
    color: 'bg-green-500/10 text-green-500',
  },
  {
    id: 'cicd',
    title: 'CI/CD Pipelines',
    description: 'Integrate with Jenkins, GitHub Actions, GitLab CI',
    icon: Workflow,
    href: '/settings/integrations/cicd',
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'ticketing',
    title: 'Ticketing Systems',
    description: 'Connect Jira, ServiceNow, or Linear',
    icon: TicketCheck,
    href: '/settings/integrations/ticketing',
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    id: 'siem',
    title: 'SIEM & Monitoring',
    description: 'Export to Splunk, Datadog, or Elastic',
    icon: Shield,
    href: '/settings/integrations/siem',
    color: 'bg-orange-500/10 text-orange-500',
  },
]

// Per-category presentation + the sub-page that manages it.
const categoryMeta: Record<
  IntegrationCategory,
  { label: string; icon: LucideIcon; color: string; href: string }
> = {
  scm: {
    label: 'Source Control',
    icon: GitBranch,
    color: 'bg-gray-500/20 text-gray-400',
    href: '/settings/integrations/scm',
  },
  security: {
    label: 'Security',
    icon: Shield,
    color: 'bg-orange-500/20 text-orange-400',
    href: '/settings/integrations/siem',
  },
  ticketing: {
    label: 'Ticketing',
    icon: TicketCheck,
    color: 'bg-purple-500/20 text-purple-400',
    href: '/settings/integrations/ticketing',
  },
  cloud: {
    label: 'Cloud',
    icon: Cloud,
    color: 'bg-cyan-500/20 text-cyan-400',
    href: '/settings/integrations',
  },
  notification: {
    label: 'Notification',
    icon: MessageSquare,
    color: 'bg-blue-500/20 text-blue-400',
    href: '/settings/integrations/notifications',
  },
}

// Status badge styling for every IntegrationStatus the API can return.
const statusConfig: Record<
  string,
  { color: string; bgColor: string; icon: React.ReactNode; label: string }
> = {
  connected: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: <CheckCircle className="h-4 w-4" />,
    label: 'Connected',
  },
  disconnected: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: <XCircle className="h-4 w-4" />,
    label: 'Disconnected',
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: <XCircle className="h-4 w-4" />,
    label: 'Error',
  },
  pending: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: <RefreshCw className="h-4 w-4" />,
    label: 'Pending',
  },
  expired: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Expired',
  },
  disabled: {
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    icon: <XCircle className="h-4 w-4" />,
    label: 'Disabled',
  },
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-8 w-12" />
      </CardHeader>
    </Card>
  )
}

export default function IntegrationsPage() {
  const router = useRouter()
  const { data: scmConnectionsData } = useSCMConnections()
  const { data: integrationsData, isLoading } = useIntegrationsApi()

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

  // "Recently synced" feed derived from real last_sync_at timestamps.
  const recentlySynced = [...integrations]
    .filter((i) => i.last_sync_at)
    .sort((a, b) => (b.last_sync_at ?? '').localeCompare(a.last_sync_at ?? ''))
    .slice(0, 5)

  return (
    <>
      <Main>
        <PageHeader
          title="Integrations"
          description="Connect with third-party tools and services"
        />

        {/* Integration Categories */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {integrationCategories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(category.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.color}`}
                  >
                    <category.icon className="h-5 w-5" />
                  </div>
                  {category.id === 'scm' && scmConnections.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {scmConnectedCount}/{scmConnections.length}
                    </Badge>
                  )}
                </div>
                <div className="mt-3">
                  <h4 className="font-medium">{category.title}</h4>
                  <p className="text-muted-foreground mt-1 text-xs">{category.description}</p>
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full justify-between">
                  Manage
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats — derived from real integration status */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Puzzle className="h-4 w-4" />
                    Total Integrations
                  </CardDescription>
                  <CardTitle className="text-3xl">{integrations.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Connected
                  </CardDescription>
                  <CardTitle className="text-3xl text-green-500">{connectedCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Needs Attention
                  </CardDescription>
                  <CardTitle className="text-3xl text-amber-500">{needsAttentionCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
                  </CardDescription>
                  <CardTitle className="text-3xl text-blue-500">{pendingCount}</CardTitle>
                </CardHeader>
              </Card>
            </>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Recently Synced — real last_sync_at activity */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Recently Synced</CardTitle>
              <CardDescription>Latest integration sync activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : recentlySynced.length > 0 ? (
                recentlySynced.map((integration) => (
                  <div key={integration.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {integration.name}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {integration.last_sync_at
                          ? new Date(integration.last_sync_at).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm capitalize">
                      {categoryMeta[integration.category]?.label ?? integration.category} ·{' '}
                      {statusConfig[integration.status]?.label ?? integration.status}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={RefreshCw}
                  title="No sync activity yet"
                  description="Connected integrations will show their latest syncs here."
                  card={false}
                />
              )}
            </CardContent>
          </Card>

          {/* Configured Integrations — real connections */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Configured Integrations</CardTitle>
                  <CardDescription>Your connections and their status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : integrations.length === 0 ? (
                <EmptyState
                  icon={Puzzle}
                  title="No integrations configured yet"
                  description="Use the categories above to connect your first tool."
                  card={false}
                />
              ) : (
                <div className="space-y-3">
                  {integrations.map((integration) => {
                    const status = statusConfig[integration.status] ?? statusConfig.disconnected
                    const meta = categoryMeta[integration.category]
                    const CategoryIcon = meta?.icon ?? Puzzle
                    return (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                            <CategoryIcon className="text-primary h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-medium">{integration.name}</h4>
                              <Badge className={`${meta?.color ?? ''} border-0 text-xs`}>
                                {meta?.label ?? integration.category}
                              </Badge>
                            </div>
                            {integration.description && (
                              <p className="text-muted-foreground text-xs">
                                {integration.description}
                              </p>
                            )}
                            {integration.sync_error || integration.status_message ? (
                              <p className="mt-1 text-xs text-red-400">
                                {integration.sync_error || integration.status_message}
                              </p>
                            ) : integration.last_sync_at ? (
                              <p className="text-muted-foreground mt-1 text-xs">
                                Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.bgColor} ${status.color} border-0`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                          <Can permission={Permission.IntegrationsRead} mode="hide">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(meta?.href ?? '/settings/integrations')}
                            >
                              Manage
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          </Can>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add more — real category entry points */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Add an Integration</CardTitle>
            <CardDescription>
              Connect more tools to enhance your security operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {integrationCategories.map((category) => (
                <Card
                  key={category.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(category.href)}
                >
                  <CardContent className="p-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.color}`}
                    >
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3">
                      <h4 className="font-medium">{category.title}</h4>
                      <p className="text-muted-foreground mt-1 text-xs">{category.description}</p>
                    </div>
                    <Can permission={Permission.IntegrationsManage} mode="disable">
                      <Button variant="outline" size="sm" className="mt-3 w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                    </Can>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
