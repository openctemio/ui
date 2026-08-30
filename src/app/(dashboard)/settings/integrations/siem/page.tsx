'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Shield, Plus, Send, Trash2, Loader2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { Main } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'
import { csrfFetch } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/error-handler'
import { Can, Permission } from '@/lib/permissions'
import {
  useNotificationIntegrationsApi,
  useCreateNotificationIntegrationApi,
  invalidateNotificationIntegrationsCache,
} from '@/features/integrations'
import type { Integration } from '@/features/integrations'

const META = (i: Integration, k: string): string => {
  const v = i.metadata?.[k]
  return typeof v === 'string' ? v : ''
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === 'connected'
  return (
    <Badge variant={ok ? 'default' : 'secondary'} className="gap-1">
      {ok ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
      {status}
    </Badge>
  )
}

export default function SIEMIntegrationPage() {
  const { data, isLoading, mutate } = useNotificationIntegrationsApi()
  const { trigger: createIntegration, isMutating: creating } = useCreateNotificationIntegrationApi()

  const splunkIntegrations = useMemo(
    () => (data?.data ?? []).filter((i) => i.provider === 'splunk'),
    [data]
  )

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', hecUrl: '', token: '', index: '', sourcetype: '' })
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Integration | null>(null)
  const [deleting, setDeleting] = useState(false)

  const resetForm = () => setForm({ name: '', hecUrl: '', token: '', index: '', sourcetype: '' })

  const handleCreate = useCallback(async () => {
    if (!form.name.trim() || !form.hecUrl.trim() || !form.token.trim()) {
      toast.error('Name, HEC endpoint URL, and HEC token are required')
      return
    }
    try {
      await createIntegration({
        name: form.name.trim(),
        provider: 'splunk',
        auth_type: 'token',
        credentials: form.token.trim(),
        metadata: {
          hec_url: form.hecUrl.trim(),
          index: form.index.trim(),
          sourcetype: form.sourcetype.trim(),
        },
      })
      toast.success('Splunk HEC integration created')
      resetForm()
      setShowForm(false)
      await invalidateNotificationIntegrationsCache()
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }, [form, createIntegration, mutate])

  const handleTest = useCallback(async (integration: Integration) => {
    setTestingId(integration.id)
    try {
      const res = await csrfFetch(`/api/v1/integrations/${integration.id}/test-notification`, {
        method: 'POST',
      })
      if (res.ok) {
        toast.success('Test event delivered to Splunk')
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error(body?.error || `Test failed (HTTP ${res.status})`)
      }
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setTestingId(null)
    }
  }, [mutate])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await csrfFetch(`/api/v1/integrations/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`)
      toast.success('Integration deleted')
      setDeleteTarget(null)
      await invalidateNotificationIntegrationsCache()
      await mutate()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, mutate])

  return (
    <Main>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/settings/integrations">
            <ArrowLeft className="size-4" /> Integrations
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Shield className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">SIEM Integration</h1>
              <p className="text-muted-foreground max-w-2xl text-sm">
                Forward findings, exposures, scans, and SLA breaches to Splunk via the HTTP Event
                Collector (HEC) for centralized monitoring and correlation.
              </p>
            </div>
          </div>
          <Can permission={Permission.IntegrationsManage}>
            <Button onClick={() => setShowForm((v) => !v)} disabled={showForm}>
              <Plus className="size-4" /> Add Splunk HEC
            </Button>
          </Can>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">New Splunk HEC integration</CardTitle>
            <CardDescription>
              The HEC token is stored encrypted. The endpoint, index, and sourcetype are
              non-sensitive routing config.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="siem-name">Name</Label>
                <Input
                  id="siem-name"
                  placeholder="Production Splunk"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siem-url">HEC endpoint URL</Label>
                <Input
                  id="siem-url"
                  placeholder="https://splunk.example.com:8088"
                  value={form.hecUrl}
                  onChange={(e) => setForm({ ...form, hecUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="siem-token">HEC token</Label>
                <Input
                  id="siem-token"
                  type="password"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siem-index">Index (optional)</Label>
                <Input
                  id="siem-index"
                  placeholder="main"
                  value={form.index}
                  onChange={(e) => setForm({ ...form, index: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siem-sourcetype">Sourcetype (optional)</Label>
                <Input
                  id="siem-sourcetype"
                  placeholder="openctem:notification"
                  value={form.sourcetype}
                  onChange={(e) => setForm({ ...form, sourcetype: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleCreate()} disabled={creating}>
                {creating && <Loader2 className="size-4 animate-spin" />}
                Create integration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : splunkIntegrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Shield className="text-muted-foreground size-8" />
            <p className="font-medium">No SIEM integrations yet</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              Add a Splunk HTTP Event Collector to start forwarding security events to your SIEM.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {splunkIntegrations.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{integration.name}</span>
                    <StatusBadge status={integration.status} />
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {META(integration, 'hec_url')}
                    {META(integration, 'index') && ` · index: ${META(integration, 'index')}`}
                    {META(integration, 'sourcetype') &&
                      ` · sourcetype: ${META(integration, 'sourcetype')}`}
                  </p>
                  {integration.status_message && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {integration.status_message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Can permission={Permission.IntegrationsManage}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleTest(integration)}
                      disabled={testingId === integration.id}
                    >
                      {testingId === integration.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Test
                    </Button>
                  </Can>
                  <Can permission={Permission.IntegrationsManage}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(integration)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Can>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete SIEM integration"
        desc={`Stop forwarding events to "${deleteTarget?.name ?? ''}"? This cannot be undone.`}
        confirmText="Delete"
        destructive
        isLoading={deleting}
        handleConfirm={() => void handleDelete()}
      />
    </Main>
  )
}
