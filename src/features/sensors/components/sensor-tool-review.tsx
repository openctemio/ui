'use client'

import { useId, useState } from 'react'
import { Check, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTranslation } from '@/context/i18n-provider'
import { DetailField, DetailFieldGrid } from '@/features/shared'
import { getErrorMessage } from '@/lib/api/error-handler'
import { invalidateSensorsCache, useUpdateSensor } from '@/lib/api/sensor-hooks'
import type { Sensor } from '@/lib/api/sensor-types'
import { cn } from '@/lib/utils'

import { SensorTag } from './sensor-cells'
import { useSensorFormOptions } from '../hooks'
import { hasReportedTools } from '../lib/capabilities'
import {
  allowedToolsBody,
  allowToolBody,
  reportedToolNames,
  toolsInstalledNotAllowed,
} from '../lib/sensor-edit'
import { normalizeSensorVersion, sensorSdkVersion } from '../lib/sensor-version'

/**
 * Choosing a sensor's tools from what it reports. The platform cannot know
 * which tools a sensor has (a third-party sensor can carry anything), so the
 * install flow no longer asks: the sensor reports its inventory on its first
 * heartbeat and the administrator narrows it here, or leaves every reported
 * tool allowed. Effective tools = reported ∩ allowed; an empty allowed list
 * means every reported tool (api RFC-029 §4.3.1).
 */

/** The tools to check at first: every installed tool, or the limit already set. */
function defaultAllowed(sensor: Pick<Sensor, 'tools' | 'reported'>): string[] {
  const installed = reportedToolNames(sensor) ?? []
  const limit = sensor.tools ?? []
  if (limit.length === 0) return installed
  return installed.filter((t) => limit.includes(t as (typeof limit)[number]))
}

/**
 * Step 3 of the install flow: the sensor's self-report (host, version, SDK,
 * protocol, capacity, tools) and "Allow these tools", every installed tool
 * checked. Done saves only when something was unchecked; closing without
 * Done leaves every reported tool allowed.
 */
