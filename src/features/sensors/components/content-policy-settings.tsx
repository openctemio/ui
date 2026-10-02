'use client'

import { useState } from 'react'
import { Info, Lock, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { TagInput } from '@/components/ui/tag-input'
import { ErrorState, PageHeader, RelativeTime } from '@/features/shared'
import { getErrorMessage } from '@/lib/api/error-handler'
import { updateContentPolicy, useContentPolicy } from '@/lib/api/sensor-content-hooks'
import type { ContentPolicy, ContentPolicyResponse } from '@/lib/api/sensor-types'
import { Permission, useHasPermission } from '@/lib/permissions'

import { POLICY_CONTENT, contentLabel } from '../lib/content'
import {
  PIN_KIND,
  formToPolicy,
  hoursPlaceholder,
  policyToForm,
  type ContentPolicyForm,
} from '../lib/content-policy'

const FORM_ID = 'content-policy-form'
export const SENSOR_CONTENT_DOCS_URL =
  'https://github.com/openctemio/sensor#scanner-content-updates'

const PIN_HELP: Record<string, string> = {
  digest: 'Pin a database by its OCI digest (sha256:…). Empty: the newest the mirror has.',
  tag: 'Pin a template release (v10.4.9). Empty: the newest release.',
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {error}
    </p>
  )
}

