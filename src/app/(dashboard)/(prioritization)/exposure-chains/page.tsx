'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { useExposureChains, PathGraph } from '@/features/attack-surface'
import type { ExposureChain, PathGraphPath, PathGraphNode } from '@/features/attack-surface'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Route, ShieldAlert, ShieldCheck, Globe, ArrowRight, Network, Target } from 'lucide-react'

// ============================================================
// Map an exposure chain onto the generic path-graph model.
// hops[] is ordered entry → … → target; per-chain KEV/critical
// counts and criticality attach to the target node.
// ============================================================

function chainToPath(chain: ExposureChain, maxScore: number): PathGraphPath {
  const lastIdx = chain.hops.length - 1
  const nodes: PathGraphNode[] = chain.hops.map((hop, idx) => {
    const isTarget = idx === lastIdx
    return {
      id: hop.assetId,
      name: hop.name,
      assetType: hop.assetType,
      role: idx === 0 ? 'entry' : isTarget ? 'target' : 'hop',
      exposure: hop.exposure,
      criticality: isTarget ? chain.targetCriticality : undefined,
      isCrownJewel: isTarget ? chain.isCrownJewel : undefined,
      kev: isTarget ? chain.kevCount > 0 : undefined,
      href: hop.assetId ? `/findings?assetId=${hop.assetId}` : undefined,
    }
  })

  return {
    id: `${chain.entryPointId}-${chain.targetId}`,
    nodes,
    score: chain.score,
    scorePct: maxScore > 0 ? (chain.score / maxScore) * 100 : 0,
    kevCount: chain.kevCount,
    criticalCount: chain.criticalCount,
    reachableFrom: chain.reachableFromEntryPoints,
  }
}

// ============================================================
// Skeleton loading state
// ============================================================

function LoadingSkeleton() {
  return (
    <>
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <Card className="mt-5">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
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
        <Button size="sm" asChild>
          <Link href="/assets">
            Go to assets
            <ArrowRight className="ms-2 h-4 w-4" />
          </Link>
        </Button>
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
  const chains = useMemo(() => data?.chains ?? [], [data])
  const hasData = summary?.hasRelationshipData === true

  const paths = useMemo(() => {
    const maxScore = chains.length > 0 ? chains[0].score : 1
    return chains.map((chain, idx) => ({
      ...chainToPath(chain, maxScore),
      rank: idx + 1,
    }))
  }, [chains])

  return (
    <Main>
      <PageHeader
        title="Exposure chains"
        description="Attack paths from internet-facing entry points to assets with KEV or critical findings, ranked by urgency."
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <NoRelationshipData />
      ) : (
        <>
          {/* Stats row */}
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Entry points"
              value={summary?.entryPoints ?? 0}
              icon={Globe}
              description="Internet-facing assets"
            />
            <StatsCard
              title="Targets at risk"
              value={summary?.targetsAtRisk ?? 0}
              valueClassName={(summary?.targetsAtRisk ?? 0) > 0 ? 'text-destructive' : undefined}
              icon={ShieldAlert}
              description="Reachable KEV/critical assets"
            />
            <StatsCard
              title="Exposure chains"
              value={summary?.totalChains ?? 0}
              icon={Route}
              description="Entry-point to dangerous asset"
            />
            <StatsCard
              title="Shown"
              value={chains.length}
              icon={Target}
              description="Top chains by urgency"
            />
          </section>

          {/* Main: ranked chains + explainer */}
          <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* The ranked list is a column of bordered chain rows, so it sits under a
                section heading rather than inside another card. */}
            <section className="space-y-3 lg:col-span-2">
              <div>
                <h2 className="text-base font-semibold">Chains ranked by urgency</h2>
                <p className="text-sm text-muted-foreground">
                  Each chain is the shortest path from a public entry point to an asset with open
                  KEV or critical findings. Hover to trace a path; click any node to open that
                  asset&apos;s findings. Break the top chains first.
                </p>
              </div>
              <PathGraph
                paths={paths}
                empty={
                  <EmptyState
                    icon={ShieldCheck}
                    title="No exposure chains"
                    description="No internet-facing entry point reaches an asset with KEV or critical findings through tracked relationships."
                  />
                }
              />
            </section>

            {/* Sidebar explainer */}
            <div className="flex flex-col gap-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">How chains are built</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-xs">
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
