'use client'

import { useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import {
  useIntegrationsApi,
  useCreateIntegrationApi,
  useSyncIntegrationApi,
} from '@/features/integrations/api/use-integrations-api'
import type {
  Integration,
  IntegrationStatus,
} from '@/features/integrations/types/integration.types'
import { toast } from 'sonner'
import { mutate } from 'swr'

// ─────────────────────────────────────────────────────────
// Provider helpers
// ─────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  jira: 'Jira Cloud',
  linear: 'Linear',
  asana: 'Asana',
  custom: 'Custom',
}

function getProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider
}

function getProjectKey(integration: Integration): string {
  const config = integration.config as Record<string, unknown> | undefined
  if (!config) return '-'
  return (config.project_key as string) ?? '-'
}

function getOpenTickets(integration: Integration): number {
  const meta = integration.metadata as Record<string, unknown> | undefined
  if (!meta) return 0
  return (meta.open_tickets as number) ?? 0
}

function getTotalTickets(integration: Integration): number {
  const meta = integration.metadata as Record<string, unknown> | undefined
  if (!meta) return 0
  return (meta.total_tickets_created as number) ?? 0
}

// ─────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config: Record<IntegrationStatus, { className: string; label: string }> = {
    connected: {
      className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      label: 'Connected',
    },
    disconnected: {
      className: 'bg-muted text-muted-foreground',
      label: 'Not Connected',
    },
    error: {
      className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      label: 'Error',
    },
    pending: {
      className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      label: 'Pending',
    },
    expired: {
      className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      label: 'Expired',
    },
    disabled: {
      className: 'bg-muted text-muted-foreground',
      label: 'Disabled',
    },
  }
  const { className, label } = config[status] ?? config.disconnected
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

// ─────────────────────────────────────────────────────────
// Integration card
// ─────────────────────────────────────────────────────────

