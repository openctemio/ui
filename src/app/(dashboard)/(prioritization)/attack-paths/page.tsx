'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { useAttackPathScoring, PathGraph } from '@/features/attack-surface'
import type { AttackPathScore, PathGraphPath } from '@/features/attack-surface'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Route,
  ShieldAlert,
  ShieldCheck,
  Globe,
  AlertTriangle,
  ArrowRight,
  GitBranch,
} from 'lucide-react'

// ============================================================
// Map a scored asset onto the generic path-graph model. Attack-path
// scoring is a reachability fan-out (public entry points → asset), so
// each row renders as a two-node path: the internet-facing source and
// the reachable asset, with the entry-point count on the counter.
// ============================================================

function assetToPath(asset: AttackPathScore, maxPathScore: number): PathGraphPath {
  return {
    id: asset.assetId,
    nodes: [
      {
        id: '',
        name: 'Internet-facing entry points',
        assetType: 'internet',
        role: 'entry',
        exposure: 'public',
      },
      {
        id: asset.assetId,
        name: asset.name,
        assetType: asset.assetType,
        role: 'target',
        exposure: asset.exposure,
        criticality: asset.criticality,
        isCrownJewel: asset.isCrownJewel,
        findingCount: asset.findingCount,
        href: asset.assetId ? `/findings?assetId=${asset.assetId}` : undefined,
      },
    ],
    score: asset.pathScore,
    scorePct: maxPathScore > 0 ? (asset.pathScore / maxPathScore) * 100 : 0,
    reachableFrom: asset.reachableFrom,
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
              <Skeleton key={i} className="h-28 w-full" />
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
      icon={GitBranch}
      title="No relationship data yet"
      description="Attack path scoring requires asset relationships. Add relationships between your assets to see which internal assets are reachable from internet-facing entry points."
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

export default function AttackPathAnalysisPage() {
  const { scoring, isLoading } = useAttackPathScoring()

  const summary = scoring?.summary
  const topAssets = useMemo(() => scoring?.topAssets ?? [], [scoring])
  const hasData = summary?.hasRelationshipData === true

  // Assets with actual path exposure (reachable from ≥1 entry point, excluding
  // the entry points themselves).
  const riskRanked = useMemo(
    () => topAssets.filter((a) => !a.isEntryPoint && a.reachableFrom > 0),
    [topAssets]
  )

  const paths = useMemo(() => {
    const maxPathScore = riskRanked.length > 0 ? riskRanked[0].pathScore : 1
    return riskRanked.slice(0, 20).map((asset, idx) => ({
      ...assetToPath(asset, maxPathScore),
      rank: idx + 1,
    }))
  }, [riskRanked])

  // Entry points (public assets that are sources).
  const entryPointAssets = useMemo(
    () => topAssets.filter((a) => a.isEntryPoint).slice(0, 10),
    [topAssets]
  )

  return (
    <Main>
      <PageHeader
        title="Attack paths"
        description="Assets ranked by how many public entry points reach them — fix the top ones to break the most paths."
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <NoRelationshipData />
      ) : (
        <>
          {/* Stats Row */}
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Attack paths"
              value={summary?.totalPaths ?? 0}
              icon={Route}
              description="Entry-point to asset pairs"
            />
            <StatsCard
              title="Entry points"
              value={summary?.entryPoints ?? 0}
              icon={Globe}
              description="Internet-facing assets"
            />
            <StatsCard
              title="Reachable assets"
              value={summary?.reachableAssets ?? 0}
              icon={AlertTriangle}
              description="Internal assets at risk"
            />
            <StatsCard
              title="Critical reachable"
              value={summary?.criticalReachable ?? 0}
              valueClassName={
                (summary?.criticalReachable ?? 0) > 0 ? 'text-destructive' : undefined
              }
              icon={ShieldAlert}
              description="High/critical assets exposed"
            />
          </section>

          {/* Main content: ranked path graph + entry points sidebar */}
          <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Ranked assets */}
            {/* The ranked list is a column of bordered chain rows, so it sits under a
                section heading rather than inside another card. */}
            <section className="space-y-3 lg:col-span-2">
              <div>
                <h2 className="text-base font-semibold">Assets ranked by attack-path score</h2>
                <p className="text-sm text-muted-foreground">
                  Score = reachable entry points x risk score x criticality weight. Hover to trace a
                  path; click a node to open the asset&apos;s findings. Fixing the top-ranked assets
                  breaks the most attack paths.
                </p>
              </div>
              <PathGraph
                paths={paths}
                empty={
                  <EmptyState
                    icon={ShieldCheck}
                    title="No reachable internal assets"
                    description="Your entry points do not reach any internal asset through tracked relationships."
                  />
                }
              />
            </section>

            {/* Sidebar: entry points + extra stats */}
            <div className="flex flex-col gap-5">
              {/* Chain depth info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Path depth</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Max chain depth</span>
                    <span className="font-semibold tabular-nums">
                      {summary?.maxDepth ?? 0} hops
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Crown jewels at risk</span>
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        (summary?.crownJewelsAtRisk ?? 0) > 0
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {summary?.crownJewelsAtRisk ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Top entry points */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Top entry points</CardTitle>
                  <CardDescription className="text-xs">
                    Public assets an attacker can reach directly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {entryPointAssets.length > 0 ? (
                    <div className="space-y-2">
                      {entryPointAssets.map((ep) =>
                        ep.assetId ? (
                          <Link
                            key={ep.assetId}
                            href={`/findings?assetId=${ep.assetId}`}
                            aria-label={`View findings for ${ep.name}`}
                            className="hover:bg-muted/50 focus-visible:ring-ring flex items-center gap-2 rounded-md px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{ep.name}</span>
                            {ep.findingCount > 0 && (
                              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                {ep.findingCount} {ep.findingCount === 1 ? 'finding' : 'findings'}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <div
                            key={ep.name}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                          >
                            <Globe className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{ep.name}</span>
                            {ep.findingCount > 0 && (
                              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                {ep.findingCount} {ep.findingCount === 1 ? 'finding' : 'findings'}
                              </span>
                            )}
                          </div>
                        )
                      )}
                      {(summary?.entryPoints ?? 0) > entryPointAssets.length && (
                        <p className="text-muted-foreground mt-2 text-xs">
                          + {(summary?.entryPoints ?? 0) - entryPointAssets.length} more entry
                          points
                        </p>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      card={false}
                      icon={Globe}
                      title="No entry points"
                      description="No asset is marked as publicly exposed."
                      className="py-6"
                    />
                  )}
                </CardContent>
              </Card>

              {/* How it works */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">How scoring works</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-2 text-xs">
                  <p>
                    <strong className="text-foreground">Reachable from</strong> — BFS traversal from
                    every public asset following attack-path relationship types (runs_on,
                    depends_on, exposes, stores_data_in, etc.)
                  </p>
                  <p>
                    <strong className="text-foreground">Path score</strong> — reachable entry points
                    multiplied by the asset&apos;s risk score and criticality weight (critical=4x,
                    high=3x, medium=2x, low=1x), boosted by open findings.
                  </p>
                  <p>
                    Patching or isolating the top-ranked asset breaks the most attack paths in your
                    environment.
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
