'use client'

import React from 'react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { AlertCircle, PlayCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import {
  type AssetLifecycleSettings,
  DEFAULT_LIFECYCLE_SETTINGS,
  MIN_THRESHOLD_DAYS,
  MAX_THRESHOLD_DAYS,
  MIN_GRACE_DAYS,
  MAX_GRACE_DAYS,
  KNOWN_SOURCE_TYPES,
} from '../types'
import { updateAssetLifecycleSettings } from '../api'
import { DryRunDialog } from './dry-run-dialog'

interface LifecycleSettingsFormProps {
  initial: AssetLifecycleSettings
}

type FormState = {
  enabled: boolean
  stale_threshold_days: string
  grace_period_days: string
  manual_reactivation_grace_days: string
  pause_on_integration_failure: boolean
  excluded_source_types: string[]
  dry_run_completed_at?: number | null
}

function toFormState(s: AssetLifecycleSettings): FormState {
  return {
    enabled: s.enabled,
    stale_threshold_days: String(
      s.stale_threshold_days ?? DEFAULT_LIFECYCLE_SETTINGS.stale_threshold_days
    ),
    grace_period_days: String(s.grace_period_days ?? DEFAULT_LIFECYCLE_SETTINGS.grace_period_days),
    manual_reactivation_grace_days: String(
      s.manual_reactivation_grace_days ?? DEFAULT_LIFECYCLE_SETTINGS.manual_reactivation_grace_days
    ),
    pause_on_integration_failure:
      s.pause_on_integration_failure ??
      DEFAULT_LIFECYCLE_SETTINGS.pause_on_integration_failure ??
      true,
    excluded_source_types:
      s.excluded_source_types ?? DEFAULT_LIFECYCLE_SETTINGS.excluded_source_types ?? [],
    dry_run_completed_at: s.dry_run_completed_at ?? null,
  }
}

function toPayload(form: FormState): AssetLifecycleSettings {
  return {
    enabled: form.enabled,
    stale_threshold_days: Number(form.stale_threshold_days),
    grace_period_days: Number(form.grace_period_days),
    manual_reactivation_grace_days: Number(form.manual_reactivation_grace_days),
    pause_on_integration_failure: form.pause_on_integration_failure,
    excluded_source_types: form.excluded_source_types,
    dry_run_completed_at: form.dry_run_completed_at,
  }
}

function validate(form: FormState): string | null {
  const stale = Number(form.stale_threshold_days)
  if (!Number.isInteger(stale) || stale < MIN_THRESHOLD_DAYS || stale > MAX_THRESHOLD_DAYS) {
    return `Stale threshold must be between ${MIN_THRESHOLD_DAYS} and ${MAX_THRESHOLD_DAYS} days.`
  }
  const grace = Number(form.grace_period_days)
  if (!Number.isInteger(grace) || grace < MIN_GRACE_DAYS || grace > MAX_GRACE_DAYS) {
    return `Grace period must be between ${MIN_GRACE_DAYS} and ${MAX_GRACE_DAYS} days.`
  }
  const reactGrace = Number(form.manual_reactivation_grace_days)
  if (
    !Number.isInteger(reactGrace) ||
    reactGrace < MIN_THRESHOLD_DAYS ||
    reactGrace > MAX_THRESHOLD_DAYS
  ) {
    return `Manual reactivation grace must be between ${MIN_THRESHOLD_DAYS} and ${MAX_THRESHOLD_DAYS} days.`
  }
  return null
}

