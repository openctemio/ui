'use client'

/**
 * One CTEM cycle: its charter, the scope it froze, the attackers it assumes
 * and its outcome, with the next lifecycle step as the primary action. The
 * cycle is the program's scope object (docs/ui/scoping-ia-2026-10.md, C12).
 */

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { Main } from '@/components/layout'
import { ErrorState, MetricStrip, PageHeader, type MetricStripItem } from '@/features/shared'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUrlFilter } from '@/hooks/use-url-param'
import { CharterEditorSheet, summarizeEvaluation } from '@/features/cycles'
import { useCycle, useCycleProfiles, useCycleScope } from '@/features/cycles/api'
import { CycleStatusBadge } from '@/features/cycles/components/cycle-status-badge'
import { CycleLifecycleAction } from '@/features/cycles/components/cycle-lifecycle-actions'
import {
  CycleCharterTab,
  CycleOutcomeTab,
  CycleProfilesTab,
  CycleScopeTab,
} from '@/features/cycles/components/cycle-detail-tabs'
import type { CtemCycle } from '@/features/cycles'

const TABS = ['charter', 'scope', 'profiles', 'outcome'] as const
type CycleTab = (typeof TABS)[number]

function formatDate(d?: string): string {
  return d ? new Date(d).toLocaleDateString() : ''
}

/** "Day 23 of 90" while running, the date range otherwise. */
function timeline(cycle: CtemCycle): { value: string; hint?: string } {
  const start = cycle.start_date ? new Date(cycle.start_date) : null
  const end = cycle.end_date ? new Date(cycle.end_date) : null
  if (!start || !end) return { value: 'No dates' }
  const range = `${formatDate(cycle.start_date)} – ${formatDate(cycle.end_date)}`
  if (cycle.status !== 'active') return { value: range }
  const day = 86_400_000
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / day))
  const elapsed = Math.min(total, Math.max(0, Math.round((Date.now() - start.getTime()) / day)))
  return { value: `Day ${elapsed} of ${total}`, hint: range }
}

function CycleDetail() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? null
  const { data: cycle, error, isLoading, mutate } = useCycle(id)
  const frozen = cycle && cycle.status !== 'planning'
  const { data: scope } = useCycleScope(frozen ? (id ?? null) : null)
  const { data: profiles } = useCycleProfiles(id)
  const [tabParam, setTab] = useUrlFilter('tab', 'charter')
  const tab: CycleTab = (TABS as readonly string[]).includes(tabParam)
    ? (tabParam as CycleTab)
    : 'charter'
  const [charterOpen, setCharterOpen] = useState(false)

  if (error) {
    return (
      <Main>
        <PageHeader title="Cycle" />
        <div className="mt-5">
          <ErrorState title="this cycle" error={error} onRetry={() => mutate()} />
        </div>
      </Main>
    )
  }
  if (isLoading || !cycle) {
    return (
      <Main>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-5 h-[68px] w-full rounded-xl" />
        <Skeleton className="mt-5 h-64 w-full" />
      </Main>
    )
  }

  const charter = cycle.charter ?? {}
  const when = timeline(cycle)
  const profileCount = profiles?.data?.length
  const criteria = charter.success_criteria?.length ?? 0
  const metrics: MetricStripItem[] = [
    { key: 'timeline', label: 'Timeline', value: when.value, hint: when.hint },
    {
      key: 'scope',
      label: 'Assets in scope',
      value: frozen ? (scope?.length ?? '…') : '—',
      hint: frozen
        ? 'frozen on Activate'
        : `${charter.in_scope_services?.length ?? 0} in-scope services`,
      onClick: () => setTab('scope'),
      active: tab === 'scope',
    },
    {
      key: 'profiles',
      label: 'Attacker profiles',
      value: profileCount ?? '…',
      onClick: () => setTab('profiles'),
      active: tab === 'profiles',
    },
    {
      key: 'criteria',
      label: 'Success criteria',
      value: summarizeEvaluation(cycle.charter_evaluation) ?? criteria,
      hint: cycle.charter_evaluation ? undefined : 'evaluated at close',
      onClick: () => setTab('outcome'),
      active: tab === 'outcome',
    },
  ]

  return (
    <>
      <Main>
        <PageHeader
          title={cycle.name}
          description={cycle.description || 'A CTEM cycle: its charter, scope and outcome.'}
        >
          <CycleStatusBadge status={cycle.status} />
          <CycleLifecycleAction
            cycle={cycle}
            onDone={(updated, action) => {
              void mutate(updated, { revalidate: true })
              if (action === 'close') setTab('outcome')
              if (action === 'activate') setTab('scope')
            }}
          />
        </PageHeader>

        <MetricStrip className="mt-5" items={metrics} />

        <Tabs value={tab} onValueChange={setTab} className="mt-5">
          <TabsList>
            <TabsTrigger value="charter">Charter</TabsTrigger>
            <TabsTrigger value="scope">
              Scope {frozen && <TabsCount value={scope?.length} />}
            </TabsTrigger>
            <TabsTrigger value="profiles">
              Attacker profiles <TabsCount value={profileCount} />
            </TabsTrigger>
            <TabsTrigger value="outcome">Outcome</TabsTrigger>
          </TabsList>
          <TabsContent value="charter" className="mt-5">
            <CycleCharterTab cycle={cycle} onEdit={() => setCharterOpen(true)} />
          </TabsContent>
          <TabsContent value="scope" className="mt-5">
            <CycleScopeTab cycle={cycle} />
          </TabsContent>
          <TabsContent value="profiles" className="mt-5">
            <CycleProfilesTab cycle={cycle} />
          </TabsContent>
          <TabsContent value="outcome" className="mt-5">
            <CycleOutcomeTab cycle={cycle} onSaved={() => void mutate()} />
          </TabsContent>
        </Tabs>
      </Main>

      <CharterEditorSheet
        cycle={cycle}
        open={charterOpen}
        onOpenChange={setCharterOpen}
        onSaved={() => void mutate()}
      />
    </>
  )
}

export default function CycleDetailPage() {
  // useSearchParams (the tab in the URL) needs a Suspense boundary.
  return (
    <Suspense
      fallback={
        <Main>
          <Skeleton className="h-9 w-64" />
        </Main>
      }
    >
      <CycleDetail />
    </Suspense>
  )
}
