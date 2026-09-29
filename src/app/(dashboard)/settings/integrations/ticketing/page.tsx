'use client'

import { useState } from 'react'
import { Main } from '@/components/layout'
import type { ColumnDef } from '@tanstack/react-table'
import {
  PageHeader,
  EmptyState,
  ErrorState,
  DataTable,
  DataTableRowActions,
  MetricStrip,
  RelativeTime,
  StackedCell,
  type MetricStripItem,
} from '@/features/shared'
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
import { Ticket, Plus, Settings, RefreshCw, ExternalLink, Route, X } from 'lucide-react'
import { RoutingRulesDialog } from '@/features/integrations/components/routing-rules-dialog'
import { Switch } from '@/components/ui/switch'
import {
  useIntegrationsApi,
  useCreateIntegrationApi,
  useSyncIntegrationApi,
  useUpdateIntegrationApi,
  useJiraProjectsApi,
} from '@/features/integrations/api/use-integrations-api'
import type {
  Integration,
  IntegrationStatus,
} from '@/features/integrations/types/integration.types'
import { toast } from 'sonner'
import { mutate } from 'swr'

// Finding statuses a Jira webhook may set inbound. false_positive/accepted need
// approval and resolved needs verification, so they're excluded (the backend
// rejects them anyway; "done"-like Jira statuses should map to fix_applied).
const INBOUND_FINDING_STATUSES = ['confirmed', 'in_progress', 'fix_applied', 'duplicate'] as const

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
  const ticketing = getTicketingConfig(integration)
  const key = ticketing.project_key as string | undefined
  return key && key !== '' ? key : '-'
}

// ─────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntegrationStatus }) {
  // Only a problem (error / expired) is coloured; other states stay neutral.
  const config: Record<
    IntegrationStatus,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
  > = {
    connected: { variant: 'default', label: 'Connected' },
    disconnected: { variant: 'secondary', label: 'Not connected' },
    error: { variant: 'destructive', label: 'Error' },
    pending: { variant: 'outline', label: 'Pending' },
    expired: { variant: 'destructive', label: 'Expired' },
    disabled: { variant: 'secondary', label: 'Disabled' },
  }
  const { variant, label } = config[status] ?? config.disconnected
  return <Badge variant={variant}>{label}</Badge>
}

// ─────────────────────────────────────────────────────────
// Configure dialog (bidirectional sync toggle)
// ─────────────────────────────────────────────────────────

function getTicketingConfig(integration: Integration): Record<string, unknown> {
  const cfg = integration.config as Record<string, unknown> | undefined
  return (cfg?.ticketing as Record<string, unknown> | undefined) ?? {}
}

