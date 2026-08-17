'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { STATE_TEXT } from '../../lib/ctem-colors'
import type { ThreatIntelStats } from '../../hooks/use-ctem-dashboard'

interface ThreatIntelCardProps {
  stats?: ThreatIntelStats
  isLoading?: boolean
}

function Kv({ n, label, danger }: { n: number; label: string; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn('text-lg font-semibold tabular-nums', danger && STATE_TEXT.crit)}>
        {n.toLocaleString()}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

export function ThreatIntelCard({ stats, isLoading }: ThreatIntelCardProps) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-semibold tracking-tight">Threat intel context</span>
        <span className="text-[11px] text-muted-foreground">threat-intel · live</span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kv n={stats.kev?.past_due_count ?? 0} label="KEV past-due" danger />
            <Kv n={stats.kev?.ransomware_related_count ?? 0} label="Ransomware KEV" />
            <Kv n={stats.epss?.critical_risk_count ?? 0} label="EPSS critical" />
            <Kv n={stats.kev?.recently_added_last_30_days ?? 0} label="KEV new · 30d" />
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">Threat intel unavailable</p>
        )}
      </CardContent>
    </Card>
  )
}
