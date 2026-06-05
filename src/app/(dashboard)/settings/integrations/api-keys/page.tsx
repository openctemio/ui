'use client'

import { useMemo, useState } from 'react'
import { Main } from '@/components/layout'
import { PageHeader, EmptyState } from '@/features/shared'
import { StatsCard } from '@/features/shared/components/stats-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  KeyRound,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Ban,
  Trash2,
  Copy,
  Check,
} from 'lucide-react'
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useDeleteApiKey,
} from '@/features/api-keys/api/use-api-keys'
import type { APIKey } from '@/features/api-keys/types/api-key.types'
import { toast } from 'sonner'

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

function StatusBadge({ k }: { k: APIKey }) {
  if (k.status === 'revoked' || k.revoked_at) {
    return <Badge className="border-0 bg-red-500/10 text-red-600 dark:text-red-400">Revoked</Badge>
  }
  if (isExpired(k)) {
    return (
      <Badge className="border-0 bg-orange-500/10 text-orange-600 dark:text-orange-400">
        Expired
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
  )
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
    await navigator.clipboard.writeText(value)
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
// Key row
// ─────────────────────────────────────────────────────────

function KeyRow({ k, onChanged }: { k: APIKey; onChanged: () => void }) {
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
    <TableRow>
      <TableCell>
        <div className="font-medium">{k.name}</div>
        <code className="text-muted-foreground text-xs">{k.key_prefix}…</code>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {k.scopes.slice(0, 3).map((s) => (
            <Badge key={s} variant="secondary" className="font-mono text-[10px]">
              {s}
            </Badge>
          ))}
          {k.scopes.length > 3 && (
            <Badge variant="outline" className="text-[10px]">
              +{k.scopes.length - 3}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge k={k} />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {isActive(k) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRevoke}
              disabled={revoking}
              title="Revoke"
            >
              <Ban className="h-4 w-4 text-orange-500" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteOpen(true)}
            title="Delete"
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {k.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Any client using this key will immediately lose access. This cannot be undone.
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
                {deleting ? 'Deleting...' : 'Delete'}
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
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-lg" />
    </Main>
  )
}

export default function APIKeysPage() {
  const { data, isLoading, mutate } = useApiKeys()
  const [genOpen, setGenOpen] = useState(false)
  const [newKey, setNewKey] = useState('')

  const keys = useMemo(() => data?.data ?? [], [data])
  const stats = useMemo(() => {
    const active = keys.filter(isActive).length
    const expired = keys.filter(isExpired).length
    const scopes = new Set<string>()
    keys.forEach((k) => k.scopes.forEach((s) => scopes.add(s)))
    return { total: keys.length, active, expired, scopes: scopes.size }
  }, [keys])

  if (isLoading) return <LoadingSkeleton />

  return (
    <Main>
      <PageHeader title="API Keys" description="Manage API keys for programmatic access">
        <Button size="sm" onClick={() => setGenOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          Generate API Key
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatsCard title="Total Keys" value={stats.total} icon={KeyRound} description="All keys" />
        <StatsCard
          title="Active Keys"
          value={stats.active}
          icon={ShieldCheck}
          changeType={stats.active > 0 ? 'positive' : 'neutral'}
          description="Currently valid"
        />
        <StatsCard
          title="Expired Keys"
          value={stats.expired}
          icon={AlertTriangle}
          changeType={stats.expired > 0 ? 'negative' : 'neutral'}
          description="Need rotation"
        />
        <StatsCard
          title="Unique Scopes"
          value={stats.scopes}
          icon={Eye}
          description="Permissions granted"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Each key is scoped to specific permissions and can be set to expire automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys yet"
              description="Generate a scoped key for programmatic access to the API."
              card={false}
              action={
                <Button size="sm" onClick={() => setGenOpen(true)}>
                  <Plus className="me-2 h-4 w-4" />
                  Generate API Key
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <KeyRow key={k.id} k={k} onChanged={() => mutate()} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
