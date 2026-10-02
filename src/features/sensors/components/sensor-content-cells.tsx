'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api/error-handler'
import { refreshFleetContent } from '@/lib/api/sensor-content-hooks'
import type { Sensor } from '@/lib/api/sensor-types'
import { Permission, useHasPermission } from '@/lib/permissions'

import { SensorTag } from './sensor-cells'
import {
  CONTENT_STATE_META,
  contentAgeText,
  contentLabel,
  contentState,
  worstContentState,
} from '../lib/content'

/**
 * The list's content column: the worst state of the sensor's scanner content
 * (RFC-031), every item on hover. A dash when the sensor reports none.
 */
export function SensorContentCell({
  sensor,
  now,
}: {
  sensor: Pick<Sensor, 'content'>
  now: number
}) {
  const worst = worstContentState(sensor.content)
  if (!worst) return <span className="text-sm text-muted-foreground">—</span>
  const meta = CONTENT_STATE_META[worst]
  const title = (sensor.content ?? [])
    .map((c) => {
      const age = contentAgeText(c, now)
      return `${contentLabel(c.name)}: ${CONTENT_STATE_META[contentState(c)].label}${c.version ? ` · ${c.version}` : ''}${age ? ` · ${age}` : ''}`
    })
    .join('\n')
  return (
    <SensorTag tone={meta.tone} title={title}>
      {meta.label}
    </SensorTag>
  )
}

/** Active sensors that can take a refresh_content command. */
export function contentRefreshTargets(sensors: Sensor[]): Sensor[] {
  return sensors.filter((s) => s.content_refresh_supported && s.status === 'active')
}

/**
 * Fleet-wide "Refresh content" (admin-only, sensors:write): asks every sensor
 * that manages its content to refresh it now, after a confirmation that says
 * how many will be asked. Hidden when no sensor can.
 */
export function FleetContentRefreshButton({
  sensors,
  onDone,
}: {
  sensors: Sensor[]
  onDone?: () => void
}) {
  const canWrite = useHasPermission(Permission.SensorsWrite)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const targets = contentRefreshTargets(sensors)
  if (!canWrite || targets.length === 0) return null

  const confirm = async () => {
    setBusy(true)
    try {
      const res = await refreshFleetContent()
      toast.success(
        `Refresh requested on ${res.commands_created} ${res.commands_created === 1 ? 'sensor' : 'sensors'}` +
          (res.skipped ? ` (${res.skipped} skipped: already queued or not supported).` : '.')
      )
      setOpen(false)
      onDone?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not request a content refresh'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RefreshCw className="h-4 w-4" />
        Refresh content
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Refresh scanner content?"
        desc={`${targets.length} ${targets.length === 1 ? 'sensor' : 'sensors'} will download and verify the latest scanner content (vulnerability DB, templates, rules) allowed by your content policy. Running scans keep the content they started with.`}
        confirmText="Refresh content"
        handleConfirm={confirm}
        isLoading={busy}
      />
    </>
  )
}
