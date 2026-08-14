'use client'

import { createElement, Fragment } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CRITICALITY_BADGE_SOFT,
  CRITICALITY_TEXT_COLORS,
  CRITICALITY_CHART_COLORS,
  CRITICALITY_LABELS,
  type CriticalityLevel,
} from '@/lib/criticality-colors'
import { SEVERITY_BADGE_SOFT, SEVERITY_CHART_COLORS } from '@/lib/severity-colors'
import {
  Globe,
  Server,
  GitBranch,
  Crown,
  Target,
  ArrowRight,
  AlertOctagon,
  Flame,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ============================================================
// Types — a generic ordered attack path both prioritization
// views can feed. Exposure chains map their hops onto it; the
// attack-path scoring view maps a public-source → asset pair.
// ============================================================

export type PathNodeRole = 'entry' | 'hop' | 'target'

export interface PathGraphNode {
  /** Asset id — drives the drill-down link. Empty string ⇒ non-clickable. */
  id: string
  name: string
  assetType: string
  role: PathNodeRole
  exposure?: string
  /** Business criticality (target nodes) — tints border/badge. */
  criticality?: string
  isCrownJewel?: boolean
  /** This node carries an open KEV finding. */
  kev?: boolean
  findingCount?: number
  /** Where a click lands. Defaults to the findings list filtered to this asset. */
  href?: string
}

export interface PathGraphPath {
  id: string
  rank?: number
  nodes: PathGraphNode[]
  /** Raw urgency score (shown next to the bar). */
  score?: number
  /** 0–100 fill for the relative score bar. */
  scorePct?: number
  kevCount?: number
  criticalCount?: number
  /** How many entry points reach the target (right-hand counter). */
  reachableFrom?: number
}

// ============================================================
// Helpers
// ============================================================

function normalizeCriticality(value?: string): CriticalityLevel | undefined {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value
  }
  return undefined
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

function assetTypeIcon(assetType: string): LucideIcon {
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

/**
 * Accent hue for a node's border. Pulled from the shared chart-colour tokens so
 * the palette-drift gate stays green (these are the app's canonical hues, not
 * ad-hoc literals) and light/dark both read the same accent.
 */
function nodeAccent(node: PathGraphNode): string | undefined {
  if (node.role === 'entry') return SEVERITY_CHART_COLORS.critical // internet-facing ⇒ danger
  if (node.role === 'target') {
    const crit = normalizeCriticality(node.criticality)
    return crit ? CRITICALITY_CHART_COLORS[crit] : undefined
  }
  return undefined // hop ⇒ neutral border from the token layer
}

// ============================================================
// Single node card
// ============================================================

function PathNode({ node }: { node: PathGraphNode }) {
  const isEntry = node.role === 'entry'
  const isTarget = node.role === 'target'
  const iconCmp = isEntry ? Globe : assetTypeIcon(node.assetType)
  const crit = normalizeCriticality(node.criticality)
  const accent = nodeAccent(node)

  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        {createElement(iconCmp, {
          className: cn(
            'h-4 w-4 shrink-0',
            isEntry && 'text-destructive',
            isTarget && crit ? CRITICALITY_TEXT_COLORS[crit] : !isEntry && 'text-muted-foreground'
          ),
          'aria-hidden': true,
        })}
        <span className="max-w-[9rem] truncate text-xs font-medium">{node.name}</span>
        {node.isCrownJewel && (
          <Crown
            className="h-3.5 w-3.5 shrink-0"
            // Crown-jewel marker keeps its own amber hue, distinct from the
            // criticality scale. Sourced from a shared token, not a literal.
            style={{ color: CRITICALITY_CHART_COLORS.medium }}
            aria-label="Crown jewel"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {isEntry && (
          <Badge
            variant="outline"
            className="border-destructive/30 bg-destructive/10 text-destructive gap-1 px-1.5 py-0 text-[10px]"
          >
            <Globe className="h-2.5 w-2.5" aria-hidden />
            Entry
          </Badge>
        )}
        {isTarget && (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
            <Target className="h-2.5 w-2.5" aria-hidden />
            Target
          </span>
        )}
        {isTarget && crit && (
          <Badge
            variant="outline"
            className={cn('px-1.5 py-0 text-[10px]', CRITICALITY_BADGE_SOFT[crit])}
          >
            {CRITICALITY_LABELS[crit]}
          </Badge>
        )}
        {node.exposure && !isEntry && (
          <span className="text-muted-foreground text-[10px]">{capitalize(node.exposure)}</span>
        )}
        {node.kev && (
          <Badge
            variant="outline"
            className={cn('gap-0.5 px-1.5 py-0 text-[10px]', SEVERITY_BADGE_SOFT.critical)}
          >
            <AlertOctagon className="h-2.5 w-2.5" aria-hidden />
            KEV
          </Badge>
        )}
        {node.findingCount != null && node.findingCount > 0 && (
          <span className="text-muted-foreground text-[10px]">
            {node.findingCount} finding{node.findingCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </>
  )

  const baseClass =
    'flex min-w-[9rem] flex-col gap-1 rounded-lg border-2 bg-card px-2.5 py-2 transition-shadow'
  // Border colour is set inline from a shared token so no palette class is added.
  const style = accent ? { borderColor: accent } : undefined

  if (node.href && node.id) {
    return (
      <Link
        href={node.href}
        aria-label={`${node.name} — ${capitalize(node.assetType)}. View findings for this asset.`}
        title={`${node.name} (${capitalize(node.assetType)}) — view findings`}
        style={style}
        className={cn(
          baseClass,
          'hover:ring-ring/60 focus-visible:ring-ring hover:shadow-sm hover:ring-1 focus-visible:ring-2 focus-visible:outline-none'
        )}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className={baseClass} style={style}>
      {inner}
    </div>
  )
}

// ============================================================
// Connector between two nodes — vertical on mobile, horizontal
// on wider screens. Turns danger-hued when a KEV sits on the path.
// ============================================================

function Connector({ kevOnPath }: { kevOnPath: boolean }) {
  return (
    <div className="flex items-center justify-center px-1 py-0.5 sm:py-0" aria-hidden>
      <ArrowRight
        className={cn(
          'h-4 w-4 rotate-90 transition-colors sm:rotate-0 rtl:sm:rotate-180',
          kevOnPath ? 'text-destructive' : 'text-muted-foreground group-hover:text-primary'
        )}
      />
    </div>
  )
}

// ============================================================
// One path row
// ============================================================

function PathRow({ path }: { path: PathGraphPath }) {
  const kevOnPath = (path.kevCount ?? 0) > 0
  const scorePct = Math.max(0, Math.min(100, path.scorePct ?? 0))

  return (
    <div className="group hover:bg-muted/30 flex flex-col gap-3 rounded-lg border p-4 transition-colors">
      {/* Header: rank + path-level badges + reachable counter */}
      <div className="flex items-center gap-3">
        {path.rank != null && (
          <div className="bg-muted text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold">
            {path.rank}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {kevOnPath && (
            <Badge variant="outline" className={cn('gap-1', SEVERITY_BADGE_SOFT.critical)}>
              <AlertOctagon className="h-3 w-3" aria-hidden />
              {path.kevCount} KEV
            </Badge>
          )}
          {(path.criticalCount ?? 0) > 0 && (
            <Badge variant="outline" className={cn('gap-1', SEVERITY_BADGE_SOFT.high)}>
              <Flame className="h-3 w-3" aria-hidden />
              {path.criticalCount} critical
            </Badge>
          )}
        </div>

        {path.reachableFrom != null && (
          <div className="flex shrink-0 flex-col items-center text-center">
            <span className="text-xl leading-none font-bold tabular-nums">
              {path.reachableFrom}
            </span>
            <span className="text-muted-foreground mt-0.5 text-[10px]">
              {path.reachableFrom === 1 ? 'entry point' : 'entry points'}
            </span>
          </div>
        )}
      </div>

      {/* The node chain — stacks vertically on mobile, flows left→right on sm+ */}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-0">
        {path.nodes.map((node, idx) => (
          <Fragment key={`${node.id || node.name}-${idx}`}>
            <PathNode node={node} />
            {idx < path.nodes.length - 1 && <Connector kevOnPath={kevOnPath} />}
          </Fragment>
        ))}
      </div>

      {/* Relative score bar */}
      {path.score != null && (
        <div className="flex items-center gap-3">
          <Progress value={scorePct} className="h-1.5 flex-1" />
          <span className="text-muted-foreground w-20 shrink-0 text-end text-xs">
            score {path.score.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Public component — the interactive path graph
// ============================================================

interface PathGraphProps {
  paths: PathGraphPath[]
  /** Optional empty slot when `paths` is []. */
  empty?: React.ReactNode
  className?: string
}

/**
 * Dependency-free interactive attack-path visualisation shared by the
 * Exposure Chains and Attack Path Analysis views.
 *
 * Each path renders as an ordered chain of nodes (entry → hops → target)
 * connected by directional links. Hovering a row highlights the whole path;
 * every node is a keyboard-reachable drill-down into that asset's findings.
 * KEV-on-path and target criticality are encoded through the shared severity
 * and criticality tokens (never hardcoded palette classes), so light and dark
 * both stay on-theme. Wide chains scroll inside their own container on desktop
 * and fold into a vertical stack on mobile.
 */
export function PathGraph({ paths, empty, className }: PathGraphProps) {
  if (paths.length === 0) {
    return empty ? <>{empty}</> : null
  }

  return (
    <div className={cn('space-y-3', className)}>
      {paths.map((path) => (
        // overflow-x-auto keeps an unusually long chain scrollable on desktop
        // instead of forcing the whole page to scroll sideways.
        <div key={path.id} className="overflow-x-auto">
          <PathRow path={path} />
        </div>
      ))}
    </div>
  )
}
