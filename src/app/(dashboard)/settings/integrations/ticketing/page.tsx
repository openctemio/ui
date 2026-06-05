'use client'

import { useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
  Settings,
  AlertTriangle,
  RefreshCw,
  Link2,
  ExternalLink,
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
                <RefreshCw className={`me-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}
            <Button variant="outline" size="sm" disabled title="Configure">
              <Settings className="me-2 h-4 w-4" />
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
  const [email, setEmail] = useState('')
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
    // Jira Cloud REST auth is basic-auth with the account email + API token.
    // Without the email the backend cannot build a client and the integration
    // is silently skipped, so require it and ship both fields together.
    if (provider === 'jira') {
      if (!baseUrl) {
        toast.error('Jira base URL is required')
        return
      }
      if (!email) {
        toast.error('Atlassian account email is required')
        return
      }
    }
    try {
      // For Jira, pack email + token as JSON so both travel encrypted in the
      // credentials field. Other providers use a bare token.
      const credentials =
        provider === 'jira' ? JSON.stringify({ email, api_token: apiToken }) : apiToken
      await createIntegration({
        name,
        category: 'ticketing',
        provider,
        auth_type: 'token',
        credentials,
        base_url: baseUrl || undefined,
        description: projectKey ? `Project: ${projectKey}` : undefined,
      })
      toast.success(`${name} connected successfully`)
      onSuccess()
      onOpenChange(false)
      // Reset form
      setName('Jira Cloud')
      setBaseUrl('')
      setEmail('')
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
            <>
              <div className="space-y-2">
                <Label htmlFor="base-url">Jira base URL</Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://yourorg.atlassian.net"
                  type="url"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jira-email">Atlassian account email</Label>
                <Input
                  id="jira-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourorg.com"
                  type="email"
                  required
                />
                <p className="text-muted-foreground text-xs">
                  The email of the Atlassian account that owns the API token. Jira Cloud pairs it
                  with the token for authentication.
                </p>
              </div>
            </>
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
  const needsAttention = connections.filter(
    (c) => c.status === 'error' || c.status === 'expired'
  ).length
  const pending = connections.filter(
    (c) => c.status === 'pending' || c.status === 'disconnected'
  ).length

  if (isLoading) return <LoadingSkeleton />

  return (
    <Main>
      <PageHeader
        title="Ticketing Integration"
        description="Connect with ticketing systems for automated remediation tracking"
      >
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          Add Connection
        </Button>
      </PageHeader>

      {/* Summary stats — derived from real connection status */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Connected Systems"
          value={connected}
          icon={Link2}
          changeType={connected > 0 ? 'positive' : 'neutral'}
          description={`of ${connections.length} configured`}
        />
        <StatsCard
          title="Needs Attention"
          value={needsAttention}
          icon={AlertTriangle}
          changeType={needsAttention > 0 ? 'negative' : 'neutral'}
          description="Error or expired"
        />
        <StatsCard title="Pending" value={pending} icon={Clock} description="Awaiting first sync" />
      </div>

      {/* Connections list */}
      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Ticketing Connections</h2>
        {connections.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No Ticketing Systems Connected"
            description="Connect a ticketing system to automatically create and track remediation tickets."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                Connect Ticketing System
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {connections.map((conn) => (
              <TicketingIntegrationCard key={conn.id} integration={conn} />
            ))}
          </div>
        )}
      </div>

      <ConnectJiraDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => reloadIntegrations()}
      />
    </Main>
  )
}
