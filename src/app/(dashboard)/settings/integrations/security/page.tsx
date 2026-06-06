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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  ShieldCheck,
  Plus,
  Link2,
  Clock,
  ServerCog,
  Info,
  Pencil,
  Trash2,
  Upload,
  Gauge,
  Target,
  AlertTriangle,
} from 'lucide-react'
import { useScanCoverage } from '@/lib/api/scan-coverage-hooks'
import {
  useIntegrationsApi,
  useCreateIntegrationApi,
  useUpdateIntegrationApi,
  useDeleteIntegrationApi,
} from '@/features/integrations/api/use-integrations-api'
import type {
  Integration,
  IntegrationStatus,
} from '@/features/integrations/types/integration.types'
import { csrfFetch } from '@/lib/api/client'
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

const SECURITY_KEY = '/api/v1/integrations?category=security'

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

// Shared engine + mode form fields (used by connect + edit).
function TenableModeFields({
  engine,
  setEngine,
  mode,
  setMode,
}: {
  engine: Engine
  setEngine: (e: Engine) => void
  mode: ExecutionMode
  setMode: (m: ExecutionMode) => void
}) {
  return (
    <>
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
    </>
  )
}

function AgentModeNote() {
  return (
    <div className="bg-muted/50 flex gap-2 rounded-lg border p-3">
      <ServerCog className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-muted-foreground text-xs">
        A runner in your environment connects to Tenable and pushes results back. Tenable
        credentials are configured on the runner and are <strong>never stored</strong> in OpenCTEM.
        After connecting, use <strong>Runner setup</strong> for deployment steps.
      </p>
    </div>
  )
}

