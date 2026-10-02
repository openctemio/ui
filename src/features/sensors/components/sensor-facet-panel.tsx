'use client'

import { useTranslation } from '@/context/i18n-provider'
import { FacetOption, FacetPanel, FacetSection, FacetToggle } from '@/features/shared'
import type { SensorRole, SensorState, SensorVersionStatus } from '@/lib/api/sensor-types'

import {
  EMPTY_FLEET_FILTERS,
  type FleetFilters,
  type SensorModeFilter,
  type SensorProtocolFilter,
} from '../lib/fleet'
import { SENSOR_STATE_META, SENSOR_STATES } from '../lib/sensor-state'
import { compareSensorVersions } from '../lib/sensor-version'

const ROLE_LABELS: Record<SensorRole, string> = { scanner: 'Scanner', collector: 'Collector' }
const VERSION_LABELS: Record<SensorVersionStatus, string> = {
  latest: 'Latest',
  update_available: 'Update available',
  unsupported: 'Below the minimum',
  unknown: 'Unknown',
}
const PROTOCOL_LABELS: Record<SensorProtocolFilter, string> = {
  v2: 'v2',
  v1: 'v1 (deprecated)',
  unknown: 'Not reported yet',
}
const MODE_LABELS: Record<SensorModeFilter, string> = {
  daemon: 'Long-running',
  ci: 'CI (one-shot)',
}

/**
 * The SDK version options from GET /sensors/stats by_sdk_version, newest first
 * and "unknown" last; a selected version the stats no longer list stays
 * visible so it can be cleared.
 */
export function sdkVersionOptions(
  bySdkVersion: Record<string, number> | undefined,
  selected: string[] = []
): { value: string; count: number | null }[] {
  const counts = new Map<string, number | null>(Object.entries(bySdkVersion ?? {}))
  for (const v of selected) if (!counts.has(v)) counts.set(v, null)
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      if (a.value === 'unknown') return 1
      if (b.value === 'unknown') return -1
      const c = compareSensorVersions(b.value, a.value)
      return c === null ? a.value.localeCompare(b.value) : c
    })
}

function toggle<T>(list: T[], value: T, on: boolean): T[] {
  return on ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value)
}

/**
 * The sensor list's facets (the Findings pattern): Status, Role (replacing the
 * old Scanners / Collectors tabs), Version, Mode, and "Needs attention".
 */
export function SensorFacetPanel({
  filters,
  onChange,
  activeCount,
  hasChannel,
  hasProtocolInfo,
  sdkVersions,
}: {
  filters: FleetFilters
  onChange: (next: FleetFilters) => void
  activeCount: number
  /** Whether the API has a release channel (otherwise version status is unknown). */
  hasChannel: boolean
  /** Whether the API reports protocol telemetry (RFC-029). */
  hasProtocolInfo: boolean
  /** Sensors per SDK version (GET /sensors/stats by_sdk_version); absent on older APIs. */
  sdkVersions?: Record<string, number>
}) {
  const { t } = useTranslation()
  const sdkOptions = sdkVersionOptions(sdkVersions, filters.sdkVersions)
  return (
    <FacetPanel
      activeCount={activeCount}
      onClearAll={() => onChange({ ...EMPTY_FLEET_FILTERS, q: filters.q })}
    >
      <div>
        <FacetToggle
          label="Needs attention"
          description="Results piling up, a key expiring, a version below the minimum"
          checked={filters.attention}
          onCheckedChange={(on) => onChange({ ...filters, attention: on })}
        />
      </div>
      <FacetSection title="Status" selectedCount={filters.states.length}>
        {SENSOR_STATES.map((s: SensorState) => (
          <FacetOption
            key={s}
            label={SENSOR_STATE_META[s].label}
            checked={filters.states.includes(s)}
            onCheckedChange={(on) =>
              onChange({ ...filters, states: toggle(filters.states, s, on) })
            }
          />
        ))}
      </FacetSection>
      <FacetSection title="Role" selectedCount={filters.roles.length}>
        {(Object.keys(ROLE_LABELS) as SensorRole[]).map((r) => (
          <FacetOption
            key={r}
            label={ROLE_LABELS[r]}
            checked={filters.roles.includes(r)}
            onCheckedChange={(on) => onChange({ ...filters, roles: toggle(filters.roles, r, on) })}
          />
        ))}
      </FacetSection>
      {hasChannel && (
        <FacetSection title="Version" selectedCount={filters.versions.length}>
          {(Object.keys(VERSION_LABELS) as SensorVersionStatus[]).map((v) => (
            <FacetOption
              key={v}
              label={VERSION_LABELS[v]}
              checked={filters.versions.includes(v)}
              onCheckedChange={(on) =>
                onChange({ ...filters, versions: toggle(filters.versions, v, on) })
              }
            />
          ))}
        </FacetSection>
      )}
      {hasProtocolInfo && (
        <FacetSection title="Protocol" selectedCount={filters.protocols.length}>
          {(Object.keys(PROTOCOL_LABELS) as SensorProtocolFilter[]).map((p) => (
            <FacetOption
              key={p}
              label={PROTOCOL_LABELS[p]}
              checked={filters.protocols.includes(p)}
              onCheckedChange={(on) =>
                onChange({ ...filters, protocols: toggle(filters.protocols, p, on) })
              }
            />
          ))}
        </FacetSection>
      )}
      {sdkOptions.length > 0 && (
        <FacetSection
          title={t('sensors.filters.sdkVersion', 'SDK version')}
          selectedCount={filters.sdkVersions.length}
        >
          {sdkOptions.map((o) => (
            <FacetOption
              key={o.value}
              label={
                <span className="flex items-center justify-between gap-2">
                  <span className={o.value === 'unknown' ? undefined : 'font-mono text-xs'}>
                    {o.value === 'unknown'
                      ? t('sensors.filters.sdkUnknown', 'Not reported')
                      : o.value}
                  </span>
                  {o.count !== null && (
                    <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>
                  )}
                </span>
              }
              checked={filters.sdkVersions.includes(o.value)}
              onCheckedChange={(on) =>
                onChange({ ...filters, sdkVersions: toggle(filters.sdkVersions, o.value, on) })
              }
            />
          ))}
        </FacetSection>
      )}
      <FacetSection title="Mode" selectedCount={filters.modes.length} defaultOpen={false}>
        {(Object.keys(MODE_LABELS) as SensorModeFilter[]).map((m) => (
          <FacetOption
            key={m}
            label={MODE_LABELS[m]}
            checked={filters.modes.includes(m)}
            onCheckedChange={(on) => onChange({ ...filters, modes: toggle(filters.modes, m, on) })}
          />
        ))}
      </FacetSection>
    </FacetPanel>
  )
}
