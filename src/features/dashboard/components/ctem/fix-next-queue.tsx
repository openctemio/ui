'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/features/shared'
import { PriorityClassBadge } from '@/features/findings/components/priority-class-badge'
import type { PriorityClass } from '@/features/findings/types/finding.types'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KevChip } from './kev-chip'
import { STATE_TEXT } from '../../lib/ctem-colors'
import type { ExecTopRisk, ExposureChain } from '../../hooks/use-ctem-dashboard'

interface FixNextItem {
  key: string
  score: number
  title: string
  href: string
  kev: boolean
  priorityClass?: PriorityClass
  meta: string[]
}

interface FixNextQueueProps {
  chains?: ExposureChain[]
  topRisks?: ExecTopRisk[]
  isLoading?: boolean
  limit?: number
}

function toItems(chains: ExposureChain[], topRisks: ExecTopRisk[]): FixNextItem[] {
  const chainItems: FixNextItem[] = chains.map((c, i) => {
    const hopCount = c.hops?.length ?? 0
    return {
      key: `chain-${i}-${c.target_name}`,
      score: Math.round(c.score),
      title: `${c.target_name} — via ${c.entry_point_name}`,
      href: '/exposure-chains',
      kev: c.kev_count > 0,
      meta: [
        `${hopCount} hop${hopCount === 1 ? '' : 's'}`,
        ...(c.is_crown_jewel ? ['crown jewel'] : []),
      ],
    }
  })

  const riskItems: FixNextItem[] = topRisks.map((r, i) => {
    const priorityClass = (r.priority_class?.toUpperCase() as PriorityClass) || undefined
    // Build a stacked deep-link: priority class AND (when exploited) KEV.
    const listParams = new URLSearchParams()
    if (priorityClass) listParams.set('priority', priorityClass)
    if (r.is_in_kev) listParams.set('kev', 'true')
    const listQuery = listParams.toString()
    return {
      key: `risk-${i}-${r.title}`,
      // EPSS is 0..1; scale to a comparable 0..100 exposure score.
      score: Math.round((r.epss_score ?? 0) * 100),
      title: r.title,
      // Deep-link to the specific finding when the id is present (sibling API PR
      // is adding it); otherwise fall back to the filtered list. CTEM filters now
      // stack, so a KEV top-risk links straight to the P0-AND-KEV intersection.
      href: r.finding_id
        ? `/findings/${r.finding_id}`
        : listQuery
          ? `/findings?${listQuery}`
          : '/findings',
      kev: r.is_in_kev,
      priorityClass,
      meta: [r.asset_name].filter(Boolean),
    }
  })

  return [...chainItems, ...riskItems].sort((a, b) => b.score - a.score)
}

export function FixNextQueue({ chains, topRisks, isLoading, limit = 6 }: FixNextQueueProps) {
  const items = toItems(chains ?? [], topRisks ?? []).slice(0, limit)

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-semibold tracking-tight">Fix next</span>
        <span className="text-[11px] text-muted-foreground">ranked by exposure</span>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing exploitable right now"
            description="No reachable exposure chains or top risks to triage."
            card={false}
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((it) => (
              <li key={it.key} className="flex items-center gap-3 py-2.5">
                <span
                  className={cn(
                    'w-7 shrink-0 text-center text-sm font-bold',
                    it.score >= 40 ? STATE_TEXT.crit : STATE_TEXT.warn
                  )}
                >
                  {it.score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{it.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {it.kev && <KevChip />}
                    {it.priorityClass && (
                      <PriorityClassBadge priorityClass={it.priorityClass} showTooltip={false} />
                    )}
                    {it.meta.map((m) => (
                      <span key={m} className="truncate">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={it.href}
                  aria-label={`Triage ${it.title}`}
                  className="shrink-0 text-[11px] font-semibold text-primary hover:underline focus-visible:underline"
                >
                  Triage →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
