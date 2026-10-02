'use client'

import { useState } from 'react'
import { ChevronRight, Copy, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DetailSection } from '@/features/shared'
import { getErrorMessage } from '@/lib/api/error-handler'
import { refreshSensorContent } from '@/lib/api/sensor-content-hooks'
import type { Sensor, SensorContent } from '@/lib/api/sensor-types'
import { copyToClipboard } from '@/lib/clipboard'
import { redactUrlQueries } from '@/lib/redact-url'
import { cn } from '@/lib/utils'

import { SensorTag } from './sensor-cells'
import {
  CONTENT_STATE_META,
  UNMANAGED_TEXT,
  contentAgeSeconds,
  contentAgeText,
  contentCheckedText,
  contentLabel,
  contentState,
  contentVersionDate,
  formatHours,
  shortDigest,
} from '../lib/content'
import { formatDurationShort } from '../lib/format'

function statusCodeOf(err: unknown): number | undefined {
  const code = (err as { statusCode?: unknown } | null)?.statusCode
  return typeof code === 'number' ? code : undefined
}

/**
 * Ask one sensor to refresh its scanner content (POST
 * /sensors/{id}/content/refresh) and say what happened.
 */
export async function requestSensorContentRefresh(sensor: Pick<Sensor, 'id' | 'name'>) {
  try {
    const res = await refreshSensorContent(sensor.id)
    if (res.already_pending) {
      toast.info(`A content refresh is already queued for ${sensor.name}.`)
    } else {
      toast.success(`Refresh requested. ${sensor.name} picks it up on its next poll.`)
    }
    return true
  } catch (err) {
    if (statusCodeOf(err) === 409) {
      toast.error(`${sensor.name} cannot refresh its content: it does not manage any.`)
    } else {
      toast.error(getErrorMessage(err, 'Could not request a content refresh'))
    }
    return false
  }
}

function DigestButton({ digest }: { digest: string }) {
  return (
    <button
      type="button"
      className="inline-flex max-w-full items-center gap-1 rounded-sm font-mono hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`Copy digest ${digest}`}
      onClick={() => {
        copyToClipboard(digest)
        toast.success('Digest copied')
      }}
    >
      <span className="truncate">{shortDigest(digest)}</span>
      <Copy className="h-3 w-3 shrink-0" aria-hidden />
    </button>
  )
}

/**
 * Age against the policy's limit as a thin bar. Amber only when the API
 * calls the item stale (it may measure from another time than the age).
 */
function AgeMeter({ c, now }: { c: SensorContent; now: number }) {
  const age = contentAgeSeconds(c, now)
  const limitH = c.max_age_hours ?? 0
  if (age == null || limitH <= 0) return null
  const ratio = age / (limitH * 3600)
  const stale = contentState(c) === 'stale'
  return (
    <span
      role="meter"
      aria-label={`Age ${Math.round(ratio * 100)}% of the limit`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(ratio * 100))}
      className="inline-block h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted align-middle"
    >
      <span
        className={cn('block h-full rounded-full', stale ? 'bg-warning' : 'bg-success')}
        style={{ width: `${Math.min(100, Math.max(4, ratio * 100))}%` }}
      />
    </span>
  )
}

function ContentVersion({ c, now }: { c: SensorContent; now: number }) {
  if (!c.version) return <span>none installed</span>
  const built = contentVersionDate(c.version)
  if (built) {
    return (
      <span className="text-foreground" title={c.version}>
        built {formatDurationShort(Math.max(0, (now - built.getTime()) / 1000))} ago
      </span>
    )
  }
  return <span className="text-foreground tabular-nums">{c.version}</span>
}

