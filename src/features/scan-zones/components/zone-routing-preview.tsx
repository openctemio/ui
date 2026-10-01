'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { previewScanZoneRouting } from '@/lib/api/scan-zone-hooks'
import type {
  ScanZone,
  ScanZonePreviewRequest,
  ScanZonePreviewTarget,
} from '@/lib/api/scan-zone-types'
import { Permission, useHasPermission } from '@/lib/permissions'

import { useZoneSensors } from '../hooks/use-zone-sensors'
import { describeScanZoneError, scanZoneErrorHint } from '../lib/errors'
import { SensorHealthChip } from './sensor-health-dot'

const AUTOMATIC = 'automatic'
/** Rows shown before "and N more". The API returns up to 500. */
const MAX_ROWS = 50

interface ScanZonePickerProps {
  zones: ScanZone[]
  value: string | null | undefined
  onChange: (zoneId: string | null) => void
  id?: string
}

/** "Automatic" (the default: narrowest zone per target) or one zone. */
export function ScanZonePicker({ zones, value, onChange, id = 'scan-zone' }: ScanZonePickerProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Scan zone</Label>
      <Select
        value={value ?? AUTOMATIC}
        onValueChange={(v) => onChange(v === AUTOMATIC ? null : v)}
      >
        <SelectTrigger id={id} className="w-full sm:w-80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTOMATIC}>Automatic (narrowest zone per target)</SelectItem>
          {zones.map((z) => (
            <SelectItem key={z.id} value={z.id}>
              {z.name}
              {z.is_default ? ' (default)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {value
          ? 'Only targets inside this zone are scanned, by its sensors; the rest are listed as not scanned.'
          : 'Each target goes to the zone with the narrowest range holding it; public targets go to the default zone.'}
      </p>
    </div>
  )
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function TargetRoute({ t, sensorName }: { t: ScanZonePreviewTarget; sensorName: React.ReactNode }) {
  if (t.status === 'uncovered') {
    return (
      <Badge variant="outline" className="text-xs font-normal text-destructive">
        Not scanned
      </Badge>
    )
  }
  if (t.status === 'unzoned') {
    return (
      <Badge variant="outline" className="text-xs font-normal">
        No zone: any of your sensors
      </Badge>
    )
  }
  return (
    <>
      <Badge variant="secondary" className="text-xs font-normal">
        {t.zone_name}
      </Badge>
      {sensorName ?? <span className="text-xs text-warning">waits for an online sensor</span>}
    </>
  )
}

interface ZoneRoutingPreviewProps {
  request: ScanZonePreviewRequest
}

/**
 * Where each target of a scan would go if it were triggered now: zone and
 * sensor, scope exclusions, and every target that would not be scanned and
 * why. Computed by the API with the trigger's own routing (read-only).
 */
export function ZoneRoutingPreview({ request }: ZoneRoutingPreviewProps) {
  const canRead = useHasPermission(Permission.ScanZonesRead)
  const canReadSensors = useHasPermission(Permission.SensorsRead)
  const { byId: sensorsById } = useZoneSensors(canReadSensors)
  const debounced = useDebounced(request, 400)
  const key = useMemo(
    () =>
      canRead && (debounced.targets.length > 0 || debounced.asset_group_ids.length > 0)
        ? ['scan-zone-preview', JSON.stringify(debounced)]
        : null,
    [canRead, debounced]
  )
  const { data, error, isLoading } = useSWR(key, () => previewScanZoneRouting(debounced), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  if (!canRead) return null
  if (!key) {
    return <p className="text-sm text-muted-foreground">Add targets to preview their routing.</p>
  }
  if (isLoading || !data) {
    if (error) {
      const d = describeScanZoneError(error, 'Could not preview routing')
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not preview routing</AlertTitle>
          <AlertDescription>{d.message}</AlertDescription>
        </Alert>
      )
    }
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const rows = data.targets.slice(0, MAX_ROWS)
  const more = data.resolved_targets - rows.length
  const sensorLabel = (id?: string) => {
    if (!id) return null
    const s = sensorsById.get(id)
    return s ? (
      <SensorHealthChip sensor={s} />
    ) : (
      <Badge variant="outline" className="font-mono text-xs">
        {id.slice(0, 8)}
      </Badge>
    )
  }

  return (
    <div className="space-y-3" data-testid="zone-routing-preview">
      {data.error && (
        <Alert variant="destructive" data-testid="zone-preview-refusal">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>This scan would not start</AlertTitle>
          <AlertDescription>
            <p>{data.error.message}</p>
            {scanZoneErrorHint(data.error.code) && <p>{scanZoneErrorHint(data.error.code)}</p>}
          </AlertDescription>
        </Alert>
      )}

      {!data.routed && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {data.not_routed_reason ||
            (data.zones_enabled
              ? 'This scanner is not routed by zone.'
              : 'Your team has no scan zones: targets dispatch to your sensors as before.')}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Targets</dt>
          <dd className="font-semibold tabular-nums">{data.resolved_targets}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Excluded by scope</dt>
          <dd className="font-semibold tabular-nums">{data.excluded_targets}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Not scanned</dt>
          <dd
            className={
              data.uncovered_targets > 0
                ? 'font-semibold tabular-nums text-destructive'
                : 'font-semibold tabular-nums'
            }
          >
            {data.uncovered_targets}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Jobs</dt>
          <dd className="font-semibold tabular-nums">{data.jobs}</dd>
        </div>
      </dl>

      {rows.length > 0 && (
        <ul className="divide-y rounded-md border" data-testid="zone-preview-targets">
          {rows.map((t, i) => (
            <li
              key={`${t.target}-${i}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2"
              data-status={t.status}
            >
              <span className="min-w-0 max-w-full break-all font-mono text-sm">{t.target}</span>
              {t.addresses && t.addresses.length > 0 && (
                <span className="font-mono text-xs text-muted-foreground">
                  ({t.addresses.slice(0, 2).join(', ')})
                </span>
              )}
              <span className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
                <TargetRoute t={t} sensorName={sensorLabel(t.sensor_id)} />
              </span>
              {t.status === 'uncovered' && t.reason && (
                <p className="basis-full text-xs text-muted-foreground">{t.reason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <p className="text-xs text-muted-foreground">and {more.toLocaleString()} more target(s)</p>
      )}

      {data.excluded.length > 0 && (
        <div className="space-y-1" data-testid="zone-preview-excluded">
          <p className="text-xs font-medium">Excluded by scope</p>
          <div className="flex flex-wrap gap-1">
            {data.excluded.map((e) => (
              <Badge key={e} variant="outline" className="font-mono text-xs font-normal">
                {e}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {data.warnings.filter((w) => !w.includes(' not scanned: ')).length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {data.warnings
            .filter((w) => !w.includes(' not scanned: '))
            .map((w, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                <span className="break-words">{w}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

interface ScanRoutingSectionProps {
  zones: ScanZone[]
  value: string | null | undefined
  onChange: (zoneId: string | null) => void
  request: ScanZonePreviewRequest
}

/**
 * The New / Edit scan "Routing" block: the zone picker and the live routing
 * preview. Render it only when the team has zones and the user may read them.
 */
export function ScanRoutingSection({ zones, value, onChange, request }: ScanRoutingSectionProps) {
  return (
    <section
      aria-labelledby="scan-routing-heading"
      className="space-y-4 border-t px-4 py-4 sm:px-6"
      data-testid="new-scan-routing"
    >
      <div>
        <h3 id="scan-routing-heading" className="text-sm font-semibold">
          Routing
        </h3>
        <p className="text-xs text-muted-foreground">
          Which zone and sensor each target goes to if the scan starts now.
        </p>
      </div>
      <ScanZonePicker zones={zones} value={value} onChange={onChange} />
      <ZoneRoutingPreview request={request} />
    </section>
  )
}
