'use client'

import { useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Puzzle,
  CheckCircle,
  XCircle,
  Settings,
  Plus,
  RefreshCw,
  AlertTriangle,
  Cloud,
  MessageSquare,
  GitBranch,
  Shield,
  Database,
  Mail,
  Key,
  Webhook,
  ArrowRight,
  Workflow,
  TicketCheck,
} from 'lucide-react'
import { Can, Permission } from '@/lib/permissions'
import { useSCMConnections } from '@/features/repositories/hooks/use-repositories'
import type { SCMConnection } from '@/features/repositories/types/repository.types'

// Integration categories for quick access
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

// Mock data for integrations
const integrationStats = {
  total: 15,
  connected: 8,
  available: 7,
  syncsToday: 124,
}

const connectedIntegrations = [
  {
    id: 'int-001',
    name: 'Jira',
    category: 'Ticketing',
    icon: GitBranch,
    status: 'connected',
    lastSync: '5 mins ago',
    syncCount: 45,
    description: 'Sync findings and create tickets automatically',
  },
  {
    id: 'int-002',
    name: 'Slack',
    category: 'Communication',
    icon: MessageSquare,
    status: 'connected',
    lastSync: '2 mins ago',
    syncCount: 156,
    description: 'Real-time alerts and notifications',
  },
  {
    id: 'int-003',
    name: 'Splunk',
    category: 'SIEM',
    icon: Shield,
    status: 'connected',
    lastSync: '10 mins ago',
    syncCount: 1240,
    description: 'Export findings to Splunk for correlation',
  },
  {
    id: 'int-004',
    name: 'AWS',
    category: 'Cloud',
    icon: Cloud,
    status: 'connected',
    lastSync: '1 hour ago',
    syncCount: 89,
    description: 'Scan AWS resources and assets',
  },
  {
    id: 'int-005',
    name: 'GitHub',
    category: 'Source Control',
    icon: GitBranch,
    status: 'error',
    lastSync: 'Failed',
    syncCount: 0,
    description: 'Scan repositories for secrets and vulnerabilities',
    error: 'Authentication token expired',
  },
  {
    id: 'int-006',
    name: 'PagerDuty',
    category: 'Incident Response',
    icon: AlertTriangle,
    status: 'connected',
    lastSync: '30 mins ago',
    syncCount: 12,
    description: 'Trigger incidents for critical findings',
  },
  {
    id: 'int-007',
    name: 'ServiceNow',
    category: 'ITSM',
    icon: Database,
    status: 'connected',
    lastSync: '15 mins ago',
    syncCount: 38,
    description: 'Create and sync change requests',
  },
  {
    id: 'int-008',
    name: 'Microsoft 365',
    category: 'Email',
    icon: Mail,
    status: 'connected',
    lastSync: '1 hour ago',
    syncCount: 24,
    description: 'Send report emails and notifications',
  },
]

const availableIntegrations = [
  {
    id: 'avl-001',
    name: 'Azure',
    category: 'Cloud',
    icon: Cloud,
    description: 'Scan Azure resources and services',
    popular: true,
  },
  {
    id: 'avl-002',
    name: 'Google Cloud',
    category: 'Cloud',
    icon: Cloud,
    description: 'Scan GCP projects and assets',
    popular: true,
  },
  {
    id: 'avl-003',
    name: 'Qualys',
    category: 'Vulnerability Scanner',
    icon: Shield,
    description: 'Import vulnerability scan results',
    popular: false,
  },
  {
    id: 'avl-004',
    name: 'Tenable',
    category: 'Vulnerability Scanner',
    icon: Shield,
    description: 'Sync Nessus/Tenable.io findings',
    popular: true,
  },
  {
    id: 'avl-005',
    name: 'Okta',
    category: 'Identity',
    icon: Key,
    description: 'Single sign-on and user sync',
    popular: false,
  },
  {
    id: 'avl-006',
    name: 'Webhooks',
    category: 'Custom',
    icon: Webhook,
    description: 'Send data to custom endpoints',
    popular: false,
  },
  {
    id: 'avl-007',
    name: 'Teams',
    category: 'Communication',
    icon: MessageSquare,
    description: 'Microsoft Teams notifications',
    popular: true,
  },
]