function ContentRow({ c, now }: { c: SensorContent; now: number }) {
  const state = contentState(c)
  const meta = CONTENT_STATE_META[state]
  const age = contentAgeText(c, now)
  const limit = formatHours(c.max_age_hours)
  const checked = contentCheckedText(c, now)
  const hasDetails = !!(c.digest || c.source || c.error || c.version)
  return (
    <li className="px-3 py-2.5 text-sm" data-content={c.name} data-state={state}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{contentLabel(c.name)}</span>
        <SensorTag tone={meta.tone}>{meta.label}</SensorTag>
      </div>
      {c.managed ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
          <ContentVersion c={c} now={now} />
          {age && (
            <>
              <span aria-hidden>·</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5',
                  state === 'stale' && 'text-warning'
                )}
              >
                {age}
                {limit ? ` · limit ${limit}` : ''}
                <AgeMeter c={c} now={now} />
              </span>
            </>
          )}
          {checked && (
            <>
              <span aria-hidden>·</span>
              <span>{checked}</span>
            </>
          )}
          {c.pinned_version && (
            <>
              <span aria-hidden>·</span>
              <span className={cn(c.pin_mismatch && 'text-warning')}>
                pinned <span className="text-foreground">{c.pinned_version}</span>
              </span>
            </>
          )}
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Content {UNMANAGED_TEXT}.</p>
      )}
      {/* A plain line on the row; the error itself is under Details. The
          API reports no time for the failure, so none is shown. */}
      {c.error && <p className="mt-1 text-xs text-destructive">Last refresh failed</p>}
      {hasDetails && (
        <details className="group mt-1 text-xs text-muted-foreground">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-sm select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="h-3 w-3 transition-transform group-open:rotate-90"
              aria-hidden
            />
            Details
          </summary>
          <dl className="mt-1.5 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 ps-4">
            {c.version && (
              <>
                <dt>Version</dt>
                <dd className="font-mono break-all text-foreground">{c.version}</dd>
              </>
            )}
            {c.digest && (
              <>
                <dt>Digest</dt>
                <dd className="min-w-0">
                  <DigestButton digest={c.digest} />
                </dd>
              </>
            )}
            {c.source && (
              <>
                <dt>Source</dt>
                <dd className="font-mono break-all">{c.source}</dd>
              </>
            )}
            {c.error && (
              <>
                <dt>Error</dt>
                <dd className="font-mono break-all text-destructive">
                  {redactUrlQueries(c.error)}
                </dd>
              </>
            )}
          </dl>
        </details>
      )}
    </li>
  )
}

/**
 * The drawer's "Scanner content" section: one compact row per item the
 * sensor scans with (state, version, age against the policy's limit, when it
 * last checked), the digest, source and full error behind "Details", and an
 * admin-only "Refresh content". Renders nothing for a sensor that reports no
 * content.
 */
export function SensorContentSection({
  sensor,
  now,
  canManage,
}: {
  sensor: Pick<Sensor, 'id' | 'name' | 'content' | 'content_refresh_supported'>
  now: number
  canManage: boolean
}) {
  const [busy, setBusy] = useState(false)
  const items = sensor.content ?? []
  if (items.length === 0) return null
  const supported = !!sensor.content_refresh_supported

  const refresh = async () => {
    setBusy(true)
    try {
      await requestSensorContentRefresh(sensor)
    } finally {
      setBusy(false)
    }
  }

  const button = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-7 px-2 text-xs"
      disabled={!supported || busy}
      onClick={refresh}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      Refresh content
    </Button>
  )

  return (
    <DetailSection
      title="Scanner content"
      actions={
        canManage &&
        (supported ? (
          button
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* A disabled button gets no pointer events: the span carries the tooltip. */}
              <span tabIndex={0}>{button}</span>
            </TooltipTrigger>
            <TooltipContent>
              This sensor does not manage its content, so it cannot refresh it. Upgrade the sensor.
            </TooltipContent>
          </Tooltip>
        ))
      }
    >
      <ul className="divide-y rounded-lg border">
        {items.map((c) => (
          <ContentRow key={`${c.tool}:${c.name}`} c={c} now={now} />
        ))}
      </ul>
    </DetailSection>
  )
}