function TicketingIntegrationCard({ integration }: { integration: Integration }) {
  const totalTickets = getTotalTickets(integration)
  const openTickets = getOpenTickets(integration)
  const projectKey = getProjectKey(integration)

  const { trigger: syncNow, isMutating: isSyncing } = useSyncIntegrationApi(integration.id)

  async function handleSync() {
    try {
      await syncNow()
      toast.success(`${integration.name} sync triggered`)
      await mutate('/api/v1/integrations?category=ticketing')
    } catch {
      toast.error('Failed to trigger sync')
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">{integration.name}</h3>
              <StatusBadge status={integration.status} />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {getProviderLabel(integration.provider)}
              </Badge>
              {projectKey !== '-' && (
                <span className="text-muted-foreground text-xs">Project: {projectKey}</span>
              )}
              {integration.base_url && (
                <a
                  href={integration.base_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  {new URL(integration.base_url).hostname}
                </a>
              )}
            </div>

            {integration.description && (
              <p className="text-muted-foreground text-xs line-clamp-1">
                {integration.description}
              </p>
            )}

            {totalTickets > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    {openTickets} open / {totalTickets} total tickets
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {Math.round((openTickets / totalTickets) * 100)}% open
                  </span>
                </div>
                <Progress
                  value={Math.round((openTickets / totalTickets) * 100)}
                  className="h-1.5"
                />
              </div>
            )}

            {integration.last_sync_at && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Last sync: {new Date(integration.last_sync_at).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {integration.status === 'connected' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                title="Sync now"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
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

// ─────────────────────────────────────────────────────────
// Connect Jira dialog
// ─────────────────────────────────────────────────────────

interface ConnectJiraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function ConnectJiraDialog({ open, onOpenChange, onSuccess }: ConnectJiraDialogProps) {
  const [name, setName] = useState('Jira Cloud')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [projectKey, setProjectKey] = useState('')
  const [provider, setProvider] = useState<'jira' | 'linear' | 'asana'>('jira')

  const { trigger: createIntegration, isMutating } = useCreateIntegrationApi()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !apiToken) {
      toast.error('Name and API token are required')
      return
    }
    try {
      await createIntegration({
        name,
        category: 'ticketing',
        provider,
        auth_type: 'token',
        credentials: apiToken,
        base_url: baseUrl || undefined,
        description: projectKey ? `Project: ${projectKey}` : undefined,
      })
      toast.success(`${name} connected successfully`)
      onSuccess()
      onOpenChange(false)
      // Reset form
      setName('Jira Cloud')
      setBaseUrl('')
      setApiToken('')
      setProjectKey('')
      setProvider('jira')
    } catch {
      toast.error('Failed to connect ticketing system')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Ticketing System</DialogTitle>
          <DialogDescription>
            Connect a ticketing system to automatically create and track remediation tickets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v as 'jira' | 'linear' | 'asana')
                setName(PROVIDER_LABELS[v] ?? v)
              }}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jira">Jira Cloud</SelectItem>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="asana">Asana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conn-name">Connection name</Label>
            <Input
              id="conn-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Security Remediation Board"
              required
            />
          </div>

          {provider === 'jira' && (
            <div className="space-y-2">
              <Label htmlFor="base-url">Jira base URL</Label>
              <Input
                id="base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://yourorg.atlassian.net"
                type="url"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="project-key">Project key (optional)</Label>
            <Input
              id="project-key"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g. SEC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-token">API token</Label>
            <Input
              id="api-token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              type="password"
              placeholder="Paste your API token"
              required
            />
            <p className="text-muted-foreground text-xs">
              {provider === 'jira'
                ? 'Generate from Atlassian account settings under Security.'
                : 'Generate from your account settings.'}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Skeletons & empty state
// ─────────────────────────────────────────────────────────

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
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-lg" />
        ))}
      </div>
    </Main>
  )
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Ticket className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-1 text-lg font-semibold">No Ticketing Systems Connected</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          Connect a ticketing system to automatically create and track remediation tickets.
        </p>
        <Button size="sm" onClick={onConnect}>
          <Plus className="mr-2 h-4 w-4" />
          Connect Ticketing System
        </Button>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Auto-ticketing rules (static config UI — actual rules TBD)
// ─────────────────────────────────────────────────────────

const AUTO_RULES = [
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
]

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function TicketingIntegrationPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    data: integrationsData,
    isLoading,
    mutate: reloadIntegrations,
  } = useIntegrationsApi({ category: 'ticketing', per_page: 50 })

  const connections = integrationsData?.data ?? []

  const connected = connections.filter((c) => c.status === 'connected').length
  const totalTickets = connections.reduce((s, c) => s + getTotalTickets(c), 0)
  const openTickets = connections.reduce((s, c) => s + getOpenTickets(c), 0)
  const biDirectional = connections.filter(
    (c) => (c.config as Record<string, unknown> | undefined)?.sync_direction === 'bi-directional'
  ).length

  if (isLoading) return <LoadingSkeleton />

  return (
    <Main>
      <PageHeader
        title="Ticketing Integration"
        description="Connect with ticketing systems for automated remediation tracking"
      >
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </PageHeader>

      {/* Summary stats */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Connected Systems"
          value={connected}
          icon={Link2}
          changeType={connected > 0 ? 'positive' : 'neutral'}
          description={`of ${connections.length} configured`}
        />
        <StatsCard
          title="Tickets Created"
          value={totalTickets}
          icon={FileText}
          description="Auto-generated tickets"
        />
        <StatsCard
          title="Open Tickets"
          value={openTickets}
          icon={AlertTriangle}
          changeType={openTickets > 0 ? 'negative' : 'neutral'}
          description="Awaiting resolution"
        />
        <StatsCard
          title="Bi-Directional Sync"
          value={biDirectional}
          icon={ArrowLeftRight}
          description="Two-way connections"
        />
      </div>

      {/* Connections list */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Ticketing Connections</h2>
        {connections.length === 0 ? (
          <EmptyState onConnect={() => setDialogOpen(true)} />
        ) : (
          <div className="space-y-4">
            {connections.map((conn) => (
              <TicketingIntegrationCard key={conn.id} integration={conn} />
            ))}
          </div>
        )}
      </div>

      {/* Auto-ticketing rules */}
      {connections.length > 0 && (
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
              {AUTO_RULES.map((item) => (
                <div
                  key={item.rule}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {item.enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
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
      )}

      <ConnectJiraDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => reloadIntegrations()}
      />
    </Main>
  )
}
