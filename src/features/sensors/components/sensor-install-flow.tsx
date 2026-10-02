'use client'

import { useState } from 'react'
import { Check, KeyRound, Loader2, RadioTower } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OneTimeSecretField } from '@/features/shared'
import { getErrorMessage } from '@/lib/api/error-handler'
import { assignSensorToZone, useScanZones } from '@/lib/api/scan-zone-hooks'
import { invalidateSensorsCache, useCreateSensor, useSensor } from '@/lib/api/sensor-hooks'
import type { Sensor, SensorType } from '@/lib/api/sensor-types'
import { Permission, useHasPermission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

import { SensorInstallSnippets } from './sensor-install-snippets'
import { useSensorFormOptions } from '../hooks'
import { normalizeSensorVersion } from '../lib/sensor-version'

/** What the sensor does, mapped to the API's legacy type and execution mode. */
export type InstallRole = 'scanner' | 'ci' | 'collector'

export const INSTALL_ROLES: Record<
  InstallRole,
  { label: string; hint: string; type: SensorType; mode: 'daemon' | 'standalone'; tools: string[] }
> = {
  scanner: {
    label: 'Scanner',
    hint: 'Runs the scans the platform sends it, all the time',
    type: 'worker',
    mode: 'daemon',
    tools: ['nuclei', 'trivy', 'semgrep', 'betterleaks'],
  },
  ci: {
    label: 'CI runner',
    hint: 'Scans once from a pipeline and exits',
    type: 'runner',
    mode: 'standalone',
    tools: ['semgrep', 'betterleaks', 'trivy'],
  },
  collector: {
    label: 'Collector',
    hint: 'Collects assets and telemetry, no scanning',
    type: 'collector',
    mode: 'daemon',
    tools: [],
  },
}

/** The tools in the default sensor image (ghcr.io/openctemio/sensor). */
export const IMAGE_TOOLS = ['nuclei', 'trivy', 'semgrep', 'betterleaks']

/** How often the flow checks for the first heartbeat. */
export const FIRST_HEARTBEAT_POLL_MS = 5000

const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,99}$/

type Step = 'name' | 'install' | 'connected'

