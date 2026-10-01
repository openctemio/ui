'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ClipboardList, Grid3x3, RotateCcw, ShieldCheck, Swords } from 'lucide-react'
import { Main } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EmptyState,
  LinkCard,
  MetricStrip,
  PageHeader,
  RelativeTime,
  SettingsSection,
  type MetricStripItem,
} from '@/features/shared'
import { useValidationCoverage } from '@/features/validation/api/use-validation-coverage'
import { useModuleEnabled } from '@/features/integrations/api/use-tenant-modules'
import {
  useAdaptedAllPentestFindings,
  useAdaptedCampaigns,
} from '@/features/pentest/api/use-pentest-api'
import { getRetestableFindings } from '@/features/pentest/components/pentest-retests-section'
import { campaignHref } from '@/features/pentest/lib/campaign-links'
import { useControlTests, useSimulations } from '@/features/simulation/api/use-simulation-api'
import { useHasPermission, Permission } from '@/lib/permissions'

const pct = (validated: number, total: number) =>
  total > 0 ? `${Math.round((validated / total) * 100)}%` : '–'

interface Activity {
  key: string
  when: string
  what: string
  where: string
  href: string
}

/**
 * Validation › Overview: is the program proving its fixes and its controls?
 *
 * - Coverage: of the P0/P1 findings that were closed, the share with
 *   validation evidence, the same definition the CTEM cycle's close gate uses
 *   (api computeValidationCoverage, served tenant-wide by
 *   GET /api/v1/validation/coverage `by_priority`).
 * - Retests due, open campaigns, and the latest activity across pentest,
 *   attack simulation and control testing, each only when its module is on.
 */
