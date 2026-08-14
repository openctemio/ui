'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { useExposureChains, PathGraph } from '@/features/attack-surface'
import type { ExposureChain, PathGraphPath, PathGraphNode } from '@/features/attack-surface'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CRITICALITY_CHART_COLORS } from '@/lib/criticality-colors'
import { Route, ShieldAlert, ShieldCheck, Globe, ArrowRight, Network, Target } from 'lucide-react'

// The "all clear" success hue reuses the shared criticality token (low = green =
// good), so no hardcoded palette class is introduced for the safe state.
const SAFE_COLOR = CRITICALITY_CHART_COLORS.low

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
        <Link
          href="/assets"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium"
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
                    KEV or critical findings. Hover to trace a path; click any node to open that
                    asset&apos;s findings. Break the top chains first.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PathGraph
                    paths={paths}
                    empty={
                      <div className="flex h-48 flex-col items-center justify-center text-center">
                        <ShieldCheck className="mb-3 h-10 w-10" style={{ color: SAFE_COLOR }} />
                        <p className="font-medium" style={{ color: SAFE_COLOR }}>
                          No exposure chains found
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          No internet-facing entry point currently reaches an asset with KEV or
                          critical findings via tracked relationships.
                        </p>
                      </div>
                    }
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar explainer */}
            <div className="flex flex-col gap-6">
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">How Chains Are Built</CardTitle>
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
