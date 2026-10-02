'use client'

import { MetricStrip, type MetricStripItem } from '@/features/shared'
import { cn } from '@/lib/utils'

import type { AttentionKind, FleetSummary, ReleaseChannel } from '../lib/fleet'
import { PROTOCOL_V1_SUNSET, PROTOCOL_V2_SENSOR_VERSION } from './sensor-cells'

const ATTENTION_WORDS: Record<AttentionKind, string> = {
  backlog: 'backlog',
  key: 'key',
  version: 'version',
  sdk: 'SDK',
  tools: 'tools',
  content: 'scanner content',
  error: 'errors',
}

/** The fleet's state mix as one small bar, with a legend (no colour-only meaning). */
function FleetBar({ summary }: { summary: FleetSummary }) {
  const s = summary.byState
  const parts = [
    { key: 'online', label: 'Online', n: s.online, className: 'bg-success' },
    { key: 'warn', label: 'Degraded or stale', n: s.degraded + s.stale, className: 'bg-warning' },
    {
      key: 'offline',
      label: 'Offline',
      n: s.offline + s.never_connected,
      className: 'bg-destructive',
    },
    { key: 'idle', label: 'Idle (CI)', n: s.idle, className: 'bg-info' },
    { key: 'off', label: 'Disabled', n: s.disabled + s.revoked, className: 'bg-border' },
  ].filter((p) => p.n > 0)
  if (parts.length === 0) return null
  const label = parts.map((p) => `${p.n} ${p.label.toLowerCase()}`).join(', ')
  return (
    <span className="block">
      <span
        role="img"
        aria-label={label}
        className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full"
      >
        {parts.map((p) => (
          <span key={p.key} className={cn('block h-full', p.className)} style={{ flex: p.n }} />
        ))}
      </span>
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" aria-hidden>
        {parts.map((p) => (
          <span key={p.key} className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className={cn('size-2 rounded-sm', p.className)} />
            {p.label} <span className="font-medium tabular-nums text-foreground">{p.n}</span>
          </span>
        ))}
      </span>
    </span>
  )
}

export interface FleetHealthStripProps {
  summary: FleetSummary
  channel: ReleaseChannel
  loading?: boolean
  attentionActive: boolean
  onToggleAttention: () => void
  updatesActive: boolean
  onToggleUpdates: () => void
  zoneGroupingActive: boolean
  onToggleZoneGrouping: () => void
  protocolV1Active: boolean
  onToggleProtocolV1: () => void
  className?: string
}

/**
 * Fleet health, the first thing on the page: how many sensors can take work,
 * what needs attention, version drift, zone coverage and job slots. The
 * clickable metrics filter (or group) the table below.
 */
export function FleetHealthStrip({
  summary,
  channel,
  loading,
  attentionActive,
  onToggleAttention,
  updatesActive,
  onToggleUpdates,
  zoneGroupingActive,
  onToggleZoneGrouping,
  protocolV1Active,
  onToggleProtocolV1,
  className,
}: FleetHealthStripProps) {
  const items: MetricStripItem[] = [
    {
      key: 'health',
      label: 'Fleet health',
      value: summary.canTakeJobs,
      hint: `of ${summary.enabled} can take jobs`,
      detail: <FleetBar summary={summary} />,
    },
    {
      key: 'attention',
      label: 'Needs attention',
      value: summary.needsAttention,
      tone: 'warning',
      detail:
        summary.needsAttention > 0
          ? summary.attentionKinds.map((k) => ATTENTION_WORDS[k]).join(', ')
          : 'nothing to fix',
      onClick: onToggleAttention,
      active: attentionActive,
    },
    {
      key: 'updates',
      label: 'Update available',
      value: summary.updates,
      hint: channel.latest ? `latest ${channel.latest}` : undefined,
      detail:
        summary.unsupported > 0 && channel.min ? (
          <span className="text-destructive">
            {summary.unsupported} below minimum {channel.min}
          </span>
        ) : channel.latest ? (
          summary.updates === 0 ? (
            'all on the latest release'
          ) : (
            'older releases still run'
          )
        ) : (
          'no release channel set'
        ),
      onClick: onToggleUpdates,
      active: updatesActive,
    },
  ]
  if (summary.zones) {
    const z = summary.zones
    items.push({
      key: 'zones',
      label: 'Zone coverage',
      value: z.covered,
      hint: `of ${z.total} zones`,
      detail:
        z.uncovered.length > 0 ? (
          <span className="text-destructive">
            {z.uncovered.length === 1
              ? `${z.uncovered[0]} has no online sensor`
              : `${z.uncovered.length} zones have no online sensor`}
          </span>
        ) : (
          'every zone has an online sensor'
        ),
      onClick: onToggleZoneGrouping,
      active: zoneGroupingActive,
    })
  }
  // Only while some sensor still speaks the deprecated protocol (RFC-029).
  if (summary.protocolV1 > 0) {
    items.push({
      key: 'protocol',
      label: 'Still on protocol v1',
      value: summary.protocolV1,
      tone: 'warning',
      detail: `upgrade to ${PROTOCOL_V2_SENSOR_VERSION} before ${PROTOCOL_V1_SUNSET}`,
      onClick: onToggleProtocolV1,
      active: protocolV1Active,
    })
  }
  items.push({
    key: 'jobs',
    label: 'Jobs running',
    value: summary.jobsRunning,
    hint: `/ ${summary.jobSlots} slots`,
    detail: `on ${summary.canTakeJobs} ${summary.canTakeJobs === 1 ? 'sensor' : 'sensors'}`,
  })
  return <MetricStrip className={className} loading={loading} items={items} />
}
