'use client'

import { createElement } from 'react'
import Link from 'next/link'
import { Main } from '@/components/layout'
import { PageHeader, StatsCard } from '@/features/shared'
import { useAttackPathScoring } from '@/features/attack-surface'
import type { AttackPathScore } from '@/features/attack-surface'
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
  AlertTriangle,
  Activity,
  Shield,
  Crown,
  ArrowRight,
  GitBranch,
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

function getExposureClass(exposure: string) {
  switch (exposure) {
    case 'public':
      return 'bg-red-500/10 text-red-500 border-red-500/20'
    case 'restricted':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    case 'internal':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'private':
      return 'bg-green-500/10 text-green-500 border-green-500/20'
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
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ============================================================
// Asset row in the ranked table
// ============================================================

interface AssetRowProps {
  asset: AttackPathScore
  rank: number
  maxPathScore: number
}

function AssetRow({ asset, rank, maxPathScore }: AssetRowProps) {
  const assetIcon = getAssetTypeIcon(asset.assetType)
  const progressPct = maxPathScore > 0 ? Math.round((asset.pathScore / maxPathScore) * 100) : 0

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30">
      {/* Rank badge */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
        {rank}
      </div>

      {/* Asset info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {createElement(assetIcon, { className: 'h-4 w-4 shrink-0 text-muted-foreground' })}
          <span className="truncate font-medium">{asset.name}</span>

          {asset.isCrownJewel && (
            <Crown className="h-4 w-4 shrink-0 text-yellow-500" aria-label="Crown jewel" />
          )}
          {asset.isProtected && (
            <Shield className="h-4 w-4 shrink-0 text-green-500" aria-label="Protected" />
          )}

          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs', getCriticalityClass(asset.criticality))}
          >
            {capitalize(asset.criticality)}
          </Badge>
          <Badge
            variant="outline"
            className={cn('shrink-0 text-xs', getExposureClass(asset.exposure))}
          >
            {capitalize(asset.exposure)}
          </Badge>
          {asset.isEntryPoint && (
            <Badge
              variant="outline"
              className="shrink-0 border-red-400/30 bg-red-500/10 text-xs text-red-400"
            >
              Entry Point
            </Badge>
          )}
        </div>

        <div className="mb-2 text-xs text-muted-foreground">
          {capitalize(asset.assetType)}
          {asset.findingCount > 0 && (
            <span className="ml-3 text-orange-500">
              {asset.findingCount} open finding{asset.findingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Path score bar */}
        <div className="flex items-center gap-3">
          <Progress value={progressPct} className="h-1.5 flex-1" />
          <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
            score {asset.pathScore.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Reachable from counter */}
      <div className="flex shrink-0 flex-col items-center text-center">
        <span className="text-2xl font-bold tabular-nums leading-none">{asset.reachableFrom}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">
          {asset.reachableFrom === 1 ? 'entry point' : 'entry points'}
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
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <GitBranch className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">No relationship data yet</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Attack path scoring requires asset relationships. Add relationships between your assets to
          see which internal assets are reachable from internet-facing entry points.
        </p>
        <Link
          href="/assets"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go to Assets
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Page
// ============================================================

export default function AttackPathAnalysisPage() {
  const { scoring, isLoading } = useAttackPathScoring()

  const summary = scoring?.summary
  const topAssets = scoring?.topAssets ?? []

  // Assets with actual path exposure (reachable from at least one entry point, not entry points themselves)
  const riskRanked = topAssets.filter((a) => !a.isEntryPoint && a.reachableFrom > 0)
  const maxPathScore = riskRanked.length > 0 ? riskRanked[0].pathScore : 1

  // Entry points (public assets that are sources)
  const entryPointAssets = topAssets.filter((a) => a.isEntryPoint).slice(0, 10)

  const hasData = summary?.hasRelationshipData === true

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

          {/* Main content: ranked table + entry points sidebar */}
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
                    Score = reachable entry points x risk score x criticality weight. Fixing the
                    top-ranked assets breaks the most attack paths.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {riskRanked.length > 0 ? (
                    <div className="space-y-3">
                      {riskRanked.slice(0, 20).map((asset, idx) => (
                        <AssetRow
                          key={asset.assetId}
                          asset={asset}
                          rank={idx + 1}
                          maxPathScore={maxPathScore}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center text-center">
                      <Shield className="mb-3 h-10 w-10 text-green-500" />
                      <p className="font-medium text-green-500">No reachable internal assets</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your entry points don&apos;t currently reach any internal assets via tracked
                        relationships.
                      </p>
                    </div>
                  )}
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
                    <span className="text-sm text-muted-foreground">Max chain depth</span>
                    <span className="font-bold">{summary?.maxDepth ?? 0} hops</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Crown jewels at risk</span>
                    <span
                      className={cn(
                        'font-bold',
                        (summary?.crownJewelsAtRisk ?? 0) > 0 ? 'text-red-500' : 'text-green-500'
                      )}
                    >
                      {summary?.crownJewelsAtRisk ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Critical/high reachable</span>
                    <span
                      className={cn(
                        'font-bold',
                        (summary?.criticalReachable ?? 0) > 0 ? 'text-orange-500' : 'text-green-500'
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
                      {entryPointAssets.map((ep) => {
                        const Icon = getAssetTypeIcon(ep.assetType)
                        return (
                          <div
                            key={ep.assetId}
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">{ep.name}</span>
                            {ep.findingCount > 0 && (
                              <span className="shrink-0 text-xs text-orange-500">
                                {ep.findingCount}F
                              </span>
                            )}
                          </div>
                        )
                      })}
                      {(summary?.entryPoints ?? 0) > entryPointAssets.length && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          + {(summary?.entryPoints ?? 0) - entryPointAssets.length} more entry
                          points
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
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
                <CardContent className="space-y-2 text-xs text-muted-foreground">
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
