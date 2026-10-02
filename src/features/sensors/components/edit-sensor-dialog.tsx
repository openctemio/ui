'use client'

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Ban, Loader2, Trash2 } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeaderBar,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DangerZone, DangerZoneItem } from '@/features/shared/components/danger-zone'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  assignSensorToZone,
  invalidateScanZonesCache,
  unassignSensorFromZone,
  useScanZones,
} from '@/lib/api/scan-zone-hooks'
import {
  invalidateSensorsCache,
  useDeleteSensor,
  useRevokeSensor,
  useUpdateSensor,
} from '@/lib/api/sensor-hooks'
import type { Sensor } from '@/lib/api/sensor-types'
import { Permission, useHasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

import { useSensorFormOptions } from '../hooks'
import { sensorCapacity, toolsNotInstalled } from '../lib/capabilities'
import {
  isSensorEditDirty,
  MAX_JOBS_LIMIT,
  reportedToolNames,
  sensorEditDraft,
  sensorUpdateBody,
  validateSensorEdit,
  zoneChanges,
  type SensorEditDraft,
} from '../lib/sensor-edit'
import { normalizeSensorVersion } from '../lib/sensor-version'

interface EditSensorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sensor: Sensor
  onSuccess?: () => void
  /** After the sensor was deleted from the danger zone. */
  onDeleted?: () => void
}

type Draft = Omit<SensorEditDraft, 'zoneIds'> & {
  /** null until the zones are edited: the sensor's current zones. */
  zoneIds: string[] | null
}

const EXECUTION_MODE_TEXT: Record<Sensor['execution_mode'], { label: string; text: string }> = {
  daemon: { label: 'Daemon', text: 'runs all the time and takes jobs from the platform' },
  standalone: { label: 'Standalone', text: 'runs one scan from a pipeline and exits' },
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="space-y-0.5">
        <h3 id={id} className="text-base font-semibold">
          {title}
        </h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  )
}

/** Toggle chip (aria-pressed), the same look as the install flow's tool chips. */
function Chip({
  pressed,
  onToggle,
  disabled,
  children,
}: {
  pressed: boolean
  onToggle: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
        pressed
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-background text-muted-foreground hover:bg-accent'
      )}
    >
      {children}
    </button>
  )
}

function lastSeen(at: string | undefined): string {
  if (!at) return 'Never connected'
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? '—' : formatDistanceToNowStrict(d, { addSuffix: true })
}

