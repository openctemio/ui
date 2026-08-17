'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard, EmptyState } from '@/features/shared'
import { useAttackPathScoring, PathGraph } from '@/features/attack-surface'
import type { AttackPathScore, PathGraphPath } from '@/features/attack-surface'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CRITICALITY_CHART_COLORS } from '@/lib/criticality-colors'
import {
  Route,
  ShieldAlert,
  ShieldCheck,
  Globe,
  AlertTriangle,
  Activity,
  ArrowRight,
  GitBranch,
} from 'lucide-react'

// The "all clear" success hue reuses the shared criticality token (low = green =
// good), so no hardcoded palette class is introduced for the safe state.
const SAFE_COLOR = CRITICALITY_CHART_COLORS.low

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
        title="Attack Path Analysis"
        description="Ranked assets by reachability from public entry points — focus remediation where it breaks the most attack paths"
        className="mb-6"
      />

      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasData ? (
        <NoRelationshipData />
      ) : (
        <>
          {/* Stats Row */}
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatsCard
              title="Total Attack Paths"
              value={summary?.totalPaths ?? 0}
              icon={Route}
              description="Entry-point to asset pairs"
              changeType={summary && summary.totalPaths > 0 ? 'negative' : 'positive'}
            />
            <StatsCard
              title="Entry Points"
              value={summary?.entryPoints ?? 0}
              icon={Globe}
              description="Internet-facing assets"
              changeType={summary && summary.entryPoints > 0 ? 'negative' : 'positive'}
            />
            <StatsCard
              title="Reachable Assets"
              value={summary?.reachableAssets ?? 0}
              icon={AlertTriangle}
              description="Internal assets at risk"
              changeType={summary && summary.reachableAssets > 0 ? 'negative' : 'positive'}
            />
            <StatsCard
              title="Critical Reachable"
              value={summary?.criticalReachable ?? 0}
              icon={ShieldAlert}
              description="High/critical assets exposed"
              changeType={summary && summary.criticalReachable > 0 ? 'negative' : 'positive'}
            />
          </section>

          {/* Main content: ranked path graph + entry points sidebar */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Ranked assets */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Assets Ranked by Attack Path Score
                  </CardTitle>
                  <CardDescription>
                    Score = reachable entry points x risk score x criticality weight. Hover to trace
                    a path; click a node to open the asset&apos;s findings. Fixing the top-ranked
                    assets breaks the most attack paths.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PathGraph
                    paths={paths}
                    empty={
                      <div className="flex h-48 flex-col items-center justify-center text-center">
                        <ShieldCheck className="mb-3 h-10 w-10" style={{ color: SAFE_COLOR }} />
                        <p className="font-medium" style={{ color: SAFE_COLOR }}>
                          No reachable internal assets
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Your entry points don&apos;t currently reach any internal assets via
                          tracked relationships.
                        </p>
                      </div>
                    }
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: entry points + extra stats */}
            <div className="flex flex-col gap-6">
              {/* Chain depth info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Path Depth</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Max chain depth</span>
                    <span className="font-bold">{summary?.maxDepth ?? 0} hops</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Crown jewels at risk</span>
                    <span
                      className={cn(
                        'font-bold',
                        (summary?.crownJewelsAtRisk ?? 0) > 0
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {summary?.crownJewelsAtRisk ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Critical/high reachable</span>
                    <span
                      className={cn(
                        'font-bold',
                        (summary?.criticalReachable ?? 0) > 0
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      {summary?.criticalReachable ?? 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Top entry points */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4" />
                    Top Entry Points
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Public assets that attackers can reach directly
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
                              <span className="text-muted-foreground shrink-0 text-xs">
                                {ep.findingCount}F
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
                              <span className="text-muted-foreground shrink-0 text-xs">
                                {ep.findingCount}F
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
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No public entry points found
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* How it works */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">How Scoring Works</CardTitle>
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
