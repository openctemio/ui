'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  EmptyState,
  DataTable,
  DataTableColumnHeader,
  RelativeTime,
  StackedCell,
  ErrorState,
  MetricStrip,
  type MetricStripItem,
} from '@/features/shared'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { KeyRound, Plus, Search, Ban, Trash2, Copy, Check } from 'lucide-react'
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useDeleteApiKey,
} from '@/features/api-keys/api/use-api-keys'
import type { APIKey } from '@/features/api-keys/types/api-key.types'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/clipboard'

const AVAILABLE_SCOPES = [
  'assets:read',
  'findings:read',
  'scans:read',
  'integrations:read',
  'assets:write',
  'findings:write',
  'scans:write',
]

const EXPIRY_OPTIONS = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: '0', label: 'Never' },
]

function isExpired(k: APIKey): boolean {
  return !!k.expires_at && new Date(k.expires_at).getTime() < Date.now()
}

function isActive(k: APIKey): boolean {
  return k.status !== 'revoked' && !k.revoked_at && !isExpired(k)
}

function isRevoked(k: APIKey): boolean {
  return k.status === 'revoked' || !!k.revoked_at
}

type KeyStatus = 'active' | 'expired' | 'revoked'

function keyStatus(k: APIKey): KeyStatus {
  if (isRevoked(k)) return 'revoked'
  if (isExpired(k)) return 'expired'
  return 'active'
}

const STATUS_BADGE: Record<KeyStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-success/15 text-success' },
  expired: { label: 'Expired', className: 'bg-warning/15 text-warning' },
  revoked: { label: 'Revoked', className: 'bg-destructive/15 text-destructive' },
}

function StatusBadge({ k }: { k: APIKey }) {
  const s = STATUS_BADGE[keyStatus(k)]
  return <Badge className={`border-0 ${s.className}`}>{s.label}</Badge>
}

// ─────────────────────────────────────────────────────────
// Generate dialog + one-time reveal
// ─────────────────────────────────────────────────────────

function GenerateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (plaintext: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [expires, setExpires] = useState('90')
  const [scopes, setScopes] = useState<string[]>(['assets:read', 'findings:read'])
  const { trigger, isMutating } = useCreateApiKey()

  function toggleScope(s: string) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return toast.error('Name is required')
    if (scopes.length === 0) return toast.error('Select at least one scope')
    try {
      const res = await trigger({
        name,
        description: description || undefined,
        scopes,
        expires_in_days: Number(expires),
      })
      onCreated(res?.key ?? '')
      onOpenChange(false)
      setName('')
      setDescription('')
      setExpires('90')
      setScopes(['assets:read', 'findings:read'])
    } catch {
      toast.error('Failed to create API key')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate API key</DialogTitle>
          <DialogDescription>
            Scope the key to the minimum permissions needed. The secret is shown once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CI pipeline"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key-desc">Description (optional)</Label>
            <Input
              id="key-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key-expiry">Expires</Label>
            <Select value={expires} onValueChange={setExpires}>
              <SelectTrigger id="key-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SCOPES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={scopes.includes(s)} onCheckedChange={() => toggleScope(s)} />
                  <span className="font-mono text-xs">{s}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isMutating ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RevealKeyDialog({ value, onClose }: { value: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await copyToClipboard(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy your API key</DialogTitle>
          <DialogDescription>
            This is the only time the full key is shown. Store it securely.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex items-center gap-2 rounded-md p-3">
          <code className="flex-1 break-all text-xs">{value}</code>
          <Button size="icon" variant="ghost" onClick={copy} title="Copy" aria-label="Copy API key">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Row actions (revoke / delete) — inline prominent buttons
// ─────────────────────────────────────────────────────────

function KeyRowActions({ k, onChanged }: { k: APIKey; onChanged: () => void }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { trigger: revoke, isMutating: revoking } = useRevokeApiKey()
  const { trigger: del, isMutating: deleting } = useDeleteApiKey()

  async function handleRevoke() {
    try {
      await revoke(k.id)
      toast.success('Key revoked')
      onChanged()
    } catch {
      toast.error('Failed to revoke')
    }
  }
  async function handleDelete() {
    try {
      await del(k.id)
      toast.success('Key deleted')
      setDeleteOpen(false)
      onChanged()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="flex justify-end gap-1">
      {isActive(k) && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRevoke}
          disabled={revoking}
          title="Revoke"
          aria-label={`Revoke ${k.name}`}
        >
          <Ban className="h-4 w-4 text-warning" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDeleteOpen(true)}
        title="Delete"
        aria-label={`Delete ${k.name}`}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${k.name}?`}
        desc="Any client using this key will immediately lose access. This cannot be undone."
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        destructive
        isLoading={deleting}
        handleConfirm={() => void handleDelete()}
      />
    </div>
  )
}

const PAGE_TITLE = 'API keys'
const PAGE_DESCRIPTION = 'Scoped keys for programmatic access to the API.'

export default function APIKeysPage() {
  const { data, error, isLoading, mutate } = useApiKeys()
  const [genOpen, setGenOpen] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [statusParam, setStatusParam] = useUrlFilter('status', '')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const statusFilter = (['active', 'expired', 'revoked'] as const).find((s) => s === statusParam)

  const keys = useMemo(() => data?.data ?? [], [data])

  const columns = useMemo<ColumnDef<APIKey>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => (
          <StackedCell
            primary={row.original.name}
            secondary={<code>{row.original.key_prefix}…</code>}
          />
        ),
      },
      {
        id: 'scopes',
        header: 'Scopes',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.scopes.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                {s}
              </Badge>
            ))}
            {row.original.scopes.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{row.original.scopes.length - 3}
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => <StatusBadge k={row.original} />,
      },
      {
        accessorKey: 'last_used_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last used" />,
        cell: ({ row }) =>
          row.original.last_used_at ? (
            <RelativeTime date={row.original.last_used_at} />
          ) : (
            <span className="text-muted-foreground text-xs">Never</span>
          ),
      },
      {
        accessorKey: 'expires_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expires" />,
        cell: ({ row }) =>
          row.original.expires_at ? (
            <RelativeTime date={row.original.expires_at} />
          ) : (
            <span className="text-muted-foreground text-xs">Never</span>
          ),
      },
      {
        id: 'actions',
        header: () => <div className="text-end">Actions</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <KeyRowActions k={row.original} onChanged={() => mutate()} />,
      },
    ],
    [mutate]
  )

  const counts = useMemo(() => {
    const c = { active: 0, expired: 0, revoked: 0 }
    keys.forEach((k) => c[keyStatus(k)]++)
    return c
  }, [keys])

  const visibleKeys = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return keys.filter(
      (k) =>
        (!statusFilter || keyStatus(k) === statusFilter) &&
        (!q ||
          k.name.toLowerCase().includes(q) ||
          k.key_prefix?.toLowerCase().includes(q) ||
          k.scopes.some((s) => s.toLowerCase().includes(q)))
    )
  }, [keys, statusFilter, searchQuery])

  const toggleStatus = (s: KeyStatus) => setStatusParam(statusFilter === s ? '' : s)

  const metrics: MetricStripItem[] = [
    {
      key: 'all',
      label: 'All keys',
      value: keys.length,
      onClick: () => setStatusParam(''),
      active: !statusFilter,
    },
    {
      key: 'active',
      label: 'Active',
      value: counts.active,
      onClick: () => toggleStatus('active'),
      active: statusFilter === 'active',
    },
    {
      key: 'expired',
      label: 'Expired',
      value: counts.expired,
      hint: counts.expired > 0 ? 'Rotate or delete' : undefined,
      tone: 'danger',
      onClick: () => toggleStatus('expired'),
      active: statusFilter === 'expired',
    },
    {
      key: 'revoked',
      label: 'Revoked',
      value: counts.revoked,
      onClick: () => toggleStatus('revoked'),
      active: statusFilter === 'revoked',
    },
  ]

  const generateButton = (
    <Button size="sm" onClick={() => setGenOpen(true)}>
      <Plus className="h-4 w-4" />
      Generate API key
    </Button>
  )

  // A failed read must not render as "No API keys yet" with all-zero counts —
  // an admin could conclude none exist and mint a duplicate key.
  if (error)
    return (
      <Main>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <div className="mt-5">
          <ErrorState title="API keys" error={error} onRetry={() => void mutate()} />
        </div>
      </Main>
    )

  return (
    <Main>
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        {generateButton}
      </PageHeader>

      {!isLoading && keys.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={KeyRound}
          title="No API keys yet"
          description="Generate a scoped key for programmatic access to the API."
          action={generateButton}
        />
      ) : (
        <>
          <MetricStrip className="mt-5" loading={isLoading} items={metrics} />
          <div className="mt-5">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <DataTable
                columns={columns}
                data={visibleKeys}
                showSearch={false}
                toolbarStart={
                  <div className="relative min-w-0 flex-1 sm:max-w-sm">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name, prefix or scope…"
                      aria-label="Search API keys"
                      className="h-9 ps-9"
                    />
                  </div>
                }
                emptyMessage="No API keys match"
                emptyDescription="Clear the search or pick another metric."
              />
            )}
          </div>
        </>
      )}

      <GenerateKeyDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        onCreated={(plaintext) => {
          setNewKey(plaintext)
          mutate()
        }}
      />
      <RevealKeyDialog value={newKey} onClose={() => setNewKey('')} />
    </Main>
  )
}