function PolicyForm({
  data,
  canWrite,
  onSaved,
}: {
  data: ContentPolicyResponse
  canWrite: boolean
  onSaved: (policy: ContentPolicy) => void
}) {
  const [form, setForm] = useState<ContentPolicyForm>(() => policyToForm(data.policy))
  const [applyNow, setApplyNow] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const defaults = data.defaults ?? { content: {} }
  const readOnly = !canWrite || saving

  const setPin = (name: string, patch: Partial<ContentPolicyForm['content'][string]>) =>
    setForm((f) => ({ ...f, content: { ...f.content, [name]: { ...f.content[name], ...patch } } }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { policy, errors: errs } = formToPolicy(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setSaving(true)
    try {
      const res = await updateContentPolicy({ policy, apply_now: applyNow })
      toast.success(
        applyNow
          ? `Content policy saved and sent to ${res.commands_created} ${res.commands_created === 1 ? 'sensor' : 'sensors'}.`
          : 'Content policy saved. Sensors get it with their next refresh request.'
      )
      onSaved(res.policy)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the content policy'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5" aria-label="Content policy">
      <Card>
        <CardHeader>
          <CardTitle>Refresh schedule</CardTitle>
          <CardDescription>
            How often sensors check for new content. Content older than its maximum age is refreshed
            at the next check, and the sensor shows as degraded until it is.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-xs gap-1.5">
            <Label htmlFor="refresh-interval">Check every (hours)</Label>
            <Input
              id="refresh-interval"
              inputMode="numeric"
              value={form.refreshIntervalHours}
              placeholder={hoursPlaceholder(defaults.refresh_interval_hours)}
              disabled={readOnly}
              aria-invalid={!!errors.refreshIntervalHours}
              aria-describedby="refresh-interval-error"
              onChange={(e) => setForm((f) => ({ ...f, refreshIntervalHours: e.target.value }))}
            />
            <FieldError id="refresh-interval-error" error={errors.refreshIntervalHours} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Maximum age and an optional pinned version per kind of content. Empty fields use the
            platform default shown in grey.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {POLICY_CONTENT.map((name) => {
            const f = form.content[name]
            const kind = PIN_KIND[name]
            const def = defaults.content?.[name]
            return (
              <div
                key={name}
                className="grid grid-cols-1 gap-4 py-4 first:pt-0 last:pb-0 md:grid-cols-[12rem_10rem_minmax(0,1fr)]"
                data-content={name}
              >
                <p className="text-sm font-medium md:pt-7">{contentLabel(name)}</p>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${name}-max-age`}>Maximum age (hours)</Label>
                  <Input
                    id={`${name}-max-age`}
                    inputMode="numeric"
                    value={f.maxAgeHours}
                    placeholder={hoursPlaceholder(def?.max_age_hours)}
                    disabled={readOnly}
                    aria-invalid={!!errors[`${name}.maxAgeHours`]}
                    aria-describedby={`${name}-max-age-error`}
                    onChange={(e) => setPin(name, { maxAgeHours: e.target.value })}
                  />
                  <FieldError id={`${name}-max-age-error`} error={errors[`${name}.maxAgeHours`]} />
                </div>
                {kind === 'rulesets' ? (
                  <div className="grid gap-1.5">
                    <Label>Rulesets</Label>
                    <TagInput
                      value={f.rulesets}
                      onChange={(rulesets) => setPin(name, { rulesets })}
                      placeholder="p/default, then Enter"
                      maxTags={32}
                      disabled={readOnly}
                    />
                    <p className="text-xs text-muted-foreground">
                      Empty: semgrep fetches its own rules on every scan (--config auto, not
                      controlled). Rulesets here are fetched, verified and pinned by the sensor, and
                      change the rules scans use.
                    </p>
                    <FieldError id={`${name}-rulesets-error`} error={errors[`${name}.rulesets`]} />
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor={`${name}-version`}>Pinned version</Label>
                    <Input
                      id={`${name}-version`}
                      className="font-mono"
                      value={f.version}
                      placeholder={kind === 'digest' ? 'sha256:…' : 'v10.4.9'}
                      disabled={readOnly}
                      aria-invalid={!!errors[`${name}.version`]}
                      aria-describedby={`${name}-version-help`}
                      onChange={(e) => setPin(name, { version: e.target.value })}
                    />
                    <p id={`${name}-version-help`} className="text-xs text-muted-foreground">
                      {PIN_HELP[kind]}
                    </p>
                    <FieldError id={`${name}-version-error`} error={errors[`${name}.version`]} />
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {canWrite && (
        <div className="flex items-center gap-2">
          <Switch
            id="apply-now"
            checked={applyNow}
            onCheckedChange={setApplyNow}
            disabled={saving}
          />
          <Label htmlFor="apply-now">Apply to sensors now</Label>
          <span className="text-xs text-muted-foreground">
            Sends the policy with a refresh request to every sensor that manages its content.
          </span>
        </div>
      )}
    </form>
  )
}

/**
 * Settings → Scanning → Scanner content (api RFC-031): the tenant's policy for
 * the data scanners use (refresh interval, maximum age, pinned versions,
 * semgrep rulesets). Sources and mirrors are the sensor host's configuration.
 * Read-only without sensors:write.
 */
export function ContentPolicySettings() {
  const canWrite = useHasPermission(Permission.SensorsWrite)
  const { data, error, isLoading, mutate } = useContentPolicy()
  // Re-mount the form after a save so it shows what the API stored.
  const [formKey, setFormKey] = useState(0)

  return (
    <>
      <PageHeader
        title="Scanner content"
        description="How fresh the vulnerability databases, templates and rules your sensors scan with must be."
      >
        {canWrite && data && (
          <Button type="submit" form={FORM_ID} size="sm">
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        )}
      </PageHeader>

      <div className="mt-5 space-y-5">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p>
              Where content comes from (registries, mirrors, a local directory for air-gapped hosts)
              is configured on each sensor host, never here, so the platform cannot point sensors at
              other content.{' '}
              <a
                href={SENSOR_CONTENT_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Scanner content updates
              </a>
            </p>
          </AlertDescription>
        </Alert>

        {!canWrite && (
          <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Changing the content policy needs an admin.
          </p>
        )}

        {error ? (
          <ErrorState title="the content policy" error={error} onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <div className="space-y-5" aria-busy>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : (
          <>
            <PolicyForm
              key={formKey}
              data={data}
              canWrite={canWrite}
              onSaved={async () => {
                await mutate()
                setFormKey((k) => k + 1)
              }}
            />
            {data.updated_at && (
              <p className="text-xs text-muted-foreground">
                Last changed <RelativeTime date={data.updated_at} className="text-xs" />
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
