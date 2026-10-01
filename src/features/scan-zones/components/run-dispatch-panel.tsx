'use client'

import { AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { RunDispatch } from '@/lib/api/scan-types'
import { useScanZones } from '@/lib/api/scan-zone-hooks'
import { Permission, useHasPermission } from '@/lib/permissions'

import { useZoneSensors } from '../hooks/use-zone-sensors'
import { SensorHealthChip } from './sensor-health-dot'

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="min-w-0">
      <p
        className={
          danger && value > 0
            ? 'text-lg font-semibold tabular-nums text-destructive'
            : 'text-lg font-semibold tabular-nums'
        }
      >
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * What a scan run dispatched (GET /pipeline-runs/{id} `dispatch`): targets
 * resolved and excluded, the zone each share went to, and every target that
 * was not scanned, with the reason (RFC-023 D5: never dropped silently).
 */
export function RunDispatchPanel({ dispatch }: { dispatch: RunDispatch }) {
  const canReadSensors = useHasPermission(Permission.SensorsRead)
  const canReadZones = useHasPermission(Permission.ScanZonesRead)
  const { byId: sensorsById } = useZoneSensors(canReadSensors)
  const { data: zonesData } = useScanZones(canReadZones && !!dispatch.zone_routing)
  const routing = dispatch.zone_routing
  const selectedZoneId = routing?.selected_zone_id ?? routing?.zone_id
  const selectedZoneName =
    selectedZoneId &&
    (routing?.zones?.find((z) => z.zone_id === selectedZoneId)?.zone_name ??
      zonesData?.data.find((z) => z.id === selectedZoneId)?.name ??
      'a zone that no longer exists')
  const uncoveredCount = routing?.uncovered_targets ?? dispatch.uncovered_targets?.length ?? 0
  // The API also writes "<target> not scanned: <reason>" into warnings for each
  // uncovered target; those are listed above with their reason, so skip them.
  const listed = new Set((dispatch.uncovered_targets ?? []).map((u) => `${u.target} not scanned:`))
  const warnings = (dispatch.warnings ?? []).filter(
    (w) => ![...listed].some((prefix) => w.startsWith(prefix))
  )

  return (
    <div className="space-y-4" data-testid="run-dispatch">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Targets resolved" value={dispatch.resolved_targets} />
        <Stat label="Excluded by scope" value={dispatch.excluded_targets} />
        <Stat label="Not scanned" value={uncoveredCount} danger />
        <Stat label="Jobs" value={routing?.jobs ?? 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {dispatch.sensor_routing && (
          <Badge variant="outline" className="font-normal">
            {dispatch.sensor_routing === 'platform' ? 'Platform sensors' : 'Your sensors'}
          </Badge>
        )}
        {routing && (
          <Badge variant="outline" className="font-normal">
            {routing.selected_zone_id
              ? `Restricted to zone: ${selectedZoneName}`
              : routing.zone_id
                ? `Workflow bound to zone: ${selectedZoneName}`
                : 'Zone: automatic'}
          </Badge>
        )}
        {routing && routing.unzoned_targets > 0 && (
          <span>{routing.unzoned_targets} public target(s) sent to any of your sensors</span>
        )}
      </div>

      {/* A small per-zone summary (a handful of rows, no paging or sorting),
          so a plain table rather than DataTable. */}
      {routing?.zones && routing.zones.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <caption className="sr-only">Targets per scan zone</caption>
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start font-medium">Zone</th>
                <th className="px-3 py-2 text-end font-medium">Targets</th>
                <th className="px-3 py-2 text-end font-medium">Jobs</th>
                <th className="px-3 py-2 text-start font-medium">Sensors</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {routing.zones.map((z) => (
                <tr key={z.zone_id}>
                  <td className="px-3 py-2 font-medium">{z.zone_name}</td>
                  <td className="px-3 py-2 text-end tabular-nums">{z.targets}</td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {z.jobs}
                    {z.queued_jobs > 0 && (
                      <span className="block text-xs text-warning">{z.queued_jobs} waiting</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {z.sensor_ids.length === 0 ? (
                        <span className="text-xs text-warning">No online sensor yet</span>
                      ) : (
                        z.sensor_ids.map((id) => {
                          const s = sensorsById.get(id)
                          return s ? (
                            <SensorHealthChip key={id} sensor={s} />
                          ) : (
                            <Badge key={id} variant="outline" className="font-mono text-xs">
                              {id.slice(0, 8)}
                            </Badge>
                          )
                        })
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dispatch.uncovered_targets && dispatch.uncovered_targets.length > 0 && (
        <section aria-labelledby="run-uncovered-heading" className="space-y-2">
          <h4 id="run-uncovered-heading" className="text-sm font-semibold">
            Not scanned
          </h4>
          <ul className="divide-y rounded-md border" data-testid="run-uncovered">
            {dispatch.uncovered_targets.map((u) => (
              <li key={u.target} className="space-y-0.5 px-3 py-2">
                <p className="break-all font-mono text-sm">{u.target}</p>
                <p className="text-xs text-muted-foreground">{u.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {warnings.length > 0 && (
        <section aria-labelledby="run-warnings-heading" className="space-y-2">
          <h4 id="run-warnings-heading" className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Warnings
          </h4>
          <ul className="list-disc space-y-1 ps-5 text-sm" data-testid="run-warnings">
            {warnings.map((w, i) => (
              <li key={i} className="break-words">
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
