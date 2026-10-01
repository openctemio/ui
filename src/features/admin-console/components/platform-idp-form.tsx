'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { deletePlatformIdP, savePlatformIdP } from '../api/use-platform-idp'
import { adminErrorMessage } from './totp-step-form'
import type { PlatformIdP, PlatformIdPInput } from '../types'

/** Splits a comma- or space-separated list. */
export function parseList(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter(Boolean)
}

export function defaultRedirectURI(): string {
  return typeof window === 'undefined' ? '' : `${window.location.origin}/admin/login/callback`
}

interface FormState {
  enabled: boolean
  displayName: string
  issuer: string
  clientID: string
  clientSecret: string
  redirectURI: string
  scopes: string
  requireIdP: boolean
  trustedACR: string
  trustedAMR: string
}

function toForm(p: PlatformIdP | undefined): FormState {
  return {
    enabled: p?.configured ? p.enabled : true,
    displayName: p?.display_name ?? '',
    issuer: p?.issuer ?? '',
    clientID: p?.client_id ?? '',
    clientSecret: '',
    redirectURI: p?.redirect_uri ?? defaultRedirectURI(),
    scopes: (p?.scopes ?? ['openid', 'email', 'profile']).join(' '),
    requireIdP: p?.require_idp ?? false,
    trustedACR: (p?.trusted_acr_values ?? []).join(', '),
    trustedAMR: (p?.trusted_amr_values ?? []).join(', '),
  }
}

/** The request body for the form state. An empty secret keeps the stored one. */
export function toInput(f: FormState): PlatformIdPInput {
  const input: PlatformIdPInput = {
    enabled: f.enabled,
    display_name: f.displayName.trim(),
    issuer: f.issuer.trim(),
    client_id: f.clientID.trim(),
    redirect_uri: f.redirectURI.trim(),
    scopes: parseList(f.scopes),
    require_idp: f.requireIdP,
    trusted_acr_values: parseList(f.trustedACR),
    trusted_amr_values: parseList(f.trustedAMR),
  }
  if (f.clientSecret) input.client_secret = f.clientSecret
  return input
}

/**
 * The administrators' identity provider (System -> Admin sign-in). Platform
 * level, unrelated to any organization's identity providers. OIDC only.
 */