const recentEvents = [
  { integration: 'Slack', event: 'Alert sent for critical finding', time: '2 mins ago' },
  { integration: 'Splunk', event: '1,240 events exported', time: '10 mins ago' },
  { integration: 'Jira', event: 'Ticket VULN-1234 created', time: '15 mins ago' },
  { integration: 'AWS', event: 'Asset scan completed', time: '1 hour ago' },
  { integration: 'GitHub', event: 'Authentication failed', time: '2 hours ago' },
]

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  connected: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: <XCircle className="h-4 w-4" />,
  },
  syncing: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
  },
}

const categoryColors: Record<string, string> = {
  Ticketing: 'bg-purple-500/20 text-purple-400',
  Communication: 'bg-blue-500/20 text-blue-400',
  SIEM: 'bg-orange-500/20 text-orange-400',
  Cloud: 'bg-cyan-500/20 text-cyan-400',
  'Source Control': 'bg-gray-500/20 text-gray-400',
  'Incident Response': 'bg-red-500/20 text-red-400',
  ITSM: 'bg-green-500/20 text-green-400',
  Email: 'bg-yellow-500/20 text-yellow-400',
  'Vulnerability Scanner': 'bg-pink-500/20 text-pink-400',
  Identity: 'bg-indigo-500/20 text-indigo-400',
  Custom: 'bg-gray-500/20 text-gray-400',
}

export default function IntegrationsPage() {
  const router = useRouter()
  const { data: scmConnectionsData } = useSCMConnections()

  // Get SCM connections count
  const scmConnections: SCMConnection[] = Array.isArray(scmConnectionsData)
    ? scmConnectionsData
    : ((scmConnectionsData as unknown as { data?: SCMConnection[] })?.data ?? [])
  const scmConnectedCount = scmConnections.filter((c) => c.status === 'connected').length

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

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Puzzle className="h-4 w-4" />
                Total Integrations
              </CardDescription>
              <CardTitle className="text-3xl">{integrationStats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Connected
              </CardDescription>
              <CardTitle className="text-3xl text-green-500">
                {integrationStats.connected}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Available
              </CardDescription>
              <CardTitle className="text-3xl text-blue-500">{integrationStats.available}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Syncs Today
              </CardDescription>
              <CardTitle className="text-3xl">{integrationStats.syncsToday}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Recent Events */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Integration events and syncs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentEvents.map((event, idx) => (
                <div key={idx} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {event.integration}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{event.time}</span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">{event.event}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Connected Integrations */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Connected Integrations</CardTitle>
                  <CardDescription>Active connections and their status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connectedIntegrations.map((integration) => {
                  const status = statusConfig[integration.status]
                  return (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                          <integration.icon className="text-primary h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-medium">{integration.name}</h4>
                            <Badge
                              className={`${categoryColors[integration.category]} border-0 text-xs`}
                            >
                              {integration.category}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">{integration.description}</p>
                          {integration.error ? (
                            <p className="mt-1 text-xs text-red-400">{integration.error}</p>
                          ) : (
                            <p className="text-muted-foreground mt-1 text-xs">
                              Last sync: {integration.lastSync} - {integration.syncCount} syncs
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${status.bgColor} ${status.color} border-0`}>
                          {status.icon}
                          <span className="ml-1">{integration.status}</span>
                        </Badge>
                        <Can permission={Permission.IntegrationsManage} mode="disable">
                          <Switch checked={integration.status === 'connected'} />
                        </Can>
                        <Can permission={Permission.IntegrationsManage} mode="disable">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Can>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Integrations */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Available Integrations</CardTitle>
                <CardDescription>
                  Connect more tools to enhance your security operations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {availableIntegrations.map((integration) => (
                <Card key={integration.id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <integration.icon className="text-primary h-5 w-5" />
                      </div>
                      {integration.popular && (
                        <Badge variant="secondary" className="text-xs">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium">{integration.name}</h4>
                      </div>
                      <Badge
                        className={`${categoryColors[integration.category]} border-0 mt-1 text-xs`}
                      >
                        {integration.category}
                      </Badge>
                      <p className="text-muted-foreground mt-2 text-xs">
                        {integration.description}
                      </p>
                    </div>
                    <Can permission={Permission.IntegrationsManage} mode="disable">
                      <Button variant="outline" size="sm" className="mt-3 w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Connect
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
