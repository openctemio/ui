'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Main } from '@/components/layout'
import {
  PageHeader,
  StackedCell,
  EmptyState,
  DataTable,
  DataTableColumnHeader,
  ErrorState,
  GatedButton,
  MetricStrip,
  type MetricStripItem,
} from '@/features/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { KeyRound, Plus, Ban, Copy, Check, ShieldCheck } from 'lucide-react'
import {
  useScimTokens,
  useCreateScimToken,
  useRevokeScimToken,
} from '@/features/scim-tokens/api/use-scim-tokens'
import type { ScimToken } from '@/features/scim-tokens/types/scim-token.types'
import { copyToClipboard } from '@/lib/clipboard'
import { getErrorMessage } from '@/lib/api/error-handler'
import { toast } from 'sonner'
import { usePermissions } from '@/lib/permissions'

function isActive(t: ScimToken): boolean {
  return t.status === 'active'
}

function StatusBadge({ t }: { t: ScimToken }) {
  if (!isActive(t)) {
    return <Badge variant="secondary">Revoked</Badge>
  }
  return <Badge variant="default">Active</Badge>
}

// ─────────────────────────────────────────────────────────
// Generate dialog + one-time reveal
// ─────────────────────────────────────────────────────────

function GenerateTokenDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: (plaintext: string) => void
}) {
  const [name, setName] = useState('')
  const { trigger, isMutating } = useCreateScimToken()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Name is required')
    try {
      const res = await trigger({ name: name.trim() })
      onCreated(res?.token ?? '')
      onOpenChange(false)
      setName('')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create SCIM token'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate SCIM token</DialogTitle>
          <DialogDescription>
            Your identity provider presents this token as a bearer credential when provisioning
            users. The secret is shown once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scim-token-name">Name</Label>
            <Input
              id="scim-token-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Okta production"
              required
            />
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

function RevealTokenDialog({ value, onClose }: { value: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    const ok = await copyToClipboard(value)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } else {
      toast.error('Copy failed')
    }
  }
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy your SCIM token</DialogTitle>
          <DialogDescription>
            This is the only time the full token is shown. Paste it into your IdP&apos;s SCIM
            configuration as the bearer token, then store it securely.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex items-center gap-2 rounded-md p-3">
          <code className="flex-1 break-all text-xs">{value}</code>
          <Button size="icon" variant="ghost" onClick={copy} title="Copy">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
// IdP setup card (base URL)
// ─────────────────────────────────────────────────────────

function ScimEndpointCard() {
  const [baseURL, setBaseURL] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseURL(`${window.location.origin}/scim/v2`)
    }
  }, [])
  async function copy() {
    const ok = await copyToClipboard(baseURL)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } else {
      toast.error('Copy failed')
    }
  }
  return (
    <Card className="mt-5">
      <CardHeader>
        <CardTitle>SCIM endpoint</CardTitle>
        <CardDescription>
          Configure your identity provider (Okta, Microsoft Entra ID, etc.) with this base URL and a
          token below. Authentication uses an HTTP bearer token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted flex items-center gap-2 rounded-md p-3">
          <code className="flex-1 break-all text-xs">{baseURL || '…'}</code>
          <Button size="icon" variant="ghost" onClick={copy} title="Copy" disabled={!baseURL}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Token actions cell (inline revoke button + confirm dialog)
// ─────────────────────────────────────────────────────────

const SCIM_OWNER_ONLY_REASON =
  'Only the organization owner can generate or revoke SCIM tokens: a token can create, suspend and re-role every member.'

function TokenActionsCell({
  t,
  onChanged,
  canRevoke,
}: {
  t: ScimToken
  onChanged: () => void
  canRevoke: boolean
}) {
  const [revokeOpen, setRevokeOpen] = useState(false)
  const { trigger: revoke, isMutating: revoking } = useRevokeScimToken()

  async function handleRevoke() {
    try {
      await revoke(t.id)
      toast.success('Token revoked')
      setRevokeOpen(false)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to revoke'))
    }
  }

  return (
    <div className="text-right">
      {isActive(t) && (
        <GatedButton
          variant="ghost"
          size="icon"
          allowed={canRevoke}
          reason={SCIM_OWNER_ONLY_REASON}
          onClick={() => setRevokeOpen(true)}
          title={canRevoke ? 'Revoke' : undefined}
          aria-label={`Revoke ${t.name}`}
          className="text-destructive hover:text-destructive"
        >
          <Ban className="h-4 w-4" />
        </GatedButton>
      )}
      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title={`Revoke ${t.name}?`}
        desc="Your identity provider will immediately lose access to SCIM provisioning with this token. This cannot be undone."
        confirmText={revoking ? 'Revoking...' : 'Revoke'}
        destructive
        isLoading={revoking}
        handleConfirm={() => void handleRevoke()}
      />
    </div>
  )
}

/** "Generate token" — enabled for the owner, disabled with the reason for administrators. */
function GenerateTokenButton({ canMint, onClick }: { canMint: boolean; onClick: () => void }) {
  return (
    <GatedButton size="sm" allowed={canMint} reason={SCIM_OWNER_ONLY_REASON} onClick={onClick}>
      <Plus className="me-2 h-4 w-4" />
      Generate token
    </GatedButton>
  )
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="mt-5 space-y-5">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  )
}

