'use client'

import { useState } from 'react'
import { Copy, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getErrorMessage } from '@/lib/api/error-handler'
import { refreshSensorContent } from '@/lib/api/sensor-content-hooks'
import type { Sensor, SensorContent } from '@/lib/api/sensor-types'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

import { SensorTag } from './sensor-cells'
import {
  CONTENT_STATE_META,
  UNMANAGED_TEXT,
  contentAgeText,
  contentByTool,
  contentLabel,
  contentState,
  formatHours,
  shortDigest,
} from '../lib/content'

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

function ContentRow({ c, now }: { c: SensorContent; now: number }) {
  const state = contentState(c)
  const meta = CONTENT_STATE_META[state]
  const age = contentAgeText(c, now)
  const digest = shortDigest(c.digest)
  const limit = formatHours(c.max_age_hours)
  return (
    <li className="space-y-1 px-3 py-2.5 text-sm" data-content={c.name} data-state={state}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{contentLabel(c.name)}</span>
        <SensorTag tone={meta.tone}>{meta.label}</SensorTag>
      </div>
      {c.managed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-mono text-foreground">{c.version || 'none installed'}</span>
          {age && (
            <span className={cn('tabular-nums', state === 'stale' && 'text-warning')}>
              {age}
              {limit ? ` · limit ${limit}` : ''}
            </span>
          )}
          {c.pinned_version && (
            <span className={cn(c.pin_mismatch && 'text-warning')}>
              pinned <span className="font-mono">{c.pinned_version}</span>
            </span>
          )}
          {digest && c.digest && (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-mono hover:text-foreground"
              aria-label={`Copy digest ${c.digest}`}
              onClick={() => {
                copyToClipboard(c.digest as string)
                toast.success('Digest copied')
              }}
            >
              {digest}
              <Copy className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Content {UNMANAGED_TEXT}.</p>
      )}
      {c.source && <p className="truncate font-mono text-xs text-muted-foreground">{c.source}</p>}
      {c.error && <p className="break-words text-xs text-destructive">{c.error}</p>}
    </li>
  )
}

/**
 * The drawer's "Scanner content" section: per tool, the content it scans with
 * (version, age, pin, digest, source, last refresh error), and an admin-only
 * "Refresh content". Renders nothing for a sensor that reports no content.
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
  const groups = contentByTool(sensor.content)
  if (groups.length === 0) return null
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
    <section aria-label="Scanner content">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Scanner content</h3>
        {canManage &&
          (supported ? (
            button
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* A disabled button gets no pointer events: the span carries the tooltip. */}
                <span tabIndex={0}>{button}</span>
              </TooltipTrigger>
              <TooltipContent>
                This sensor does not manage its content, so it cannot refresh it. Upgrade the
                sensor.
              </TooltipContent>
            </Tooltip>
          ))}
      </div>
      <div className="mt-2 space-y-3">
        {groups.map((g) => (
          <div key={g.tool}>
            <p className="mb-1 text-xs text-muted-foreground">{g.tool}</p>
            <ul className="divide-y rounded-lg border">
              {g.items.map((c) => (
                <ContentRow key={c.name} c={c} now={now} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