function ConfigureTicketingDialog({
  integration,
  open,
  onOpenChange,
}: {
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [syncEnabled, setSyncEnabled] = useState<boolean>(
    Boolean(getTicketingConfig(integration).sync_enabled)
  )
  const [projectKey, setProjectKey] = useState<string>(
    (getTicketingConfig(integration).project_key as string) ?? ''
  )

  // Mapping config (severity→priority, issue type, default priority, outbound
  // status names). Read existing values so partial edits preserve the rest.
  const cfg = getTicketingConfig(integration)
  const sev0 = (cfg.severity_to_priority as Record<string, string> | undefined) ?? {}
  const out0 = (cfg.status_outbound as Record<string, string> | undefined) ?? {}
  const [issueType, setIssueType] = useState<string>((cfg.issue_type as string) ?? '')
  const [defaultPriority, setDefaultPriority] = useState<string>(
    (cfg.default_priority as string) ?? ''
  )
  const [sevPriority, setSevPriority] = useState<Record<string, string>>({
    critical: sev0.critical ?? '',
    high: sev0.high ?? '',
    medium: sev0.medium ?? '',
    low: sev0.low ?? '',
  })
  const [statusOutbound, setStatusOutbound] = useState<Record<string, string>>({
    confirmed: out0.confirmed ?? '',
    in_progress: out0.in_progress ?? '',
    fix_applied: out0.fix_applied ?? '',
    resolved: out0.resolved ?? '',
  })

  // Inbound: arbitrary Jira status name → finding status (freeform rows).
  const in0 = (cfg.status_inbound as Record<string, string> | undefined) ?? {}
  const [statusInbound, setStatusInbound] = useState<Array<{ jira: string; finding: string }>>(
    Object.entries(in0).map(([jira, finding]) => ({ jira, finding }))
  )

  const { trigger: update, isMutating } = useUpdateIntegrationApi(integration.id)

  // Drop empty values so we don't overwrite defaults with blanks.
  const pruned = (obj: Record<string, string>): Record<string, string> =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v.trim() !== ''))

  // Fetch the projects visible to this Jira integration for the picker. Only
  // meaningful while the dialog is open and the integration is connected;
  // failure (e.g. non-Cloud, bad creds) degrades to manual key entry.
  const canList = open && integration.status === 'connected'
  const { data: projectsData, isLoading: projectsLoading } = useJiraProjectsApi(canList)
  const projects = projectsData?.projects ?? []

  async function handleSave() {
    try {
      // UpdateIntegration replaces config wholesale, so send the full object with
      // only the ticketing keys we own changed (preserve maps, routing, etc.).
      const existingConfig = (integration.config as Record<string, unknown>) ?? {}
      const existingTicketing = (existingConfig.ticketing as Record<string, unknown>) ?? {}
      const sevMap = pruned(sevPriority)
      const outMap = pruned(statusOutbound)
      // The inbound editor shows every existing key, so it is authoritative —
      // build the full map from the rows (drop blanks).
      const inMap = Object.fromEntries(
        statusInbound
          .map((r) => [r.jira.trim(), r.finding.trim()] as const)
          .filter(([j, f]) => j !== '' && f !== '')
      )
      await update({
        config: {
          ...existingConfig,
          ticketing: {
            ...existingTicketing,
            sync_enabled: syncEnabled,
            project_key: projectKey.trim(),
            issue_type: issueType.trim(),
            default_priority: defaultPriority.trim(),
            // Merge over existing maps so unshown keys (e.g. extra outbound
            // statuses set elsewhere) are preserved.
            severity_to_priority: {
              ...((existingTicketing.severity_to_priority as Record<string, string>) ?? {}),
              ...sevMap,
            },
            status_outbound: {
              ...((existingTicketing.status_outbound as Record<string, string>) ?? {}),
              ...outMap,
            },
            status_inbound: inMap,
          },
        },
      })
      toast.success('Ticketing settings saved')
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/v1/integrations'),
        undefined,
        { revalidate: true }
      )
      onOpenChange(false)
    } catch {
      toast.error('Failed to save settings')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure {integration.name}</DialogTitle>
          <DialogDescription>Control how OpenCTEM syncs with this tracker.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Default destination project */}
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="default-project" className="font-medium">
              Default project
            </Label>
            <p className="text-muted-foreground text-xs">
              Where tickets land when a finding doesn&apos;t specify one and no routing rule
              matches.
            </p>
            {projects.length > 0 && (
              <Select value={projectKey || undefined} onValueChange={setProjectKey}>
                <SelectTrigger id="default-project-picker">
                  <SelectValue placeholder="Pick a Jira project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.key}>
                      {p.key} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Input
              id="default-project"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder={projectsLoading ? 'Loading projects…' : 'e.g. SEC'}
            />
            {projects.length === 0 && !projectsLoading && (
              <p className="text-muted-foreground text-xs">
                Couldn&apos;t list projects from Jira — enter the project key manually.
              </p>
            )}
          </div>

          {/* Bidirectional sync */}
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <Label htmlFor="sync-enabled" className="font-medium">
                Bidirectional status sync
              </Label>
              <p className="text-muted-foreground text-xs">
                When a finding&apos;s status changes in OpenCTEM, move the linked Jira issue to
                match. Jira-side status changes already sync back automatically.
              </p>
            </div>
            <Switch id="sync-enabled" checked={syncEnabled} onCheckedChange={setSyncEnabled} />
          </div>

          {/* Ticket defaults + severity→priority mapping */}
          <div className="space-y-3 rounded-lg border p-3">
            <Label className="font-medium">Ticket defaults &amp; mapping</Label>
            <p className="text-muted-foreground text-xs">
              Override how OpenCTEM fills new tickets. Leave blank to use the defaults.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="issue-type" className="text-xs">
                  Issue type
                </Label>
                <Input
                  id="issue-type"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  placeholder="Bug"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="default-priority" className="text-xs">
                  Default priority
                </Label>
                <Input
                  id="default-priority"
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value)}
                  placeholder="Medium"
                />
              </div>
            </div>
            <Label className="text-xs">Severity → Jira priority</Label>
            <div className="grid grid-cols-2 gap-3">
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                <div key={sev} className="space-y-1">
                  <Label
                    htmlFor={`sev-${sev}`}
                    className="text-muted-foreground text-xs capitalize"
                  >
                    {sev}
                  </Label>
                  <Input
                    id={`sev-${sev}`}
                    value={sevPriority[sev]}
                    onChange={(e) => setSevPriority((p) => ({ ...p, [sev]: e.target.value }))}
                    placeholder={
                      { critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low' }[sev]
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Outbound status mapping (finding status → Jira status NAME) */}
          <div className="space-y-3 rounded-lg border p-3">
            <Label className="font-medium">Outbound status names</Label>
            <p className="text-muted-foreground text-xs">
              When bidirectional sync moves a Jira issue, use these status names (match your Jira
              workflow). Blank = stock default.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ['confirmed', 'To Do'],
                  ['in_progress', 'In Progress'],
                  ['fix_applied', 'Done'],
                  ['resolved', 'Done'],
                ] as const
              ).map(([fs, ph]) => (
                <div key={fs} className="space-y-1">
                  <Label htmlFor={`out-${fs}`} className="text-muted-foreground text-xs">
                    {fs.replace('_', ' ')}
                  </Label>
                  <Input
                    id={`out-${fs}`}
                    value={statusOutbound[fs]}
                    onChange={(e) => setStatusOutbound((p) => ({ ...p, [fs]: e.target.value }))}
                    placeholder={ph}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Inbound status mapping (Jira status NAME → finding status) */}
          <div className="space-y-3 rounded-lg border p-3">
            <Label className="font-medium">Inbound status mapping</Label>
            <p className="text-muted-foreground text-xs">
              Map your Jira workflow status names to OpenCTEM finding statuses so a Jira-side status
              change updates the finding. Stock Jira names (To Do / In Progress / Done…) already
              work — only add rows for custom workflow statuses.
            </p>
            {statusInbound.length === 0 && (
              <p className="text-muted-foreground text-xs italic">
                No custom mappings — stock defaults apply.
              </p>
            )}
            {statusInbound.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={row.jira}
                  onChange={(e) =>
                    setStatusInbound((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, jira: e.target.value } : r))
                    )
                  }
                  placeholder="Jira status (e.g. Shipped)"
                  className="flex-1"
                />
                <span className="text-muted-foreground text-xs">→</span>
                <Select
                  value={row.finding || undefined}
                  onValueChange={(v) =>
                    setStatusInbound((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, finding: v } : r))
                    )
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Finding status" />
                  </SelectTrigger>
                  <SelectContent>
                    {INBOUND_FINDING_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setStatusInbound((rows) => rows.filter((_, j) => j !== i))}
                  aria-label="Remove mapping"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setStatusInbound((rows) => [...rows, { jira: '', finding: 'confirmed' }])
              }
            >
              <Plus className="me-2 h-4 w-4" />
              Add mapping
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isMutating}>
            {isMutating ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Integration card
// ─────────────────────────────────────────────────────────

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function TicketingRowActions({ integration }: { integration: Integration }) {
  const [configOpen, setConfigOpen] = useState(false)
  const [routingOpen, setRoutingOpen] = useState(false)

  const { trigger: syncNow, isMutating: isSyncing } = useSyncIntegrationApi(integration.id)

  async function handleSync() {
    try {
      await syncNow()
      toast.success(`${integration.name} sync triggered`)
      await mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/v1/integrations'),
        undefined,
        { revalidate: true }
      )
    } catch {
      toast.error('Failed to trigger sync')
    }
  }

  const jiraReady = integration.provider === 'jira' && integration.status === 'connected'

  return (
    <>
      <DataTableRowActions
        actions={[
          ...(integration.status === 'connected'
            ? [
                {
                  label: isSyncing ? 'Syncing…' : 'Sync now',
                  icon: RefreshCw,
                  onClick: () => void handleSync(),
                  disabled: isSyncing,
                },
              ]
            : []),
          {
            label: 'Routing rules',
            icon: Route,
            onClick: () => setRoutingOpen(true),
            disabled: !jiraReady,
          },
          {
            label: 'Configure',
            icon: Settings,
            onClick: () => setConfigOpen(true),
            disabled: !jiraReady,
          },
        ]}
      />

      {/* Mount-on-open so each dialog re-seeds its useState from the freshly
          revalidated `integration` prop every time it opens (otherwise the
          always-mounted form keeps stale values after a save) — and so the two
          dialogs never build their config payload from a stale prop. */}
      {integration.provider === 'jira' && configOpen && (
        <ConfigureTicketingDialog
          integration={integration}
          open={configOpen}
          onOpenChange={setConfigOpen}
        />
      )}
      {integration.provider === 'jira' && routingOpen && (
        <RoutingRulesDialog
          integration={integration}
          open={routingOpen}
          onOpenChange={setRoutingOpen}
        />
      )}
    </>
  )
}

