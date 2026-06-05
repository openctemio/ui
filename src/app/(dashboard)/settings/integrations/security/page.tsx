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
import { ShieldCheck, Plus, Link2, Clock, ServerCog, Info } from 'lucide-react'
import {
  useIntegrationsApi,
  useCreateIntegrationApi,
} from '@/features/integrations/api/use-integrations-api'
import type {
  Integration,
  IntegrationStatus,
} from '@/features/integrations/types/integration.types'
import { toast } from 'sonner'
import { mutate } from 'swr'

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

type Engine = 'nessus_pro' | 'tenable_sc'
type ExecutionMode = 'agent' | 'direct'

const ENGINE_LABELS: Record<Engine, string> = {
  nessus_pro: 'Nessus Professional (unlimited IPs)',
  tenable_sc: 'Tenable.sc / SecurityCenter (active-IP licensed)',
}

function getConfigString(integration: Integration, key: string): string {
  const config = integration.config as Record<string, unknown> | undefined
  return (config?.[key] as string) ?? ''
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config: Record<string, { className: string; label: string }> = {
    connected: {
      className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      label: 'Connected',
    },
    disconnected: { className: 'bg-muted text-muted-foreground', label: 'Not Connected' },
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
    disabled: { className: 'bg-muted text-muted-foreground', label: 'Disabled' },
  }
  const { className, label } = config[status] ?? config.disconnected
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

// ─────────────────────────────────────────────────────────
// Scanner card
// ─────────────────────────────────────────────────────────

function ScannerCard({ integration }: { integration: Integration }) {
  const mode = getConfigString(integration, 'execution_mode') || 'agent'
  const engine = getConfigString(integration, 'engine')

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{integration.name}</h3>
              <StatusBadge status={integration.status} />
              <Badge variant="secondary" className="text-xs capitalize">
                {mode === 'agent' ? 'Runner (agent)' : 'Direct'}
              </Badge>
              {engine && (
                <Badge variant="outline" className="text-xs">
                  {engine === 'tenable_sc' ? 'Tenable.sc' : 'Nessus Pro'}
                </Badge>
              )}
            </div>
            {integration.base_url && (
              <p className="text-muted-foreground text-xs">{integration.base_url}</p>
            )}
            {integration.last_sync_at && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3" />
                Last sync: {new Date(integration.last_sync_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Connect Tenable dialog
// ─────────────────────────────────────────────────────────

function ConnectTenableDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('Tenable')
  const [engine, setEngine] = useState<Engine>('nessus_pro')
  const [mode, setMode] = useState<ExecutionMode>('agent')
  const [baseUrl, setBaseUrl] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')

  const { trigger: createIntegration, isMutating } = useCreateIntegrationApi()

  function reset() {
    setName('Tenable')
    setEngine('nessus_pro')
    setMode('agent')
    setBaseUrl('')
    setAccessKey('')
    setSecretKey('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) {
      toast.error('Connection name is required')
      return
    }
    // Direct mode: the backend calls Tenable, so it needs base URL + API keys.
    // Agent mode: credentials live on the runner — never sent here (backend rejects them).
    if (mode === 'direct') {
      if (!baseUrl) {
        toast.error('Base URL is required for direct mode')
        return
      }
      if (!accessKey || !secretKey) {
        toast.error('Access key and secret key are required for direct mode')
        return
      }
    }
    try {
      await createIntegration({
        name,
        category: 'security',
        provider: 'tenable',
        auth_type: 'api_key',
        base_url: baseUrl || undefined,
        credentials:
          mode === 'direct'
            ? JSON.stringify({ access_key: accessKey, secret_key: secretKey })
            : undefined,
        config: { execution_mode: mode, engine },
      })
      toast.success(`${name} connected`)
      onSuccess()
      onOpenChange(false)
      reset()
    } catch {
      toast.error('Failed to connect Tenable')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Tenable</DialogTitle>
          <DialogDescription>
            Connect Nessus Professional or Tenable.sc for vulnerability scanning.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="conn-name">Connection name</Label>
            <Input id="conn-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="engine">Engine</Label>
            <Select value={engine} onValueChange={(v) => setEngine(v as Engine)}>
              <SelectTrigger id="engine">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nessus_pro">{ENGINE_LABELS.nessus_pro}</SelectItem>
                <SelectItem value="tenable_sc">{ENGINE_LABELS.tenable_sc}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode">Connection mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as ExecutionMode)}>
              <SelectTrigger id="mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Runner (agent) — recommended</SelectItem>
                <SelectItem value="direct">Direct (backend → Tenable)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === 'agent' ? (
            <div className="bg-muted/50 flex gap-2 rounded-lg border p-3">
              <ServerCog className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-muted-foreground text-xs">
                A runner in your environment connects to Tenable and pushes results back. Tenable
                credentials are configured on the runner and are <strong>never stored</strong> in
                OpenCTEM.
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Direct mode stores Tenable API credentials in OpenCTEM and requires the backend to
                  reach Tenable. Prefer runner mode for segmented networks.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://cloud.tenable.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="access-key">Access key</Label>
                <Input
                  id="access-key"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret-key">Secret key</Label>
                <Input
                  id="secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  required
                />
              </div>
            </>
          )}

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
// Page
// ─────────────────────────────────────────────────────────

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
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </Main>
  )
}

export default function SecurityScannersPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const {
    data: integrationsData,
    isLoading,
    mutate: reload,
  } = useIntegrationsApi({ category: 'security', per_page: 50 })

  const scanners = integrationsData?.data ?? []
  const connected = scanners.filter((s) => s.status === 'connected').length
  const agentMode = scanners.filter(
    (s) => (getConfigString(s, 'execution_mode') || 'agent') === 'agent'
  ).length

  if (isLoading) return <LoadingSkeleton />

  return (
    <Main>
      <PageHeader
        title="Vulnerability Scanners"
        description="Connect Tenable (Nessus Pro / Tenable.sc) for license-aware scan coverage"
      >
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          Connect Scanner
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Connected Scanners"
          value={connected}
          icon={Link2}
          changeType={connected > 0 ? 'positive' : 'neutral'}
          description={`of ${scanners.length} configured`}
        />
        <StatsCard
          title="Runner (agent) mode"
          value={agentMode}
          icon={ServerCog}
          description="Credentials stay in your environment"
        />
        <StatsCard
          title="Direct mode"
          value={scanners.length - agentMode}
          icon={ShieldCheck}
          description="Backend reaches Tenable"
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Scanners</h2>
        {scanners.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No scanners connected"
            description="Connect Tenable to ingest vulnerability findings with license-aware rolling coverage."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                Connect Tenable
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {scanners.map((s) => (
              <ScannerCard key={s.id} integration={s} />
            ))}
          </div>
        )}
      </div>

      <ConnectTenableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          reload()
          mutate('/api/v1/integrations?category=security')
        }}
      />
    </Main>
  )
}
