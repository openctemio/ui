'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/features/shared'
import { Crown, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KevChip } from './kev-chip'
import { STATE_TEXT } from '../../lib/ctem-colors'
import type { AttackPathsResponse, ExposureChain } from '../../hooks/use-ctem-dashboard'

interface AttackPathsCardProps {
  attackPaths?: AttackPathsResponse
  chains?: ExposureChain[]
  isLoading?: boolean
}

export function AttackPathsCard({ attackPaths, chains, isLoading }: AttackPathsCardProps) {
  const reachable = attackPaths?.summary.reachable_assets ?? 0
  const crownJewels = attackPaths?.summary.crown_jewels_at_risk ?? 0
  const topChains = (chains ?? []).slice(0, 4)

  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-semibold tracking-tight">Attack paths → crown jewels</span>
        <span className="font-mono text-[11px] text-muted-foreground">{reachable} reachable</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : crownJewels === 0 ? (
          <EmptyState
            icon={Crown}
            title="No crown jewels designated"
            description={
              reachable > 0
                ? `${reachable} paths reach live assets — mark crown jewels to rank them by business impact.`
                : 'Mark high-value assets as crown jewels to rank exposure by business impact.'
            }
            card={false}
            action={
              <Button asChild size="sm">
                <Link href="/assets">
                  Designate <ArrowRight className="ms-1 h-4 w-4" />
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className={cn('font-mono text-3xl font-semibold tabular-nums', STATE_TEXT.crit)}>
              {crownJewels}
            </span>
            <span className="text-xs text-muted-foreground">crown jewels at risk</span>
          </div>
        )}

        {topChains.length > 0 && (
          <>
            <p className="mb-1 mt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Reachable now
            </p>
            <ul className="divide-y divide-border">
              {topChains.map((c, i) => (
                <li key={`${c.target_name}-${i}`} className="flex items-center gap-2 py-2 text-xs">
                  <span className="truncate">{c.target_name}</span>
                  <span className="font-mono text-muted-foreground">→</span>
                  <span className="truncate text-muted-foreground">{c.entry_point_name}</span>
                  {c.kev_count > 0 && <KevChip />}
                  <span
                    className={cn(
                      'ms-auto font-mono text-xs font-bold tabular-nums',
                      STATE_TEXT.crit
                    )}
                  >
                    {Math.round(c.score)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
