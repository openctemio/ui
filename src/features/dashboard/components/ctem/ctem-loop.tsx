'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  coverageState,
  openCountState,
  STATE_STRIPE,
  STATE_TEXT,
  type CtemState,
} from '../../lib/ctem-colors'
import type {
  ExecutiveSummary,
  ScanCoverage,
  ThreatIntelStats,
  ValidationCoverage,
} from '../../hooks/use-ctem-dashboard'

interface Stage {
  index: string
  name: string
  href: string
  value: ReactNode
  sub: string
  flag?: string
  state: CtemState
}

function StageCard({ stage }: { stage: Stage }) {
  return (
    <Link href={stage.href} className="group">
      <Card className="relative flex h-full flex-col gap-1.5 overflow-hidden p-3.5 transition-colors group-hover:border-muted-foreground/40">
        <span className={cn('absolute inset-y-0 left-0 w-[3px]', STATE_STRIPE[stage.state])} />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">{stage.name}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{stage.index}</span>
        </div>
        <div className="font-mono text-2xl font-semibold leading-none tabular-nums">
          {stage.value}
        </div>
        <p className="text-[11px] text-muted-foreground">{stage.sub}</p>
        {stage.flag && (
          <span className={cn('mt-0.5 font-mono text-[10px] font-medium', STATE_TEXT[stage.state])}>
            {stage.flag}
          </span>
        )}
      </Card>
    </Link>
  )
}

interface CtemLoopProps {
  summary?: ExecutiveSummary
  scanCoverage?: ScanCoverage
  validationCoverage?: ValidationCoverage
  threatIntel?: ThreatIntelStats
  isLoading?: boolean
}

function Unit({ children }: { children: ReactNode }) {
  return <small className="text-xs font-normal text-muted-foreground">{children}</small>
}

export function CtemLoop({
  summary,
  scanCoverage,
  validationCoverage,
  threatIntel,
  isLoading,
}: CtemLoopProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[104px] w-full" />
        ))}
      </div>
    )
  }

  const crownJewels = summary?.crown_jewels_at_risk ?? 0
  const scanPct = scanCoverage?.coverage_percent ?? 0
  const p0 = summary?.p0_open ?? 0
  const valPct = validationCoverage?.overall_pct ?? 0
  const slaPct = summary?.sla_compliance_pct ?? 0
  const kevTotal = threatIntel?.kev.total_entries ?? 0

  const stages: Stage[] = [
    {
      index: '01',
      name: 'Scoping',
      href: '/assets',
      value: (
        <>
          {crownJewels} <Unit>crown jewels</Unit>
        </>
      ),
      sub: 'at-risk high-value assets',
      flag: crownJewels === 0 ? 'designate' : undefined,
      state: crownJewels === 0 ? 'warn' : 'crit',
    },
    {
      index: '02',
      name: 'Discovery',
      href: '/scans',
      value: (
        <>
          {scanPct.toFixed(0)}
          <Unit>%</Unit>
        </>
      ),
      sub: `scan coverage · ${scanCoverage?.never_scanned ?? 0} unscanned`,
      flag:
        (scanCoverage?.critical_uncovered ?? 0) > 0
          ? `${scanCoverage?.critical_uncovered} critical uncovered`
          : undefined,
      state: coverageState(scanPct),
    },
    {
      index: '03',
      name: 'Prioritize',
      href: '/findings',
      value: (
        <>
          {p0} <Unit>P0</Unit>
        </>
      ),
      sub: `${kevTotal.toLocaleString()} KEV in catalog`,
      flag: p0 > 0 ? 'exploitable now' : undefined,
      state: openCountState(p0),
    },
    {
      index: '04',
      name: 'Validate',
      href: '/controls',
      value: (
        <>
          {valPct.toFixed(0)}
          <Unit>%</Unit>
        </>
      ),
      sub: `${validationCoverage?.validated ?? 0} of ${validationCoverage?.total ?? 0} validated`,
      flag: valPct === 0 ? 'none run yet' : undefined,
      state: coverageState(valPct),
    },
    {
      index: '05',
      name: 'Mobilize',
      href: '/remediation',
      value: (
        <>
          {slaPct.toFixed(0)}
          <Unit>%</Unit>
        </>
      ),
      sub: `SLA · ${summary?.sla_breached ?? 0} breached`,
      flag: slaPct >= 90 ? 'on track' : undefined,
      state: slaPct >= 90 ? 'good' : slaPct >= 70 ? 'warn' : 'crit',
    },
  ]

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        The CTEM loop — one real KPI per stage, click to drill in
      </p>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {stages.map((s) => (
          <StageCard key={s.index} stage={s} />
        ))}
      </div>
    </div>
  )
}