function StepList({ step, connected }: { step: Step; connected: boolean }) {
  const steps = [
    { key: 'name', title: 'Name it and pick a role', text: 'The name shows on this page.' },
    {
      key: 'install',
      title: 'Run the command on the host',
      text: 'docker run, Compose, Kubernetes or Helm. The key is already in it.',
    },
    {
      key: 'wait',
      title: 'Wait for the first heartbeat',
      text: 'Usually under a minute. This page updates by itself.',
    },
    {
      key: 'zone',
      title: 'Assign it to a zone',
      text: 'Optional. Private ranges need a zone to be scanned.',
    },
  ]
  const doneIdx = step === 'name' ? 0 : connected ? 3 : 1
  return (
    <ol className="space-y-4" aria-label="Steps">
      {steps.map((s, i) => {
        const done = i < doneIdx
        const current = i === doneIdx
        return (
          <li key={s.key} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
            <span
              aria-hidden
              className={cn(
                'grid size-7 place-items-center rounded-full border text-xs font-semibold',
                done && 'border-success bg-success text-background',
                current && 'border-primary bg-primary text-primary-foreground',
                !done && !current && 'text-muted-foreground'
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold">
                {s.title}
                {done && <span className="sr-only"> (done)</span>}
              </span>
              <span className="block text-sm text-muted-foreground">{s.text}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Watches the new sensor until its first heartbeat arrives. */
function FirstHeartbeat({
  sensorId,
  onConnected,
  onOpen,
}: {
  sensorId: string
  onConnected: (sensor: Sensor) => void
  onOpen?: (sensor: Sensor) => void
}) {
  const [connected, setConnected] = useState<Sensor | null>(null)
  const { data } = useSensor(sensorId, {
    refreshInterval: connected ? 0 : FIRST_HEARTBEAT_POLL_MS,
    onSuccess: (s: Sensor) => {
      if (!connected && s?.last_seen_at) {
        setConnected(s)
        onConnected(s)
      }
    },
  })
  const s = connected ?? data
  if (s?.last_seen_at) {
    const v = normalizeSensorVersion(s.version)
    return (
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-3 text-sm"
        role="status"
      >
        <Check className="h-4 w-4 text-success" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Connected</p>
          <p className="text-muted-foreground">
            {s.name} sent its first heartbeat{v ? `, running ${v}` : ''}.
          </p>
        </div>
        {onOpen && (
          <Button size="sm" variant="outline" onClick={() => onOpen(s)}>
            Open sensor
          </Button>
        )}
      </div>
    )
  }
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-dashed p-3 text-sm"
      role="status"
    >
      <Loader2
        className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-info motion-reduce:animate-none"
        aria-hidden
      />
      <div>
        <p className="font-medium">Waiting for the first heartbeat…</p>
        <p className="text-muted-foreground">
          Checking every {FIRST_HEARTBEAT_POLL_MS / 1000}s. If nothing arrives within two minutes,
          check the platform URL, the certificate and that the host can reach port 443.
        </p>
      </div>
    </div>
  )
}

export interface SensorInstallFlowProps {
  /** Called with the sensor once it is created. */
  onCreated?: (sensor: Sensor) => void
  /** "Open sensor" after the first heartbeat. */
  onOpen?: (sensor: Sensor) => void
  /** Rendered beside the steps: "Install your first sensor" on an empty page. */
  title?: string
  className?: string
}

/**
 * Install a sensor (mockup frame C): name and role, then the commands with the
 * key already in them (shown once), a live wait for the first heartbeat, and
 * an optional zone. Creating a sensor issues a credential, so this is for
 * admins (sensors:write).
 */
export function SensorInstallFlow({
  onCreated,
  onOpen,
  title = 'Install a sensor',
  className,
}: SensorInstallFlowProps) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [role, setRole] = useState<InstallRole>('scanner')
  const [tools, setTools] = useState<string[]>(INSTALL_ROLES.scanner.tools)
  const [zoneId, setZoneId] = useState<string>('')
  const [created, setCreated] = useState<{ sensor: Sensor; apiKey: string } | null>(null)
  const [connected, setConnected] = useState(false)
  const [assigning, setAssigning] = useState(false)

  const { trigger: createSensor, isMutating } = useCreateSensor()
  const { getCapabilitiesForTools } = useSensorFormOptions()
  const canWriteZones = useHasPermission(Permission.ScanZonesWrite)
  const canReadZones = useHasPermission(Permission.ScanZonesRead)
  const { data: zonesData } = useScanZones(canReadZones)
  const zones = zonesData?.data ?? []

  const nameError =
    name.trim() === ''
      ? null
      : NAME_RE.test(name.trim())
        ? null
        : 'Letters, digits, spaces, dots, dashes and underscores; start with a letter or digit.'

  const assignZone = async (sensorId: string, zone: string) => {
    if (!zone || !canWriteZones) return
    setAssigning(true)
    try {
      await assignSensorToZone(zone, sensorId)
      toast.success('Sensor assigned to the zone')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not assign the zone'))
    } finally {
      setAssigning(false)
    }
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed || nameError) return
    const r = INSTALL_ROLES[role]
    try {
      const res = await createSensor({
        name: trimmed,
        type: r.type,
        execution_mode: r.mode,
        tools: tools as never[],
        capabilities: getCapabilitiesForTools(tools) as never[],
      })
      if (!res?.api_key || !res.sensor) throw new Error('The response had no key')
      setCreated({ sensor: res.sensor, apiKey: res.api_key })
      setStep('install')
      onCreated?.(res.sensor)
      await invalidateSensorsCache()
      if (zoneId) await assignZone(res.sensor.id, zoneId)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not create the sensor'))
    }
  }

  const zoneSelect = canReadZones && zones.length > 0 && (
    <div className="space-y-1.5">
      <Label htmlFor="install-zone">
        Zone <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>
      <Select
        value={zoneId || 'none'}
        onValueChange={async (v) => {
          const next = v === 'none' ? '' : v
          setZoneId(next)
          if (created) await assignZone(created.sensor.id, next)
        }}
        disabled={!canWriteZones || assigning}
      >
        <SelectTrigger id="install-zone" aria-label="Zone">
          <SelectValue placeholder="No zone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No zone</SelectItem>
          {zones.map((z) => (
            <SelectItem key={z.id} value={z.id}>
              {z.name}
              {z.ranges.length ? ` · ${z.ranges[0]}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div
      className={cn(
        'grid min-w-0 overflow-hidden rounded-xl border bg-card md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]',
        className
      )}
    >
      <div className="space-y-5 border-b p-6 md:border-e md:border-b-0">
        <span className="grid size-10 place-items-center rounded-lg bg-muted" aria-hidden>
          <RadioTower className="h-5 w-5" />
        </span>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            A sensor runs inside your network. It scans what the platform can&apos;t reach and sends
            the results back over HTTPS. It only connects out, so you don&apos;t open any inbound
            port.
          </p>
        </div>
        <StepList step={step} connected={connected} />
      </div>

      <div className="min-w-0 space-y-4 bg-muted/30 p-6">
        {step === 'name' ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="install-name">Name</Label>
                <Input
                  id="install-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="dmz-scanner-01"
                  autoComplete="off"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? 'install-name-error' : undefined}
                />
                {nameError && (
                  <p id="install-name-error" className="text-xs text-destructive">
                    {nameError}
                  </p>
                )}
              </div>
              {zoneSelect}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Role</legend>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Role">
                {(Object.keys(INSTALL_ROLES) as InstallRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    onClick={() => {
                      setRole(r)
                      setTools(INSTALL_ROLES[r].tools)
                    }}
                    className={cn(
                      'rounded-lg border bg-background p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      role === r ? 'border-primary ring-1 ring-primary' : 'hover:bg-accent'
                    )}
                  >
                    <span className="block text-sm font-medium">{INSTALL_ROLES[r].label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {INSTALL_ROLES[r].hint}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {role !== 'collector' && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Limit to tools{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </legend>
                <p className="text-xs text-muted-foreground">
                  The sensor reports which scanners it has installed, and scans go only to those.
                  The tools selected here narrow that list; clear them all to allow every tool it
                  reports.
                </p>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_TOOLS.map((t) => {
                    const on = tools.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setTools((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))
                        }
                        className={cn(
                          'rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          on
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'bg-background text-muted-foreground hover:bg-accent'
                        )}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={!name.trim() || !!nameError || isMutating}>
                {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create and show the command
              </Button>
            </div>
          </form>
        ) : created ? (
          <>
            <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 space-y-2">
                <p>
                  <span className="font-medium">Copy the key now.</span> It is shown only once and
                  is already in the commands below. If you lose it, an admin can rotate it, which
                  disconnects the old key.
                </p>
                <OneTimeSecretField label="API key" noun="API key" value={created.apiKey} />
              </div>
            </div>
            <SensorInstallSnippets sensorId={created.sensor.id} apiKey={created.apiKey} />
            <FirstHeartbeat
              sensorId={created.sensor.id}
              onConnected={() => {
                setConnected(true)
                setStep('connected')
              }}
              onOpen={onOpen}
            />
            {zoneSelect}
          </>
        ) : null}
      </div>
    </div>
  )
}