function DirectModeWarning() {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-xs text-amber-700 dark:text-amber-300">
        Direct mode stores Tenable API credentials in OpenCTEM and requires the backend to reach
        Tenable. Prefer runner mode for segmented networks.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Connect dialog (create)
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
    if (!name) return toast.error('Connection name is required')
    if (mode === 'direct') {
      if (!baseUrl) return toast.error('Base URL is required for direct mode')
      if (!accessKey || !secretKey)
        return toast.error('Access key and secret key are required for direct mode')
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
          <TenableModeFields engine={engine} setEngine={setEngine} mode={mode} setMode={setMode} />
          {mode === 'agent' ? (
            <AgentModeNote />
          ) : (
            <>
              <DirectModeWarning />
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
// Edit dialog (update name / engine / mode / creds)
// ─────────────────────────────────────────────────────────

function EditTenableDialog({
  integration,
  open,
  onOpenChange,
  onSuccess,
}: {
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(integration.name)
  const [engine, setEngine] = useState<Engine>(
    (getConfigString(integration, 'engine') as Engine) || 'nessus_pro'
  )
  const [mode, setMode] = useState<ExecutionMode>(
    (getConfigString(integration, 'execution_mode') as ExecutionMode) || 'agent'
  )
  const [baseUrl, setBaseUrl] = useState(integration.base_url ?? '')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const { trigger: updateIntegration, isMutating } = useUpdateIntegrationApi(integration.id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return toast.error('Connection name is required')
    if (mode === 'direct' && !baseUrl) return toast.error('Base URL is required for direct mode')

    // Credentials handling:
    // - agent mode: clear any stored creds (also required to switch direct→agent).
    // - direct mode: only send new creds if both keys provided; otherwise keep existing.
    let credentials: string | undefined
    if (mode === 'agent') {
      credentials = ''
    } else if (accessKey && secretKey) {
      credentials = JSON.stringify({ access_key: accessKey, secret_key: secretKey })
    }

    try {
      await updateIntegration({
        name,
        base_url: baseUrl || undefined,
        ...(credentials !== undefined ? { credentials } : {}),
        config: { execution_mode: mode, engine },
      })
      toast.success('Scanner updated')
      onSuccess()
      onOpenChange(false)
    } catch {
      toast.error('Failed to update — check mode/credentials (agent mode cannot store credentials)')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {integration.name}</DialogTitle>
          <DialogDescription>Update engine, connection mode, or credentials.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Connection name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <TenableModeFields engine={engine} setEngine={setEngine} mode={mode} setMode={setMode} />
          {mode === 'agent' ? (
            <AgentModeNote />
          ) : (
            <>
              <DirectModeWarning />
              <div className="space-y-2">
                <Label htmlFor="edit-base-url">Base URL</Label>
                <Input
                  id="edit-base-url"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://cloud.tenable.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-access-key">Access key</Label>
                <Input
                  id="edit-access-key"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Leave blank to keep existing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-secret-key">Secret key</Label>
                <Input
                  id="edit-secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Leave blank to keep existing"
                />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Runner setup guidance (agent mode)
// ─────────────────────────────────────────────────────────

function RunnerSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set up the Tenable runner</DialogTitle>
          <DialogDescription>
            In runner (agent) mode, a runner in your environment talks to Tenable and pushes results
            to OpenCTEM over an outbound connection. OpenCTEM never reaches your appliance or holds
            its credentials.
          </DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-3 ps-5 text-sm">
          <li>
            Deploy the OpenCTEM runner in the same network zone as Nessus/Tenable (it needs outbound
            HTTPS to OpenCTEM only — no inbound).
          </li>
          <li>
            Register it with a bootstrap token and the <code>tenable</code> capability:
            <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-2 text-xs">
              {`openctem-runner register \\
  --server <openctem-url> \\
  --bootstrap-token <token> \\
  --capability tenable`}
            </pre>
          </li>
          <li>
            Configure the local Tenable credentials on the runner (kept in your environment, never
            sent to OpenCTEM):
            <pre className="bg-muted mt-1 overflow-x-auto rounded-md p-2 text-xs">
              {`TENABLE_BASE_URL=https://<nessus-or-sc-host>
TENABLE_ACCESS_KEY=<access-key>
TENABLE_SECRET_KEY=<secret-key>`}
            </pre>
          </li>
          <li>
            Create a coverage plan under <strong>Discovery → Scan Coverage</strong> and the runner
            will poll for batches, scan, and push findings back.
          </li>
        </ol>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Import .nessus results
// ─────────────────────────────────────────────────────────

function ImportResultsDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleUpload() {
    if (!file) return toast.error('Choose a .nessus file')
    setBusy(true)
    try {
      const text = await file.text()
      const res = await csrfFetch(
        '/api/v1/assets/import/nessus-findings?tool=tenable&min_severity=1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/xml' },
          body: text,
        }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { result?: Record<string, number> }
      const r = data.result ?? {}
      toast.success(
        `Imported: ${r.assets_created ?? 0} assets, ${r.findings_created ?? 0} findings`
      )
      onSuccess()
      onOpenChange(false)
      setFile(null)
    } catch {
      toast.error('Import failed — check the .nessus file')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import .nessus results</DialogTitle>
          <DialogDescription>
            Upload a Nessus/Tenable export. Hosts become assets and vulnerabilities become findings;
            stale Tenable findings on the uploaded hosts are auto-resolved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="file"
            accept=".nessus,.xml,text/xml,application/xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-muted-foreground text-xs">
            Tip: export with all scanned hosts included so clean hosts also auto-resolve.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={busy || !file}>
            {busy ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Scanner card (with actions)
// ─────────────────────────────────────────────────────────

function ScannerCard({
  integration,
  onChanged,
}: {
  integration: Integration
  onChanged: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [runnerOpen, setRunnerOpen] = useState(false)
  const { trigger: deleteIntegration, isMutating: deleting } = useDeleteIntegrationApi(
    integration.id
  )

  const mode = getConfigString(integration, 'execution_mode') || 'agent'
  const engine = getConfigString(integration, 'engine')

  async function handleDelete() {
    try {
      await deleteIntegration()
      toast.success('Scanner removed')
      setDeleteOpen(false)
      onChanged()
    } catch {
      toast.error('Failed to remove scanner')
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold">{integration.name}</h3>
              <StatusBadge status={integration.status} />
              <Badge variant="secondary" className="text-xs">
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
          <div className="flex shrink-0 items-center gap-1">
            {mode === 'agent' && (
              <Button variant="outline" size="sm" onClick={() => setRunnerOpen(true)}>
                <ServerCog className="me-2 h-4 w-4" />
                Runner setup
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              title="Remove"
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <EditTenableDialog
        integration={integration}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onChanged}
      />
      <RunnerSetupDialog open={runnerOpen} onOpenChange={setRunnerOpen} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {integration.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the scanner integration from OpenCTEM. Findings already ingested are
              kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDelete()
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
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
  const [connectOpen, setConnectOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const {
    data,
    isLoading,
    mutate: reload,
  } = useIntegrationsApi({ category: 'security', per_page: 50 })

  const scanners = data?.data ?? []
  const connected = scanners.filter((s) => s.status === 'connected').length
  const agentMode = scanners.filter(
    (s) => (getConfigString(s, 'execution_mode') || 'agent') === 'agent'
  ).length

  const { data: coverage, isLoading: coverageLoading } = useScanCoverage(30)

  const refresh = () => {
    reload()
    mutate(SECURITY_KEY)
  }

  if (isLoading) return <LoadingSkeleton />

  return (
    <Main>
      <PageHeader
        title="Vulnerability Scanners"
        description="Connect Tenable (Nessus Pro / Tenable.sc) for license-aware scan coverage"
      >
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="me-2 h-4 w-4" />
          Import .nessus
        </Button>
        <Button size="sm" onClick={() => setConnectOpen(true)}>
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

      {scanners.length > 0 && (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">Coverage</h2>
            <span className="text-muted-foreground text-sm">
              rolling scan freshness (last {coverage?.window_days ?? 30} days)
            </span>
          </div>
          {coverageLoading ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : coverage ? (
            <div className="grid gap-4 md:grid-cols-4">
              <StatsCard
                title="Coverage"
                value={`${coverage.coverage_percent.toFixed(1)}%`}
                icon={Gauge}
                changeType={
                  coverage.coverage_percent >= 80
                    ? 'positive'
                    : coverage.coverage_percent >= 50
                      ? 'neutral'
                      : 'negative'
                }
                description={`${coverage.covered_in_window} of ${coverage.total_scannable} scanned in window`}
              />
              <StatsCard
                title="Never scanned"
                value={coverage.never_scanned}
                icon={Target}
                changeType={coverage.never_scanned > 0 ? 'negative' : 'positive'}
                description={`of ${coverage.total_scannable} scannable assets`}
              />
              <StatsCard
                title="Stale"
                value={coverage.stale}
                icon={Clock}
                changeType={coverage.stale > 0 ? 'neutral' : 'positive'}
                description="scanned, but older than the window"
              />
              <StatsCard
                title="Critical never scanned"
                value={coverage.critical_never_scanned}
                icon={AlertTriangle}
                changeType={coverage.critical_never_scanned > 0 ? 'negative' : 'positive'}
                description="critical assets with no coverage"
              />
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">Scanners</h2>
        {scanners.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No scanners connected"
            description="Connect Tenable to ingest vulnerability findings with license-aware rolling coverage."
            action={
              <Button size="sm" onClick={() => setConnectOpen(true)}>
                <Plus className="me-2 h-4 w-4" />
                Connect Tenable
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {scanners.map((s) => (
              <ScannerCard key={s.id} integration={s} onChanged={refresh} />
            ))}
          </div>
        )}
      </div>

      <ConnectTenableDialog open={connectOpen} onOpenChange={setConnectOpen} onSuccess={refresh} />
      <ImportResultsDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={refresh} />
    </Main>
  )
}