export default function ValidationOverviewPage() {
  const canPentest = useHasPermission(Permission.PentestRead)
  const pentestOn = useModuleEnabled('pentest') && canPentest
  const simOn = useModuleEnabled('attack_simulation') && canPentest
  const controlsOn = useModuleEnabled('control_testing') && canPentest
  const attackCoverageOn = useModuleEnabled('mitre_coverage') && canPentest

  const { data: coverage, isLoading: coverageLoading } = useValidationCoverage()
  // null skips the request when the pentest module is off (no 403 noise).
  const { data: campaignsData, isLoading: campaignsLoading } = useAdaptedCampaigns(
    pentestOn ? undefined : null
  )
  const { data: findingsData, isLoading: findingsLoading } = useAdaptedAllPentestFindings(
    pentestOn ? { per_page: 200 } : null
  )
  const { data: simsData } = useSimulations({ enabled: simOn })
  const { data: testsData } = useControlTests({ enabled: controlsOn })

  const campaigns = useMemo(() => campaignsData?.data ?? [], [campaignsData])
  const findings = useMemo(() => findingsData?.data ?? [], [findingsData])
  const retestsDue = useMemo(() => getRetestableFindings(findings).length, [findings])
  const openCampaigns = campaigns.filter(
    (c) => c.status === 'in_progress' || c.status === 'planning'
  ).length

  const byPriority = coverage?.by_priority ?? []
  const p0p1Total = coverage?.p0_p1_total ?? 0
  const p0p1Validated = coverage?.p0_p1_validated ?? 0

  const metrics: MetricStripItem[] = [
    {
      key: 'coverage',
      label: 'P0/P1 validation coverage',
      value: coverage?.by_priority ? pct(p0p1Validated, p0p1Total) : '–',
    },
    ...(pentestOn
      ? [
          { key: 'retests', label: 'Retests due', value: retestsDue },
          { key: 'campaigns', label: 'Open campaigns', value: openCampaigns },
        ]
      : []),
    ...(simOn
      ? [
          {
            key: 'sims',
            label: 'Simulations',
            value: simsData?.total ?? simsData?.data?.length ?? 0,
          },
        ]
      : []),
    ...(controlsOn
      ? [
          {
            key: 'controls',
            label: 'Control tests',
            value: testsData?.total ?? testsData?.data?.length ?? 0,
          },
        ]
      : []),
  ]

  const activity: Activity[] = useMemo(() => {
    const items: Activity[] = []
    const campaignName = (id: string) => campaigns.find((c) => c.id === id)?.name ?? 'Campaign'
    for (const f of findings) {
      items.push({
        key: `f-${f.id}`,
        when: f.updatedAt,
        what: f.title,
        where: `Pentest · ${campaignName(f.campaignId)}`,
        href: campaignHref(f.campaignId, 'findings'),
      })
    }
    for (const s of simsData?.data ?? []) {
      if (!s.last_run_at) continue
      items.push({
        key: `s-${s.id}`,
        when: s.last_run_at,
        what: s.name,
        where: 'Attack simulation',
        href: '/attack-simulation',
      })
    }
    for (const t of testsData?.data ?? []) {
      if (!t.last_tested_at) continue
      items.push({
        key: `c-${t.id}`,
        when: t.last_tested_at,
        what: t.name,
        where: `Control testing · ${t.framework}`,
        href: '/control-testing',
      })
    }
    return items
      .filter((i) => i.when && !isNaN(new Date(i.when).getTime()))
      .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())
      .slice(0, 10)
  }, [findings, campaigns, simsData, testsData])

  const areas = [
    pentestOn && {
      href: '/pentest/campaigns',
      icon: ClipboardList,
      title: 'Pentest campaigns',
      description: 'Engagements with their findings, retests, reports, scope and team.',
    },
    simOn && {
      href: '/attack-simulation',
      icon: Swords,
      title: 'Attack simulation',
      description: 'Run attack techniques and measure detection and prevention.',
    },
    controlsOn && {
      href: '/control-testing',
      icon: ShieldCheck,
      title: 'Control testing',
      description: 'Test security controls against your frameworks.',
    },
    pentestOn && {
      href: '/validation/retests',
      icon: RotateCcw,
      title: 'Retest queue',
      description: 'Fixed findings waiting to be re-verified, across campaigns.',
    },
    attackCoverageOn && {
      href: '/validation/attack-coverage',
      icon: Grid3x3,
      title: 'ATT&CK coverage',
      description: 'Which ATT&CK techniques your testing has exercised.',
    },
  ].filter(Boolean) as {
    href: string
    icon: typeof ClipboardList
    title: string
    description: string
  }[]

  const loading = coverageLoading || (pentestOn && (campaignsLoading || findingsLoading))

  return (
    <Main>
      <PageHeader
        title="Validation"
        description="Whether fixes and controls are proven, and what is waiting to be re-tested."
      />
      <MetricStrip className="mt-5" loading={loading} items={metrics} />

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SettingsSection
          title="Coverage by priority"
          description="Closed findings with validation evidence (pentest, scripted or sensor)."
        >
          <Card className="py-0">
            <CardContent className="p-4">
              {coverageLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : byPriority.length === 0 ? (
                <p className="text-sm text-muted-foreground">No coverage data yet.</p>
              ) : (
                <ul className="space-y-3">
                  {byPriority.map((row) => {
                    const share = row.total > 0 ? (row.validated / row.total) * 100 : 0
                    return (
                      <li key={row.priority} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{row.priority}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {row.validated} of {row.total} · {pct(row.validated, row.total)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </SettingsSection>

        <SettingsSection title="Recent activity" description="Latest across validation work.">
          <Card className="py-0">
            <CardContent className="p-0">
              {activity.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No validation activity yet"
                  description="Pentest findings, simulation runs and control tests show up here."
                />
              ) : (
                <ul className="divide-y">
                  {activity.map((a) => (
                    <li key={a.key}>
                      <Link
                        href={a.href}
                        className="flex items-start justify-between gap-3 px-4 py-2.5 hover:bg-muted/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{a.what}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {a.where}
                          </span>
                        </span>
                        <RelativeTime
                          date={a.when}
                          className="shrink-0 text-xs text-muted-foreground"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </SettingsSection>
      </div>

      {areas.length > 0 && (
        <SettingsSection title="Validation areas" className="mt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {areas.map((a) => (
              <LinkCard key={a.href} {...a} />
            ))}
          </div>
        </SettingsSection>
      )}
    </Main>
  )
}