const columns: ColumnDef<Integration>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <StackedCell primary={row.original.name} secondary={row.original.description} truncate />
    ),
  },
  {
    id: 'provider',
    header: 'Provider',
    accessorFn: (i) => getProviderLabel(i.provider),
    cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
  },
  {
    id: 'project',
    header: 'Default project',
    accessorFn: (i) => getProjectKey(i),
    cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
  },
  {
    id: 'host',
    header: 'Host',
    accessorFn: (i) => (i.base_url ? hostnameOf(i.base_url) : ''),
    cell: ({ row }) =>
      row.original.base_url ? (
        <a
          href={row.original.base_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3 w-3" />
          {hostnameOf(row.original.base_url)}
        </a>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
    cell: ({ row }) => <TicketingRowActions integration={row.original} />,
  },
]

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
      // Store the default project under config.ticketing.project_key — the shape
      // the backend reads (ParseMappingConfig). It used to be stuffed into
      // `description`, which the backend never looks at, so it had no effect.
      const trimmedKey = projectKey.trim()
      await createIntegration({
        name,
        category: 'ticketing',
        provider,
        auth_type: 'token',
        credentials,
        base_url: baseUrl || undefined,
        config: trimmedKey ? { ticketing: { project_key: trimmedKey } } : undefined,
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
            <Label htmlFor="project-key">Default project key (optional)</Label>
            <Input
              id="project-key"
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
              placeholder="e.g. SEC"
            />
            <p className="text-muted-foreground text-xs">
              Where tickets land by default. After connecting you can pick it from your Jira
              projects under Configure.
            </p>
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

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function TicketingIntegrationPage() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    data: integrationsData,
    error,
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

  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Connections', value: connections.length },
    { key: 'connected', label: 'Connected', value: connected },
    { key: 'attention', label: 'Needs attention', value: needsAttention, tone: 'danger' },
    { key: 'pending', label: 'Pending', value: pending },
  ]

  return (
    <Main>
      <PageHeader
        title="Ticketing"
        description="Connect ticketing systems to create and track remediation tickets automatically."
      >
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          Add connection
        </Button>
      </PageHeader>

      {error ? (
        <div className="mt-5">
          <ErrorState
            title="ticketing connections"
            error={error}
            onRetry={() => void reloadIntegrations()}
          />
        </div>
      ) : (
        <>
          <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

          <div className="mt-5">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full max-w-sm" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : connections.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No ticketing systems connected"
                description="Connect a ticketing system to automatically create and track remediation tickets."
                action={
                  <Button size="sm" onClick={() => setDialogOpen(true)}>
                    <Plus className="me-2 h-4 w-4" />
                    Add connection
                  </Button>
                }
              />
            ) : (
              <DataTable
                columns={columns}
                data={connections}
                getRowId={(c) => c.id}
                searchPlaceholder="Search connections..."
                showSelectionCount={false}
              />
            )}
          </div>
        </>
      )}

      <ConnectJiraDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => reloadIntegrations()}
      />
    </Main>
  )
}
