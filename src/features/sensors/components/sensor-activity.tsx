'use client'

import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/context/i18n-provider'
import {
  ActivityTimeline,
  DetailSection,
  type ActivityTimelineEntry,
  type ActivityTimelineFilterOption,
} from '@/features/shared'
import { useSensorActivity } from '@/lib/api/sensor-hooks'
import {
  SENSOR_ACTIVITY_CATEGORIES,
  type SensorActivityCategory,
  type SensorActivityItem,
} from '@/lib/api/sensor-types'

import { describeSensorActivity, SENSOR_ACTIVITY_CHIP_KEYS, type Translate } from '../lib/activity'

function toEntry(item: SensorActivityItem, t: Translate, locale: string): ActivityTimelineEntry {
  const view = describeSensorActivity(item, t, locale)
  return {
    id: item.id,
    at: item.at,
    icon: view.icon,
    tone: view.tone,
    title: view.title,
    detail:
      view.details.length > 0 ? (
        <>
          {view.details.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </>
      ) : undefined,
    repeatCount: item.repeat_count,
    lastAt: item.last_at,
  }
}

/**
 * The drawer's Activity tab: what happened to the sensor (connection changes,
 * restarts, upgrades, protocol / tool / capacity / content changes, jobs and,
 * for owners and administrators, administrator actions), from
 * GET /sensors/{id}/activity, which every sensor reader may call.
 */
export function SensorActivity({ sensorId }: { sensorId: string }) {
  const { t, locale } = useTranslation()
  const [types, setTypes] = useState<SensorActivityCategory[]>([])
  const activity = useSensorActivity(sensorId, types)

  const entries = useMemo(
    () => activity.items.map((it) => toEntry(it, t, locale)),
    [activity.items, t, locale]
  )

  const peopleHidden = !activity.auditIncluded
  const hiddenNote = t(
    'sensors.activity.peopleHidden',
    'Administrator actions are visible to owners and administrators'
  )
  const filters: ActivityTimelineFilterOption[] = SENSOR_ACTIVITY_CATEGORIES.map((c) => {
    const [key, fallback] = SENSOR_ACTIVITY_CHIP_KEYS[c]
    return {
      value: c,
      label: t(key, fallback),
      // The API never returns administrator actions to this viewer.
      disabled: c === 'people' && peopleHidden,
      hint: c === 'people' && peopleHidden ? hiddenNote : undefined,
    }
  })

  return (
    <ActivityTimeline
      entries={entries}
      filters={filters}
      selectedFilters={types}
      onSelectedFiltersChange={(next) =>
        setTypes(
          SENSOR_ACTIVITY_CATEGORIES.filter(
            (c) => next.includes(c) && !(c === 'people' && peopleHidden)
          )
        )
      }
      loading={activity.isLoading}
      error={activity.error}
      errorTitle={t('sensors.activity.errorTitle', 'sensor activity')}
      onRetry={() => void activity.retry()}
      hasMore={activity.hasMore}
      loadingMore={activity.isLoadingMore}
      onLoadMore={() => void activity.loadMore()}
      emptyTitle={t('sensors.activity.emptyTitle', 'No activity yet')}
      emptyDescription={t(
        'sensors.activity.emptyDescription',
        'Restarts, upgrades, protocol and tool changes, connection changes, jobs and administrator actions will appear here as they happen.'
      )}
      notice={peopleHidden ? hiddenNote : undefined}
    />
  )
}

/**
 * The latest few events, on the drawer's Overview tab: the shared timeline in
 * its compact form (who did it for an administrator action, no other
 * details), and "All activity" to the Activity tab.
 */
export function SensorRecentActivity({ sensorId, onAll }: { sensorId: string; onAll: () => void }) {
  const { t, locale } = useTranslation()
  const { items, isLoading, error } = useSensorActivity(sensorId, [], { limit: 5 })
  const entries = useMemo(
    () =>
      items.slice(0, 5).map((it): ActivityTimelineEntry => {
        const actor = it.type === 'audit' && it.actor && it.actor !== 'system' ? it.actor : null
        return { ...toEntry(it, t, locale), detail: actor ? `by ${actor}` : undefined }
      }),
    [items, t, locale]
  )
  return (
    <DetailSection
      title={t('sensors.activity.recent', 'Recent activity')}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onAll}
        >
          {t('sensors.activity.all', 'All activity')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : error ? (
        <p className="text-sm text-muted-foreground">
          {t('sensors.activity.recentError', 'Could not load the activity.')}
        </p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('sensors.activity.nothingYet', 'Nothing recorded yet.')}
        </p>
      ) : (
        <ActivityTimeline
          entries={entries}
          density="compact"
          emptyTitle={t('sensors.activity.nothingYet', 'Nothing recorded yet.')}
        />
      )}
    </DetailSection>
  )
}