/** Read-only facts the sensor reports about itself. */
function AboutSensor({ sensor }: { sensor: Sensor }) {
  const version = normalizeSensorVersion(sensor.version)
  const p = sensor.protocol
  const platform = [sensor.reported?.os, sensor.reported?.arch].filter(Boolean).join('/')
  const facts: { label: string; value: string }[] = [
    { label: 'Version', value: version ?? 'Not reported' },
    { label: 'SDK', value: normalizeSensorVersion(sensor.sdk_version) ?? '—' },
    {
      label: 'Protocol',
      value: p ? `v${p.version}${p.deprecated || p.version < 2 ? ' (deprecated)' : ''}` : '—',
    },
    { label: 'Platform', value: platform || '—' },
    {
      label: 'Last seen',
      value: lastSeen(sensor.last_seen_at),
    },
  ]
  return (
    <dl
      aria-label="About this sensor"
      className="flex flex-wrap gap-x-8 gap-y-3 rounded-lg border px-4 py-3"
    >
      {facts.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd className="text-sm font-medium break-words">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EditSensorDialog({
  open,
  onOpenChange,
  sensor,
  onSuccess,
  onDeleted,
}: EditSensorDialogProps) {
  const ids = {
    name: useId(),
    description: useId(),
    enabled: useId(),
    maxJobs: useId(),
    form: useId(),
  }
  const canDelete = useHasPermission(Permission.SensorsDelete)
  const canReadZones = useHasPermission(Permission.ScanZonesRead)
  const canWriteZones = useHasPermission(Permission.ScanZonesWrite)
  const { data: zonesData } = useScanZones(open && canReadZones)
  const zones = useMemo(() => zonesData?.data ?? [], [zonesData?.data])
  const sensorZoneIds = useMemo(
    () =>
      zones
        .filter((z) => z.sensor_ids.includes(sensor.id))
        .map((z) => z.id)
        .sort(),
    [zones, sensor.id]
  )

  const { getCapabilitiesForTools } = useSensorFormOptions()
  const { trigger: updateSensor } = useUpdateSensor(sensor.id)
  const { trigger: revokeSensor, isMutating: isRevoking } = useRevokeSensor()
  const { trigger: deleteSensor, isMutating: isDeleting } = useDeleteSensor()

  const [base, setBase] = useState<Draft>(() => ({ ...sensorEditDraft(sensor), zoneIds: null }))
  const [draft, setDraft] = useState<Draft>(base)
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Reset when the dialog opens or another sensor is edited, but not when the
  // same sensor is refetched while open (that would wipe the user's edits).
  const latest = useRef(sensor)
  useEffect(() => {
    latest.current = sensor
  })
  const sensorId = sensor.id
  useEffect(() => {
    if (!open) return
    const next: Draft = { ...sensorEditDraft(latest.current), zoneIds: null }
    setBase(next)
    setDraft(next)
  }, [open, sensorId])

  const initial: SensorEditDraft = { ...base, zoneIds: sensorZoneIds }
  const current: SensorEditDraft = { ...draft, zoneIds: draft.zoneIds ?? sensorZoneIds }
  const dirty = isSensorEditDirty(current, initial)
  const errors = validateSensorEdit(current, initial)
  const hasErrors = Object.keys(errors).length > 0

  const reported = reportedToolNames(sensor)
  const reportedVersions = new Map(
    (sensor.reported?.tools ?? []).filter((t) => t.installed).map((t) => [t.name, t.version])
  )
  const missingTools = toolsNotInstalled(sensor)
  const capacity = sensorCapacity(sensor)
  const revoked = sensor.status === 'revoked'
  const mode = EXECUTION_MODE_TEXT[sensor.execution_mode] ?? EXECUTION_MODE_TEXT.daemon
  const busy = saving || isRevoking || isDeleting

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const close = () => onOpenChange(false)
  const requestClose = () => {
    if (busy) return
    if (dirty && !revoked) setDiscardOpen(true)
    else close()
  }

  const handleSave = async () => {
    if (!dirty || hasErrors || revoked) return
    setSaving(true)
    try {
      const body = sensorUpdateBody(sensor, current, initial, getCapabilitiesForTools)
      if (Object.keys(body).length > 0) await updateSensor(body)
      const { join, leave } = zoneChanges(current, initial)
      if (join.length || leave.length) {
        await Promise.all([
          ...join.map((z) => assignSensorToZone(z, sensor.id)),
          ...leave.map((z) => unassignSensorFromZone(z, sensor.id)),
        ])
        await invalidateScanZonesCache()
      }
      toast.success(`Sensor "${current.name.trim()}" updated`)
      await invalidateSensorsCache()
      close()
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the sensor'))
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    try {
      await revokeSensor(sensor.id)
      toast.success(`Sensor "${sensor.name}" access revoked`)
      await invalidateSensorsCache()
      setRevokeOpen(false)
      close()
      onSuccess?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not revoke the sensor'))
    }
  }

  const handleDelete = async () => {
    try {
      await deleteSensor(sensor.id)
      toast.success(`Sensor "${sensor.name}" deleted`)
      await invalidateSensorsCache()
      setDeleteOpen(false)
      close()
      onDeleted?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not delete the sensor'))
    }
  }

  const descriptionCleared = !!base.description && current.description.trim() === ''

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:p-0 sm:max-w-2xl"
        >
          <DialogHeaderBar>
            <DialogTitle>Edit sensor</DialogTitle>
            <DialogDescription className="truncate">{sensor.name}</DialogDescription>
          </DialogHeaderBar>

          <form
            id={ids.form}
            className="min-h-0 flex-1 space-y-8 overflow-y-auto px-4 py-5 sm:px-6"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSave()
            }}
          >
            <AboutSensor sensor={sensor} />

            {revoked ? (
              <Alert>
                <Ban className="h-4 w-4" aria-hidden />
                <AlertTitle>This sensor is revoked</AlertTitle>
                <AlertDescription>
                  Its key no longer works and its settings can&apos;t be changed. Install a new
                  sensor to replace it, then delete this one.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Section title="General">
                  <div className="space-y-1.5">
                    <Label htmlFor={ids.name}>Name</Label>
                    <Input
                      id={ids.name}
                      value={draft.name}
                      onChange={(e) => set('name', e.target.value)}
                      autoComplete="off"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? `${ids.name}-error` : undefined}
                    />
                    <FieldError id={`${ids.name}-error`} message={errors.name} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={ids.description}>
                      Description{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id={ids.description}
                      value={draft.description}
                      onChange={(e) => set('description', e.target.value)}
                      placeholder="What does this sensor do?"
                      className="resize-none"
                      rows={2}
                      aria-invalid={!!errors.description}
                    />
                    <FieldError id={`${ids.description}-error`} message={errors.description} />
                    {descriptionCleared && (
                      <p className="text-xs text-muted-foreground">
                        A description can be replaced but not removed yet; an empty one keeps the
                        current text.
                      </p>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor={ids.enabled}>Enabled</Label>
                      <p className="text-sm text-muted-foreground">
                        A disabled sensor keeps its key but gets no work until you enable it again.
                      </p>
                    </div>
                    <Switch
                      id={ids.enabled}
                      checked={draft.enabled}
                      onCheckedChange={(v) => set('enabled', v)}
                    />
                  </div>
                </Section>

                <Section
                  title="Work"
                  description="The sensor reports what it has. You can narrow what the platform sends it."
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Execution mode</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground">{mode.label}</span>: {mode.text}. Set by the
                      role chosen at install.
                    </p>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Tools</legend>
                    {reported == null ? (
                      <p className="text-sm text-muted-foreground">
                        This sensor hasn&apos;t reported its tools yet. Once it connects, its tools
                        show here and you can limit which ones the platform uses.
                        {base.tools.length > 0 && <> Current limit: {base.tools.join(', ')}.</>}
                      </p>
                    ) : reported.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        The sensor reports no scanning tools installed.
                      </p>
                    ) : (
                      <>
                        <RadioGroup
                          value={draft.toolMode}
                          onValueChange={(v) => set('toolMode', v as Draft['toolMode'])}
                          aria-label="Limit to"
                          className="gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="all" id={`${ids.form}-all`} />
                            <Label htmlFor={`${ids.form}-all`} className="font-normal">
                              All reported tools
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="only" id={`${ids.form}-only`} />
                            <Label htmlFor={`${ids.form}-only`} className="font-normal">
                              Only the tools selected below
                            </Label>
                          </div>
                        </RadioGroup>
                        <div
                          className="flex flex-wrap gap-2 pt-1"
                          role="group"
                          aria-label="Reported tools"
                        >
                          {reported.map((t) => {
                            const v = reportedVersions.get(t)
                            const label = v ? `${t} ${v}` : t
                            if (draft.toolMode === 'all') {
                              return (
                                <span
                                  key={t}
                                  className="rounded-full border bg-muted/50 px-3 py-1 text-sm"
                                >
                                  {label}
                                </span>
                              )
                            }
                            const on = draft.tools.includes(t)
                            return (
                              <Chip
                                key={t}
                                pressed={on}
                                onToggle={() =>
                                  set(
                                    'tools',
                                    on
                                      ? draft.tools.filter((x) => x !== t)
                                      : [...draft.tools, t].sort()
                                  )
                                }
                              >
                                {label}
                              </Chip>
                            )
                          })}
                        </div>
                        <FieldError id={`${ids.form}-tools`} message={errors.tools} />
                      </>
                    )}
                    {missingTools.length > 0 && (
                      <p className="text-xs text-warning">
                        Allowed but not installed on the sensor: {missingTools.join(', ')}.
                      </p>
                    )}
                  </fieldset>

                  <div className="space-y-1.5">
                    <Label htmlFor={ids.maxJobs}>Concurrent jobs</Label>
                    <p className="text-sm text-muted-foreground">
                      {capacity.reported != null
                        ? `The sensor reports ${capacity.reported} ${capacity.reported === 1 ? 'slot' : 'slots'}. `
                        : "The sensor hasn't reported its capacity. "}
                      The platform sends at most the smaller of that and this limit.
                    </p>
                    <div className="flex items-center gap-3">
                      <Input
                        id={ids.maxJobs}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_JOBS_LIMIT}
                        value={draft.maxJobs}
                        onChange={(e) => set('maxJobs', e.target.value)}
                        className="w-24 tabular-nums"
                        aria-invalid={!!errors.maxJobs}
                        aria-describedby={errors.maxJobs ? `${ids.maxJobs}-error` : undefined}
                      />
                      <span className="text-sm text-muted-foreground tabular-nums">
                        Now: {capacity.effective} at once
                      </span>
                    </div>
                    <FieldError id={`${ids.maxJobs}-error`} message={errors.maxJobs} />
                  </div>

                  {canReadZones && zones.length > 0 && (
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">Scan zones</legend>
                      <p className="text-sm text-muted-foreground">
                        Scans of a zone&apos;s ranges go only to the zone&apos;s sensors.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {zones.map((z) => {
                          const on = current.zoneIds.includes(z.id)
                          return (
                            <Chip
                              key={z.id}
                              pressed={on}
                              disabled={!canWriteZones}
                              onToggle={() =>
                                set(
                                  'zoneIds',
                                  on
                                    ? current.zoneIds.filter((x) => x !== z.id)
                                    : [...current.zoneIds, z.id].sort()
                                )
                              }
                            >
                              {z.name}
                            </Chip>
                          )
                        })}
                      </div>
                    </fieldset>
                  )}
                </Section>
              </>
            )}

            {canDelete && (
              <DangerZone as="h3">
                {!revoked && (
                  <DangerZoneItem
                    title="Revoke access"
                    description="The key stops working at once and for good. The sensor can't be enabled again; you install a new one instead."
                    action={
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setRevokeOpen(true)}
                        disabled={busy}
                      >
                        <Ban className="h-4 w-4" aria-hidden />
                        Revoke
                      </Button>
                    }
                  />
                )}
                <DangerZoneItem
                  title="Delete sensor"
                  description="Removes the sensor from the platform. Its key stops working."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      Delete
                    </Button>
                  }
                />
              </DangerZone>
            )}
          </form>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
            <Button type="button" variant="outline" onClick={requestClose} disabled={busy}>
              {revoked ? 'Close' : 'Cancel'}
            </Button>
            {!revoked && (
              <Button type="submit" form={ids.form} disabled={!dirty || hasErrors || busy}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Save changes
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard changes?"
        desc="Your changes to this sensor have not been saved."
        cancelBtnText="Keep editing"
        confirmText="Discard"
        destructive
        handleConfirm={() => {
          setDiscardOpen(false)
          close()
        }}
      />

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke sensor access"
        desc={
          <div className="space-y-2">
            <p>
              <strong>{sensor.name}</strong> loses access at once. This can&apos;t be undone: to
              bring it back you install a new sensor with a new key.
            </p>
            <p>To pause it instead, turn off Enabled.</p>
          </div>
        }
        confirmText="Revoke access"
        destructive
        isLoading={isRevoking}
        typeToConfirm={sensor.name}
        handleConfirm={handleRevoke}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete sensor"
        desc={
          <p>
            Delete <strong>{sensor.name}</strong>? This can&apos;t be undone and its key stops
            working.
          </p>
        }
        confirmText="Delete sensor"
        destructive
        isLoading={isDeleting}
        typeToConfirm={sensor.name}
        handleConfirm={handleDelete}
      />
    </>
  )
}
