'use client'

import { useEffect, useMemo, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { KeyRound, Plus, ShieldCheck, Ban, Copy, Check, Link2 } from 'lucide-react'
import {
  useScimTokens,
  useCreateScimToken,
  useRevokeScimToken,
} from '@/features/scim-tokens/api/use-scim-tokens'
import type { ScimToken } from '@/features/scim-tokens/types/scim-token.types'
import { copyToClipboard } from '@/lib/clipboard'
import { getErrorMessage } from '@/lib/api/error-handler'
import { toast } from 'sonner'

function isActive(t: ScimToken): boolean {
  return t.status === 'active'
}

function StatusBadge({ t }: { t: ScimToken }) {
  if (!isActive(t)) {
    return <Badge className="border-0 bg-red-500/10 text-red-600 dark:text-red-400">Revoked</Badge>
  }
  return (
    <Badge className="border-0 bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
  )
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
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          SCIM endpoint
        </CardTitle>
        <CardDescription>
          Configure your identity provider (Okta, Microsoft Entra ID, etc.) with this base URL and a
          token below. Authentication uses an HTTP bearer token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted flex items-center gap-2 rounded-md p-3">
          <code className="flex-1 break-all text-xs">{baseURL || '…'}</code>
          <Button size="icon" variant="ghost" onClick={copy} title="Copy" disabled={!baseURL}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// Token row
// ─────────────────────────────────────────────────────────

function TokenRow({ t, onChanged }: { t: ScimToken; onChanged: () => void }) {
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
    <TableRow>
      <TableCell>
        <div className="font-medium">{t.name}</div>
        <code className="text-muted-foreground text-xs">{t.prefix}…</code>
      </TableCell>
      <TableCell>
        <StatusBadge t={t} />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {new Date(t.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {t.last_used_at ? new Date(t.last_used_at).toLocaleDateString() : 'Never'}
      </TableCell>
      <TableCell className="text-right">
        {isActive(t) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRevokeOpen(true)}
            title="Revoke"
            className="text-red-500 hover:text-red-600"
          >
            <Ban className="h-4 w-4" />
          </Button>
        )}
        <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke {t.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Your identity provider will immediately lose access to SCIM provisioning with this
                token. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  void handleRevoke()
                }}
                disabled={revoking}
                className="bg-red-600 hover:bg-red-700"
              >
                {revoking ? 'Revoking...' : 'Revoke'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <Main>
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-lg" />
    </Main>
  )
}

export default function ScimTokensPage() {
  const { data, isLoading, mutate } = useScimTokens()
  const [genOpen, setGenOpen] = useState(false)
  const [newToken, setNewToken] = useState('')

  const tokens = useMemo(() => data?.tokens ?? [], [data])
  const stats = useMemo(() => {
    const active = tokens.filter(isActive).length
    return { total: tokens.length, active, revoked: tokens.length - active }
  }, [tokens])

  if (isLoading) return <LoadingSkeleton />

  return (
    <Main>
      <PageHeader
        title="SCIM Provisioning"
        description="Automate user provisioning and deprovisioning from your identity provider"
      >
        <Button size="sm" onClick={() => setGenOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          Generate token
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total tokens"
          value={stats.total}
          icon={KeyRound}
          description="All tokens"
        />
        <StatsCard
          title="Active tokens"
          value={stats.active}
          icon={ShieldCheck}
          changeType={stats.active > 0 ? 'positive' : 'neutral'}
          description="Currently valid"
        />
        <StatsCard
          title="Revoked"
          value={stats.revoked}
          icon={Ban}
          description="No longer usable"
        />
      </div>

      <ScimEndpointCard />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            SCIM tokens
          </CardTitle>
          <CardDescription>
            Each token authenticates your identity provider for SCIM 2.0 user provisioning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No SCIM tokens yet"
              description="Generate a token to connect your identity provider for automated user provisioning."
              card={false}
              action={
                <Button size="sm" onClick={() => setGenOpen(true)}>
                  <Plus className="me-2 h-4 w-4" />
                  Generate token
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => (
                  <TokenRow key={t.id} t={t} onChanged={() => mutate()} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