export function SensorFirstReport({
  sensor,
  onDone,
  onOpen,
  children,
}: {
  sensor: Sensor
  /** After Done (and the save, when there was one). */
  onDone?: () => void
  onOpen?: (sensor: Sensor) => void
  /** More settings shown above the buttons (the zone picker). */
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const listId = useId()
  const { getCapabilitiesForTools } = useSensorFormOptions()
  const { trigger: updateSensor } = useUpdateSensor(sensor.id)
  // null until the administrator touches a checkbox: the default follows the
  // report while it is still arriving.
  const [picked, setPicked] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const reported = hasReportedTools(sensor)
  const tools = [...(sensor.reported?.tools ?? [])].sort(
    (a, b) => Number(b.installed) - Number(a.installed) || a.name.localeCompare(b.name)
  )
  const installed = reportedToolNames(sensor) ?? []
  const allowed = picked ?? defaultAllowed(sensor)
  const narrowed = installed.some((name) => !allowed.includes(name))
  const noneAllowed = installed.length > 0 && allowed.length === 0

  const version = normalizeSensorVersion(sensor.version)
  const sdk = sensorSdkVersion(sensor)
  const platform = [sensor.reported?.os, sensor.reported?.arch].filter(Boolean).join('/')
  const slots = sensor.reported?.max_concurrent_jobs ?? null
  const protocol = sensor.protocol

  const toggle = (name: string, on: boolean) =>
    setPicked((cur) => {
      const base = cur ?? defaultAllowed(sensor)
      return on ? [...new Set([...base, name])] : base.filter((x) => x !== name)
    })

  const handleDone = async () => {
    if (noneAllowed) return
    const body = reported ? allowedToolsBody(sensor, allowed, getCapabilitiesForTools) : null
    if (body) {
      setSaving(true)
      try {
        await updateSensor(body)
        toast.success(t('sensors.review.saved', 'Tool list saved'))
        await invalidateSensorsCache()
      } catch (err) {
        toast.error(
          getErrorMessage(err, t('sensors.review.saveError', 'Could not save the tool list'))
        )
        setSaving(false)
        return
      }
      setSaving(false)
    }
    setDone(true)
    onDone?.()
  }

  return (
    <div className="space-y-4">
      <div
        className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-3 text-sm"
        role="status"
      >
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium">{t('sensors.review.connected', 'Connected')}</p>
          <p className="text-muted-foreground">
            {t('sensors.review.firstHeartbeat', '{name} sent its first heartbeat.', {
              name: sensor.name,
            })}
          </p>
        </div>
      </div>

      <section
        className="space-y-3"
        aria-label={t('sensors.review.reportedTitle', 'What it reported')}
      >
        <h3 className="text-sm font-semibold">
          {t('sensors.review.reportedTitle', 'What it reported')}
        </h3>
        {/* Two columns from phone width up: the four values are short. */}
        <DetailFieldGrid className="grid-cols-2 gap-x-4 rounded-lg border bg-background p-3">
          <DetailField label={t('sensors.review.host', 'Host')}>
            <span className="flex flex-col gap-0.5">
              <span className="break-all">
                {sensor.hostname || t('sensors.review.notReported', 'Not reported')}
              </span>
              {platform && <span className="text-xs text-muted-foreground">{platform}</span>}
            </span>
          </DetailField>
          <DetailField label={t('sensors.review.version', 'Version')}>
            <span className="flex flex-col gap-0.5 tabular-nums">
              <span>{version ?? t('sensors.review.notReported', 'Not reported')}</span>
              {sdk && (
                <span className="text-xs text-muted-foreground">
                  {t('sensors.review.sdk', 'SDK {version}', { version: sdk })}
                </span>
              )}
            </span>
          </DetailField>
          <DetailField label={t('sensors.review.protocol', 'Protocol')}>
            {protocol ? (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                v{protocol.version}
                {(protocol.deprecated || protocol.version < 2) && (
                  <SensorTag tone="warning">
                    {t('sensors.review.deprecated', 'deprecated')}
                  </SensorTag>
                )}
              </span>
            ) : (
              t('sensors.review.notReported', 'Not reported')
            )}
          </DetailField>
          <DetailField label={t('sensors.review.capacity', 'Capacity')}>
            <span className="tabular-nums">
              {slots != null && slots > 0
                ? t('sensors.review.slots', '{count} jobs at once', { count: slots })
                : t('sensors.review.notReported', 'Not reported')}
            </span>
          </DetailField>
        </DetailFieldGrid>
      </section>

      {!reported ? (
        <ToolsNote
          title={t('sensors.review.toolsUnknown', 'It has not reported its tools.')}
          text={t(
            'sensors.review.toolsUnknownHint',
            'Older sensors do not send a tool list. This updates by itself if one arrives.'
          )}
        />
      ) : tools.length === 0 || installed.length === 0 ? (
        <ToolsNote
          title={t('sensors.review.noTools', 'It reported no scanning tools.')}
          text={t(
            'sensors.review.noToolsHint',
            'That is normal for a collector or a custom sensor. There is nothing to choose.'
          )}
        />
      ) : (
        <fieldset className="space-y-2" aria-describedby={`${listId}-hint`}>
          <legend className="text-sm font-semibold">
            {t('sensors.review.allowTitle', 'Allow these tools')}
          </legend>
          <p id={`${listId}-hint`} className="text-xs text-muted-foreground">
            {narrowed
              ? t(
                  'sensors.review.narrowedHint',
                  'Only the checked tools get jobs. You can change this later in Edit sensor.'
                )
              : t(
                  'sensors.review.allowHint',
                  'Jobs can use every reported tool until you narrow this.'
                )}
          </p>
          <ul
            className="divide-y rounded-lg border bg-background"
            aria-label={t('sensors.review.reportedTools', 'Reported tools')}
          >
            {tools.map((tool) => {
              const id = `${listId}-${tool.name}`
              const on = tool.installed && allowed.includes(tool.name)
              return (
                <li
                  key={tool.name}
                  data-tool={tool.name}
                  className="flex min-h-10 items-center gap-3 px-3 py-2 text-sm"
                >
                  <Checkbox
                    id={id}
                    checked={on}
                    disabled={!tool.installed || saving || done}
                    onCheckedChange={(v) => toggle(tool.name, v === true)}
                  />
                  <label
                    htmlFor={id}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2',
                      tool.installed ? 'cursor-pointer' : 'text-muted-foreground'
                    )}
                  >
                    <span className="truncate font-medium">{tool.name}</span>
                    {tool.version && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {tool.version}
                      </span>
                    )}
                    {tool.capabilities && tool.capabilities.length > 0 && (
                      <span
                        className="truncate text-xs text-muted-foreground"
                        title={t('sensors.review.serves', 'Serves {caps}', {
                          caps: tool.capabilities.join(', '),
                        })}
                      >
                        {tool.capabilities.join(' · ')}
                      </span>
                    )}
                  </label>
                  {!tool.installed && (
                    <SensorTag>{t('sensors.review.notInstalled', 'not installed')}</SensorTag>
                  )}
                </li>
              )
            })}
          </ul>
          {noneAllowed && (
            <p className="text-xs text-destructive" role="alert">
              {t('sensors.review.pickOne', 'Allow at least one tool.')}
            </p>
          )}
        </fieldset>
      )}

      {children}

      <div className="flex flex-wrap justify-end gap-2">
        {onOpen && (
          <Button variant="outline" onClick={() => onOpen(sensor)}>
            {t('sensors.review.open', 'Open sensor')}
          </Button>
        )}
        <Button onClick={() => void handleDone()} disabled={saving || noneAllowed || done}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t('sensors.review.done', 'Done')}
        </Button>
      </div>
    </div>
  )
}

function ToolsNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-dashed bg-background p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

/**
 * In the drawer's Tools & capacity section: an installed tool the sensor's
 * narrowed tool list leaves out (installed after the list was chosen), with
 * a one-click Allow. Nothing when the sensor allows every reported tool.
 */
export function SensorToolsNotAllowedNotice({
  sensor,
  canManage,
}: {
  sensor: Sensor
  canManage: boolean
}) {
  const { t } = useTranslation()
  const { getCapabilitiesForTools } = useSensorFormOptions()
  const { trigger: updateSensor } = useUpdateSensor(sensor.id)
  const [busy, setBusy] = useState<string | null>(null)
  const extra = toolsInstalledNotAllowed(sensor)
  if (extra.length === 0) return null

  const allow = async (tool: string) => {
    setBusy(tool)
    try {
      await updateSensor(allowToolBody(sensor, tool, getCapabilitiesForTools))
      toast.success(t('sensors.tools.allowed', '{tool} allowed', { tool }))
      await invalidateSensorsCache()
    } catch (err) {
      toast.error(
        getErrorMessage(err, t('sensors.tools.allowError', 'Could not allow {tool}', { tool }))
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <ul className="space-y-1.5" aria-label={t('sensors.tools.notAllowedList', 'Tools not allowed')}>
      {extra.map((tool) => (
        <li
          key={tool}
          data-tool={tool}
          className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-dashed px-3 py-1.5 text-sm"
        >
          <Info className="h-3.5 w-3.5 shrink-0 text-info" aria-hidden />
          <span className="min-w-0 flex-1">
            {t('sensors.tools.notAllowed', '{tool} is installed but not allowed', { tool })}
          </span>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={busy !== null}
              aria-label={t('sensors.tools.allowNamed', 'Allow {tool}', { tool })}
              onClick={() => void allow(tool)}
            >
              {busy === tool && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {t('sensors.tools.allow', 'Allow')}
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