export function PlatformIdPForm({
  idp,
  hasBreakGlass,
  onSaved,
}: {
  idp: PlatformIdP
  /** An active break-glass super admin exists (required for "require IdP"). */
  hasBreakGlass: boolean
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(() => toForm(idp))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRequire, setConfirmRequire] = useState(false)

  useEffect(() => setForm(toForm(idp)), [idp])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const turningOnRequire = form.requireIdP && form.enabled && !idp.require_idp
  const requireBlocked = !hasBreakGlass && !idp.require_idp
  const trustsIdPMFA = useMemo(
    () => parseList(form.trustedACR).length > 0 || parseList(form.trustedAMR).length > 0,
    [form.trustedACR, form.trustedAMR]
  )

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await savePlatformIdP(toInput(form))
      toast.success('Admin sign-in saved')
      onSaved()
    } catch (e) {
      setError(adminErrorMessage(e, 'Could not save the identity provider'))
    } finally {
      setBusy(false)
      setConfirmRequire(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (turningOnRequire) {
      setConfirmRequire(true)
      return
    }
    void save()
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deletePlatformIdP()
      toast.success('Identity provider removed; administrators sign in with their password')
      onSaved()
    } catch (e) {
      toast.error(adminErrorMessage(e, 'Could not remove the identity provider'))
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Identity provider (OIDC)</CardTitle>
          <CardDescription>
            Administrators can sign in to this console with your organization-wide identity
            provider. Only existing administrators can: an identity is matched to the administrator
            with the same verified email on first sign-in, then by its subject. No administrator is
            ever created from the IdP. Organization identity providers are configured per
            organization and never open this console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="text-sm">
              <p className="font-medium">Offer on the console sign-in page</p>
              <p className="text-muted-foreground">Off keeps the configuration but hides it.</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set('enabled', v)}
              aria-label="Enable the identity provider"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="idp-name">Button label</Label>
              <Input
                id="idp-name"
                required
                maxLength={100}
                placeholder="Contoso Entra ID"
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idp-issuer">Issuer URL</Label>
              <Input
                id="idp-issuer"
                required
                type="url"
                placeholder="https://login.example.com/realm"
                value={form.issuer}
                onChange={(e) => set('issuer', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idp-client-id">Client ID</Label>
              <Input
                id="idp-client-id"
                required
                value={form.clientID}
                onChange={(e) => set('clientID', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idp-client-secret">Client secret</Label>
              <Input
                id="idp-client-secret"
                type="password"
                autoComplete="new-password"
                required={!idp.has_client_secret}
                placeholder={idp.has_client_secret ? 'Stored. Leave empty to keep it.' : ''}
                value={form.clientSecret}
                onChange={(e) => set('clientSecret', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idp-redirect">Redirect URI</Label>
            <Input
              id="idp-redirect"
              required
              value={form.redirectURI}
              onChange={(e) => set('redirectURI', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Register this exact URI with the identity provider. It is the console page that
              finishes the sign-in.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idp-scopes">Scopes</Label>
            <Input
              id="idp-scopes"
              value={form.scopes}
              onChange={(e) => set('scopes', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Must include openid. The email claim must be verified for the first sign-in.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Second factor</CardTitle>
          <CardDescription>
            By default the console still asks for its own 6-digit code after the identity provider:
            the console cannot see how the IdP authenticated the person, and a weak IdP policy would
            otherwise be enough to reach every organization. Trust the IdP&apos;s MFA only if it
            enforces phishing-resistant MFA and reports it in the token.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="idp-acr">Trusted acr values</Label>
            <Input
              id="idp-acr"
              placeholder="e.g. urn:example:mfa"
              value={form.trustedACR}
              onChange={(e) => set('trustedACR', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Requested from the IdP; a token with one of them skips the console code.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="idp-amr">Trusted amr values</Label>
            <Input
              id="idp-amr"
              placeholder="e.g. hwk, mfa"
              value={form.trustedAMR}
              onChange={(e) => set('trustedAMR', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A token whose amr contains one of them skips the console code.
            </p>
          </div>
          {trustsIdPMFA && (
            <Alert className="sm:col-span-2">
              <AlertDescription>
                The console code is skipped for tokens that carry a trusted value. Leave both empty
                to always require it.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Require the identity provider</CardTitle>
          <CardDescription>
            Password sign-in to the console is refused for every administrator except break-glass
            accounts, which stay local so the console is reachable when the IdP is down. Turning it
            on signs out administrators who are in the console with a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="text-sm">
              <p className="font-medium">{form.requireIdP ? 'Required' : 'Not required'}</p>
              {requireBlocked && (
                <p className="text-muted-foreground">
                  Add an active break-glass super admin first (Administrators).
                </p>
              )}
            </div>
            <Switch
              checked={form.requireIdP}
              disabled={requireBlocked && !form.requireIdP}
              onCheckedChange={(v) => set('requireIdP', v)}
              aria-label="Require the identity provider"
            />
          </div>
        </CardContent>
      </Card>

      {idp.configured && idp.token_endpoint && (
        <Card>
          <CardHeader>
            <CardTitle>Discovered endpoints</CardTitle>
            <CardDescription>
              Read from the issuer&apos;s OpenID configuration when the settings were saved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Authorization</dt>
              <dd className="min-w-0 break-all">{idp.authorization_endpoint}</dd>
              <dt className="text-muted-foreground">Token</dt>
              <dd className="min-w-0 break-all">
                {idp.token_endpoint} ({idp.token_endpoint_auth_method})
              </dd>
              <dt className="text-muted-foreground">Signing keys</dt>
              <dd className="min-w-0 break-all">{idp.jwks_uri}</dd>
            </dl>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {idp.configured && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
          >
            Remove
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="me-2 size-4 animate-spin" />}
          Save
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remove the identity provider?"
        desc="Administrators sign in with their password and the console code again. Their IdP bindings are kept for the same issuer."
        confirmText="Remove"
        destructive
        isLoading={busy}
        handleConfirm={() => void remove()}
      />
      <ConfirmDialog
        open={confirmRequire}
        onOpenChange={setConfirmRequire}
        title="Require the identity provider?"
        desc="Administrators who are not break-glass accounts can no longer use their password for the console, and those in the console with a password are signed out now (you too, if you signed in with a password)."
        confirmText="Require it"
        destructive
        isLoading={busy}
        handleConfirm={() => void save()}
      />
    </form>
  )
}
