'use client'

import { createElement, Fragment } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { useExposureChains } from '@/features/attack-surface'
import type { ExposureChain, ChainHop } from '@/features/attack-surface'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Route,
  ShieldAlert,
  Globe,
  Server,
  Crown,
  ArrowRight,
  GitBranch,
  Network,
  Target,
  AlertOctagon,
  Flame,
} from 'lucide-react'

// ============================================================
// Utility helpers
// ============================================================

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

function getCriticalityClass(criticality: string) {
  switch (criticality) {
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'high':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'medium':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    case 'low':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getAssetTypeIcon(assetType: string) {
  switch (assetType) {
    case 'host':
    case 'cloud_instance':
      return Server
    case 'domain':
    case 'subdomain':
    case 'website':
    case 'application':
      return Globe
    default:
      return GitBranch
  }
}

// ============================================================
// Skeleton loading state
// ============================================================

function LoadingSkeleton() {
  return (
    <>
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ============================================================
// Hop path — entry → … → target breadcrumb
// ============================================================

function HopPath({ hops }: { hops: ChainHop[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hops.map((hop, idx) => {
        const isEntry = idx === 0
        const isTarget = idx === hops.length - 1
        const Icon = getAssetTypeIcon(hop.assetType)
        return (
          <Fragment key={hop.assetId}>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs',
                isEntry && 'border-red-500/30 bg-red-500/10 text-red-500',
                isTarget && 'border-orange-500/30 bg-orange-500/10 font-medium text-orange-500',
                !isEntry && !isTarget && 'border-border bg-muted/40 text-muted-foreground'
              )}
              title={`${hop.name} (${capitalize(hop.assetType)}, ${capitalize(hop.exposure)})`}
            >
              {isEntry && <Globe className="h-3 w-3 shrink-0" aria-label="Public entry point" />}
              {!isEntry && createElement(Icon, { className: 'h-3 w-3 shrink-0' })}
              <span className="max-w-[10rem] truncate">{hop.name}</span>
            </span>
            {!isTarget && <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </Fragment>
        )
      })}
    </div>
  )
}

// ============================================================
// Chain row
// ============================================================

interface ChainRowProps {
  chain: ExposureChain
  rank: number
  maxScore: number
}

function ChainRow({ chain, rank, maxScore }: ChainRowProps) {
  const progressPct = maxScore > 0 ? Math.round((chain.score / maxScore) * 100) : 0

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30">
      {/* Rank badge */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        {/* Target header */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Target className="h-4 w-4 shrink-0 text-orange-500" />
          <span className="truncate font-medium">{chain.targetName}</span>

          {chain.isCrownJewel && (
            <Crown className="h-4 w-4 shrink-0 text-yellow-500" aria-label="Crown jewel" />
          )}

          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs', getCriticalityClass(chain.targetCriticality))}
          >
            {capitalize(chain.targetCriticality)}
          </Badge>

          {chain.kevCount > 0 && (
            <Badge
              variant="outline"
              className="shrink-0 gap-1 border-red-500/30 bg-red-500/10 text-xs text-red-500"
            >
              <AlertOctagon className="h-3 w-3" />
              {chain.kevCount} KEV
            </Badge>
          )}
          {chain.criticalCount > 0 && (
            <Badge
              variant="outline"
              className="shrink-0 gap-1 border-orange-500/30 bg-orange-500/10 text-xs text-orange-500"
            >
              <Flame className="h-3 w-3" />
              {chain.criticalCount} critical
            </Badge>
          )}

          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
            {chain.length === 0
              ? 'directly exposed'
              : `${chain.length} hop${chain.length !== 1 ? 's' : ''}`}
          </Badge>
        </div>

        {/* Hop path */}
        <div className="mb-2">
          <HopPath hops={chain.hops} />
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-3">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="w-20 shrink-0 text-end text-xs text-muted-foreground">
            score {chain.score.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Reachable-from counter */}
      <div className="flex shrink-0 flex-col items-center text-center">
        <span className="text-2xl font-bold leading-none tabular-nums">
          {chain.reachableFromEntryPoints}
        </span>
        <span className="mt-0.5 text-xs text-muted-foreground">
          {chain.reachableFromEntryPoints === 1 ? 'entry point' : 'entry points'}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// No relationship data callout
// ============================================================

function NoRelationshipData() {
  return (
    <EmptyState
      icon={Network}
      title="No relationship data yet"
      description="Exposure chains are built from asset relationships. Add relationships between your assets so we can trace paths from internet-facing entry points to assets carrying KEV or critical findings."
      action={
        <Link
          href="/assets"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Assets
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    />
  )
}

// ============================================================
// Page
// ============================================================

export default function ExposureChainsPage() {
  const { chains: data, isLoading } = useExposureChains()

  const summary = data?.summary
  const chains = data?.chains ?? []
  const maxScore = chains.length > 0 ? chains[0].score : 1
  const hasData = summary?.hasRelationshipData === true

  return (
    <Main>
      <PageHeader
        title="Exposure Chains"
        description="Concrete attack paths from internet-facing entry points to assets carrying KEV or critical findings — ranked by urgency"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <NoRelationshipData />
      ) : (
        <>
          {/* Stats row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Entry Points"
              value={summary?.entryPoints ?? 0}
              icon={Globe}
              description="Internet-facing assets"
              changeType={summary && summary.entryPoints > 0 ? 'negative' : 'positive'}
            />
            <StatsCard
              title="Targets at Risk"
              value={summary?.targetsAtRisk ?? 0}
              icon={ShieldAlert}
              description="Reachable KEV/critical assets"
              changeType={summary && summary.targetsAtRisk > 0 ? 'negative' : 'positive'}
            />
            <StatsCard
              title="Exposure Chains"
              value={summary?.totalChains ?? 0}
              icon={Route}
              description="Entry-point to dangerous asset"
              changeType={summary && summary.totalChains > 0 ? 'negative' : 'positive'}
            />
            <StatsCard
              title="Shown"
              value={chains.length}
              icon={Target}
              description="Top chains by urgency"
              changeType="neutral"
            />
          </section>

          {/* Main: ranked chains + explainer */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Route className="h-5 w-5" />
                    Chains Ranked by Urgency
                  </CardTitle>
                  <CardDescription>
                    Each chain is the shortest path from a public entry point to an asset with open
                    KEV or critical findings. Break the top chains first.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chains.length > 0 ? (
                    <div className="space-y-3">
                      {chains.map((chain, idx) => (
                        <ChainRow
                          key={`${chain.entryPointId}-${chain.targetId}`}
                          chain={chain}
                          rank={idx + 1}
                          maxScore={maxScore}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center text-center">
                      <ShieldAlert className="mb-3 h-10 w-10 text-green-500" />
                      <p className="font-medium text-green-500">No exposure chains found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No internet-facing entry point currently reaches an asset with KEV or
                        critical findings via tracked relationships.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar explainer */}
            <div className="flex flex-col gap-6">
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">How Chains Are Built</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Entry point</strong> — any asset with public
                    exposure, the foothold an attacker reaches directly.
                  </p>
                  <p>
                    <strong className="text-foreground">Path</strong> — BFS over attack-path
                    relationships (runs_on, depends_on, exposes, stores_data_in, …) capturing the
                    shortest route to each dangerous asset.
                  </p>
                  <p>
                    <strong className="text-foreground">Target</strong> — an asset carrying open KEV
                    or critical findings. A directly-exposed target (0 hops) is the most urgent.
                  </p>
                  <p>
                    <strong className="text-foreground">Score</strong> — KEV-weighted danger x
                    criticality x crown-jewel, amplified the closer the target sits to the internet.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </Main>
  )
}