export default function ScimTokensPage() {
  // SCIM tokens are an owner/admin operation: the API refuses every
  // /scim-tokens call from anyone else. Members and viewers used to get an
  // enabled "Generate token" button (and an error where the list should be).
  const { isAdmin, isOwner, isLoading: roleLoading } = usePermissions()
  const canManage = isAdmin()
  // Minting and revoking a token is the owner's (the API refuses admins).
  const canMint = isOwner()
  const { data, error, isLoading, mutate } = useScimTokens({ enabled: canManage })
  const [genOpen, setGenOpen] = useState(false)
  const [newToken, setNewToken] = useState('')

  const tokens = useMemo(() => data?.tokens ?? [], [data])
  const stats = useMemo(() => {
    const active = tokens.filter(isActive).length
    return { total: tokens.length, active, revoked: tokens.length - active }
  }, [tokens])

  const columns = useMemo<ColumnDef<ScimToken>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const t = row.original
          return <StackedCell primary={t.name} secondary={<code>{t.prefix}…</code>} />
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <StatusBadge t={row.original} />,
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: 'last_used_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last used" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.last_used_at
              ? new Date(row.original.last_used_at).toLocaleDateString()
              : 'Never'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <TokenActionsCell t={row.original} onChanged={() => mutate()} canRevoke={canMint} />
        ),
      },
    ],
    [mutate, canMint]
  )

  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Total tokens', value: stats.total },
    { key: 'active', label: 'Active tokens', value: stats.active },
    { key: 'revoked', label: 'Revoked tokens', value: stats.revoked },
  ]

  return (
    <Main>
      <PageHeader
        title="Directory sync (SCIM)"
        description="Automate user provisioning and deprovisioning from your identity provider."
      >
        {canManage && <GenerateTokenButton canMint={canMint} onClick={() => setGenOpen(true)} />}
      </PageHeader>

      {roleLoading ? (
        <LoadingSkeleton />
      ) : !canManage ? (
        <div className="mt-5">
          <EmptyState
            icon={ShieldCheck}
            title="Managed by your team's owners and admins"
            description="SCIM tokens let your identity provider create and remove accounts in this team. Ask an owner or admin to set it up."
          />
        </div>
      ) : isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        // Don't render a failed read as "No SCIM tokens yet" with zeroed stats.
        <div className="mt-5">
          <ErrorState title="SCIM tokens" error={error} onRetry={() => void mutate()} />
        </div>
      ) : (
        <>
          <MetricStrip className="mt-5" items={metrics} />

          <ScimEndpointCard />

          <div className="mt-5">
            {tokens.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="No SCIM tokens yet"
                description="Generate a token to connect your identity provider for automated user provisioning."
                action={<GenerateTokenButton canMint={canMint} onClick={() => setGenOpen(true)} />}
              />
            ) : (
              <DataTable
                columns={columns}
                data={tokens}
                getRowId={(t) => t.id}
                searchPlaceholder="Search tokens..."
                showSelectionCount={false}
              />
            )}
          </div>
        </>
      )}

      <GenerateTokenDialog
        open={genOpen}
        onOpenChange={setGenOpen}
        onCreated={(plaintext) => {
          setNewToken(plaintext)
          mutate()
        }}
      />
      <RevealTokenDialog value={newToken} onClose={() => setNewToken('')} />
    </Main>
  )
}
