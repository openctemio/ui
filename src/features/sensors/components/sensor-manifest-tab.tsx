'use client'

import { useState } from 'react'
import { AlertTriangle, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DetailField, DetailFieldGrid, DetailSection, DetailSections } from '@/features/shared'
import { useSensorManifests } from '@/lib/api/sensor-hooks'
import type { Sensor, SensorManifestVersion } from '@/lib/api/sensor-types'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

import { SensorTag } from './sensor-cells'
import { shortDigest } from '../lib/content'
import { agoShort, exactTime } from '../lib/format'
import {
  IGNORED_REASON_LABEL,
  MANIFEST_SOURCE_LABEL,
  concurrencyText,
  isEmptyDiff,
  manifestDiffLines,
  manifestHistory,
  resourcesText,
} from '../lib/manifest'

/** Versions shown before "Show all". */
const HISTORY_PREVIEW = 5

function Digest({ digest }: { digest: string }) {
  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 rounded-sm font-mono text-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Copy manifest digest ${digest}`}
      title={digest}
      onClick={() => {
        copyToClipboard(digest)
        toast.success('Manifest digest copied')
      }}
    >
      <span className="truncate">{shortDigest(digest)}</span>
      <Copy className="h-3 w-3 shrink-0" aria-hidden />
    </button>
  )
}

function CurrentManifest({ v, now }: { v: SensorManifestVersion; now: number }) {
  const m = v.manifest
  const build = [m.sensor?.name, m.sensor?.version].filter(Boolean).join(' ')
  const sdk = [m.sdk?.name, m.sdk?.version].filter(Boolean).join(' ')
  const platform = [m.platform?.os, m.platform?.arch].filter(Boolean).join('/')
  return (
    <DetailSection title="Current manifest">
      <DetailFieldGrid>
        <DetailField label="Digest">
          <span className="flex flex-col gap-0.5">
            <Digest digest={v.digest} />
            <span className="text-xs text-muted-foreground" title={exactTime(v.current_since)}>
              {MANIFEST_SOURCE_LABEL[v.source] ?? v.source} · current since{' '}
              {agoShort(v.current_since, now)}
            </span>
          </span>
        </DetailField>
        <DetailField label="Build">
          {build || sdk ? (
            <span className="flex flex-col gap-0.5">
              {build && <span>{build}</span>}
              {sdk && <span className="text-xs text-muted-foreground">{sdk}</span>}
            </span>
          ) : null}
        </DetailField>
        <DetailField label="Resources">
          {resourcesText(m) || platform ? (
            <span className="flex flex-col gap-0.5 tabular-nums">
              {resourcesText(m) && <span>{resourcesText(m)}</span>}
              {platform && <span className="text-xs text-muted-foreground">{platform}</span>}
            </span>
          ) : null}
        </DetailField>
        <DetailField label="Concurrency">{concurrencyText(m)}</DetailField>
        {(m.capabilities?.length ?? 0) > 0 && (
          <DetailField label="Sensor-wide capabilities" full>
            <span className="flex flex-wrap gap-1">
              {m.capabilities!.map((c) => (
                <SensorTag key={c}>{c}</SensorTag>
              ))}
            </span>
          </DetailField>
        )}
      </DetailFieldGrid>

      <ul className="divide-y rounded-lg border" aria-label="Manifest tools">
        {m.tools.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">
            The sensor registered no tools.
          </li>
        )}
        {m.tools.map((t) => (
          <li key={t.name} data-tool={t.name} className="space-y-1 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn('font-medium', !t.installed && 'text-muted-foreground')}>
                {t.name}
              </span>
              {t.version && (
                <span className="text-xs text-muted-foreground tabular-nums">{t.version}</span>
              )}
              {t.kind && <SensorTag>{t.kind}</SensorTag>}
              {!t.installed && <SensorTag tone="warning">not installed</SensorTag>}
            </div>
            {(t.capabilities?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1" aria-label={`${t.name} capabilities`}>
                {t.capabilities!.map((c) => (
                  <SensorTag key={c} tone="info">
                    {c}
                  </SensorTag>
                ))}
              </div>
            )}
            {(t.content?.length ?? 0) > 0 && (
              <div className="text-xs text-muted-foreground">
                {t.content!.map((c) => [c.name, c.version].filter(Boolean).join(' ')).join(' · ')}
              </div>
            )}
          </li>
        ))}
      </ul>

      {v.ignored.length > 0 && (
        <div
          className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm"
          role="note"
        >
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
            The platform ignored {v.ignored.length} {v.ignored.length === 1 ? 'item' : 'items'}
          </p>
          <ul className="text-xs text-muted-foreground">
            {v.ignored.map((i) => (
              <li key={`${i.path}:${i.value ?? ''}`}>
                <span className="font-mono">{i.path}</span>
                {i.value ? ` "${i.value}"` : ''}: {IGNORED_REASON_LABEL[i.reason] ?? i.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </DetailSection>
  )
}

function History({ versions, now }: { versions: SensorManifestVersion[]; now: number }) {
  const [all, setAll] = useState(false)
  const rows = manifestHistory(versions)
  const shown = all ? rows : rows.slice(0, HISTORY_PREVIEW)
  return (
    <DetailSection title="History" count={versions.length}>
      <ol className="space-y-3" aria-label="Manifest versions">
        {shown.map(({ version: v, diff }) => {
          const lines = diff && !isEmptyDiff(diff) ? manifestDiffLines(diff) : []
          return (
            <li key={v.digest} className="space-y-1 border-s-2 ps-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span title={exactTime(v.current_since)}>{agoShort(v.current_since, now)}</span>
                <Digest digest={v.digest} />
                <SensorTag>{v.source === 'sensor' ? 'registered' : 'derived'}</SensorTag>
                {v.current && <SensorTag tone="success">current</SensorTag>}
              </div>
              {diff === null ? (
                <p className="text-xs text-muted-foreground">First version kept.</p>
              ) : lines.length > 0 ? (
                <ul className="text-xs text-muted-foreground">
                  {lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Content versions only.</p>
              )}
            </li>
          )
        })}
      </ol>
      {rows.length > HISTORY_PREVIEW && (
        <Button variant="ghost" size="sm" onClick={() => setAll((a) => !a)}>
          {all ? 'Show fewer' : `Show all ${rows.length}`}
        </Button>
      )}
    </DetailSection>
  )
}

/**
 * The drawer's Manifest tab (api RFC-033): what the sensor is, as it
 * registered it or as the platform derived it from its heartbeat, and the
 * history of versions with what changed between them.
 */
export function SensorManifestTab({ sensor, now }: { sensor: Sensor; now: number }) {
  const { data, error, isLoading, mutate } = useSensorManifests(sensor.id)
  const versions = data?.items ?? []
  const current = versions.find((v) => v.current) ?? null

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="space-y-2 text-sm" role="alert">
        <p>The manifest could not be loaded.</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          Retry
        </Button>
      </div>
    )
  }
  if (!current) {
    return (
      <p className="text-sm text-muted-foreground">
        No manifest yet. A sensor registers one when it connects, and the platform derives one from
        the first heartbeat that reports its tools.
      </p>
    )
  }
  return (
    <DetailSections>
      <CurrentManifest v={current} now={now} />
      <History versions={versions} now={now} />
    </DetailSections>
  )
}
