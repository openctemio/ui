'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, Trash2, Copy, Check } from 'lucide-react'
import { Main } from '@/components/layout'
import { PageHeader } from '@/features/shared'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { copyToClipboard } from '@/lib/clipboard'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { usePermissions } from '@/context/permission-provider'
import {
  useSamlConfig,
  useSaveSamlConfig,
  useDeleteSamlConfig,
} from '@/features/saml/api/use-saml-config'
import { emptySamlConfig, type SamlConfig } from '@/features/saml/types/saml.types'

function CopyableUrl({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="space-y-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="bg-muted flex-1 truncate rounded px-2 py-1 text-xs">{url}</code>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={async () => {
            await copyToClipboard(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

export default function SamlSettingsPage() {
  const { currentTenant } = useTenant()
  const { hasPermission } = usePermissions()
  const canManage = hasPermission('team:admin')

  const { data, isLoading, mutate } = useSamlConfig()
  const { trigger: save, isMutating: isSaving } = useSaveSamlConfig()
  const { trigger: remove, isMutating: isDeleting } = useDeleteSamlConfig()

  const [form, setForm] = useState<SamlConfig>(emptySamlConfig)
  const [domainsText, setDomainsText] = useState('')

  useEffect(() => {
    if (data) {
      setForm(data)
      setDomainsText((data.allowed_domains ?? []).join(', '))
    }
  }, [data])

  const spURLs = useMemo(() => {
    const slug = currentTenant?.slug
    if (!slug || typeof window === 'undefined') return null
    const base = `${window.location.origin}/api/v1/auth/saml/${slug}`
    return {
      metadata: `${base}/metadata`,
      acs: `${base}/acs`,
      login: `${base}/login`,
    }
  }, [currentTenant?.slug])

  const set = <K extends keyof SamlConfig>(key: K, value: SamlConfig[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    const payload: SamlConfig = {
      ...form,
      allowed_domains: domainsText
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean),
    }
    try {
      await save(payload)
      toast.success('SAML configuration saved')
      void mutate()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to save SAML configuration'))
    }
  }

  const handleDelete = async () => {
    try {
      await remove()
      toast.success('SAML configuration removed')
      setForm(emptySamlConfig)
      setDomainsText('')
      void mutate()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to remove SAML configuration'))
    }
  }

  return (
    <Main>
      <PageHeader
        title="SAML Single Sign-On"
        description="Federate login through your SAML 2.0 identity provider (Okta, EntraID, ADFS)."
      />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Identity Provider
                </CardTitle>
                <CardDescription>
                  Paste the details from your IdP&apos;s SAML application. Login stays disabled
                  until you enable it below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="idp_entity_id">IdP Entity ID (Issuer)</Label>
                  <Input
                    id="idp_entity_id"
                    value={form.idp_entity_id}
                    disabled={!canManage}
                    onChange={(e) => set('idp_entity_id', e.target.value)}
                    placeholder="https://idp.example.com/saml/metadata"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idp_sso_url">IdP SSO URL</Label>
                  <Input
                    id="idp_sso_url"
                    value={form.idp_sso_url}
                    disabled={!canManage}
                    onChange={(e) => set('idp_sso_url', e.target.value)}
                    placeholder="https://idp.example.com/sso/saml"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idp_certificate">IdP Signing Certificate (PEM)</Label>
                  <Textarea
                    id="idp_certificate"
                    value={form.idp_certificate}
                    disabled={!canManage}
                    onChange={(e) => set('idp_certificate', e.target.value)}
                    placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
                    className="min-h-[140px] font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provisioning</CardTitle>
                <CardDescription>How users are mapped when they log in via SAML.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="allowed_domains">Allowed email domains</Label>
                  <Input
                    id="allowed_domains"
                    value={domainsText}
                    disabled={!canManage}
                    onChange={(e) => setDomainsText(e.target.value)}
                    placeholder="acme.com, contoso.com (blank = any)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default role for new users</Label>
                  <Select
                    value={form.default_role}
                    disabled={!canManage}
                    onValueChange={(v) => set('default_role', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Auto-provision users</p>
                    <p className="text-muted-foreground text-xs">
                      Create an account on first login for allowed domains.
                    </p>
                  </div>
                  <Switch
                    checked={form.auto_provision}
                    disabled={!canManage}
                    onCheckedChange={(v) => set('auto_provision', v)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Enable SAML login</p>
                    <p className="text-muted-foreground text-xs">
                      When off, SAML is configured but the login endpoint refuses requests.
                    </p>
                  </div>
                  <Switch
                    checked={form.enabled}
                    disabled={!canManage}
                    onCheckedChange={(v) => set('enabled', v)}
                  />
                </div>
              </CardContent>
            </Card>

            {canManage && (
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save configuration'}
                </Button>
                {data && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" disabled={isDeleting}>
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove SAML configuration?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Users will no longer be able to log in through your identity provider.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Provider details</CardTitle>
                <CardDescription>
                  Register these URLs in your IdP&apos;s SAML application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {spURLs ? (
                  <>
                    <CopyableUrl label="Metadata / Entity ID" url={spURLs.metadata} />
                    <CopyableUrl label="ACS (Reply) URL" url={spURLs.acs} />
                    <Separator />
                    <CopyableUrl label="Login URL (SP-initiated)" url={spURLs.login} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Service provider URLs appear once a tenant is selected.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </Main>
  )
}