export function LifecycleSettingsForm({ initial }: LifecycleSettingsFormProps) {
  const { currentTenant } = useTenant()
  const { mutate } = useSWRConfig()
  const [form, setForm] = React.useState<FormState>(() => toFormState(initial))
  const [submitting, setSubmitting] = React.useState(false)
  const [dryRunOpen, setDryRunOpen] = React.useState(false)

  const needsDryRun = form.enabled && !form.dry_run_completed_at
  const dryRunDone = !!form.dry_run_completed_at

  const toggleExcludedType = (value: string) => {
    setForm((s) => {
      const has = s.excluded_source_types.includes(value)
      return {
        ...s,
        excluded_source_types: has
          ? s.excluded_source_types.filter((x) => x !== value)
          : [...s.excluded_source_types, value],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentTenant) return
    const err = validate(form)
    if (err) {
      toast.error(err)
      return
    }
    try {
      setSubmitting(true)
      const saved = await updateAssetLifecycleSettings(currentTenant.id, toPayload(form))
      toast.success('Lifecycle settings saved')
      setForm(toFormState(saved))
      void mutate(`/api/v1/tenants/${currentTenant.id}/settings/asset-lifecycle`, saved, false)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDryRunSuccess = (timestamp: number) => {
    // Backend stamps DryRunCompletedAt server-side on success; reflect
    // it locally so the enable toggle unlocks without a full refetch.
    setForm((s) => ({ ...s, dry_run_completed_at: timestamp }))
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Asset lifecycle worker</CardTitle>
              <CardDescription>
                Automatically flags assets as stale when no scanner or integration has re-observed
                them within the configured threshold. Disabled by default.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enabled" className="text-sm text-muted-foreground">
                Enabled
              </Label>
              <Switch
                id="enabled"
                checked={form.enabled}
                onCheckedChange={(checked) => setForm((s) => ({ ...s, enabled: checked }))}
                disabled={checked(needsDryRun)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {needsDryRun && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Dry-run required before enabling</AlertTitle>
              <AlertDescription>
                Run a dry-run to preview how many assets would be flagged stale with your current
                thresholds. The toggle unlocks once the dry-run completes without errors.
              </AlertDescription>
            </Alert>
          )}
          {dryRunDone && !form.enabled && (
            <Alert>
              <PlayCircle className="h-4 w-4" />
              <AlertTitle>Dry-run completed</AlertTitle>
              <AlertDescription>
                You can now flip the enabled toggle to start automatic stale-detection.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="stale-threshold">Stale threshold (days)</Label>
              <Input
                id="stale-threshold"
                type="number"
                min={MIN_THRESHOLD_DAYS}
                max={MAX_THRESHOLD_DAYS}
                value={form.stale_threshold_days}
                onChange={(e) => setForm((s) => ({ ...s, stale_threshold_days: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Assets not seen for this many days are flagged stale.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grace-period">Discovery grace (days)</Label>
              <Input
                id="grace-period"
                type="number"
                min={MIN_GRACE_DAYS}
                max={MAX_GRACE_DAYS}
                value={form.grace_period_days}
                onChange={(e) => setForm((s) => ({ ...s, grace_period_days: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Newly discovered assets are immune for this many days.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reactivation-grace">Manual reactivation grace (days)</Label>
              <Input
                id="reactivation-grace"
                type="number"
                min={MIN_THRESHOLD_DAYS}
                max={MAX_THRESHOLD_DAYS}
                value={form.manual_reactivation_grace_days}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    manual_reactivation_grace_days: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Assets reactivated manually skip the worker for this long.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Excluded source types</Label>
            <p className="text-xs text-muted-foreground">
              Assets whose only sources fall into these categories will never be auto-demoted.
              Manual and imported assets default to excluded.
            </p>
            <div className="flex flex-wrap gap-2">
              {KNOWN_SOURCE_TYPES.map((type) => {
                const active = form.excluded_source_types.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleExcludedType(type)}
                    className="transition-opacity"
                  >
                    <Badge
                      variant={active ? 'default' : 'outline'}
                      className={active ? '' : 'opacity-60 hover:opacity-90'}
                    >
                      {type}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pause-on-integration-failure" className="font-medium">
                Pause lifecycle when ingest is silent
              </Label>
              <p className="text-xs text-muted-foreground">
                Skip the tenant entirely if no asset has been seen in the past 48 hours — prevents a
                crashed agent from wiping the fleet.
              </p>
            </div>
            <Switch
              id="pause-on-integration-failure"
              checked={form.pause_on_integration_failure}
              onCheckedChange={(checked) =>
                setForm((s) => ({ ...s, pause_on_integration_failure: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setDryRunOpen(true)}
          disabled={submitting || !currentTenant}
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          Run dry-run
        </Button>
        <Button type="submit" disabled={submitting || !currentTenant}>
          <Save className="mr-2 h-4 w-4" />
          Save settings
        </Button>
      </div>

      <DryRunDialog
        open={dryRunOpen}
        onOpenChange={setDryRunOpen}
        onSuccess={handleDryRunSuccess}
      />
    </form>
  )
}

// checked is a small helper that protects us from Switch's default
// behavior: when the parent wants to visually keep the toggle off
// until dry-run succeeds, we pass `disabled={needsDryRun}` but the
// Switch component sometimes reads `checked` loosely. Wrapping in
// this boolean cast keeps the intent explicit.
function checked(v: boolean): boolean {
  return v === true
}
