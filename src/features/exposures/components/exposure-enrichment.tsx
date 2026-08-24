'use client'

/**
 * Exposure CTEM-enrichment surfacing (api #483).
 *
 * The API enriches every exposure at read time with the SAME CTEM signals it
 * attaches to findings — effective (business-aligned) criticality, attack-path
 * reachability, and EPSS / CISA-KEV threat intel — and returns them on the
 * ExposureResponse. This module renders those signals so the work is no longer
 * invisible in the UI. Two presentations share one data contract:
 *
 *   - <ExposureThreatPills>   compact inline pills for the list/table
 *   - <ExposureSecurityContext>  a "Security context" card for the detail sheet
 *
 * Every signal is optional: each is rendered ONLY when the API actually returns
 * it, so an exposure with no linked asset or no CVE simply shows fewer badges
 * rather than empty defaults. Colours come from semantic Badge variants and the
 * criticality single-source (`@/lib/criticality-colors`) — no hand-rolled
 * palette classes (palette-drift gate). Kept visually consistent with the
 * finding-side KEV / EPSS / reachability signals for a coherent UX.
 */

import { AlertOctagon, Globe, Route, ShieldAlert, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  CRITICALITY_BADGE_LIGHT,
  CRITICALITY_LABELS,
  type CriticalityLevel,
} from '@/lib/criticality-colors'
import type { ExposureEvent } from '@/lib/api/exposure-types'

/** Narrow the free-form API string to a known criticality key, or null. */
function asCriticalityLevel(value?: string): CriticalityLevel | null {
  if (value && value in CRITICALITY_BADGE_LIGHT) {
    return value as CriticalityLevel
  }
  return null
}

/** EPSS is a 0..1 probability; render as a percentage. */
function formatEpss(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}

/** True when the exposure carries at least one CTEM signal worth surfacing. */
export function hasExposureEnrichment(exposure: ExposureEvent): boolean {
  return (
    asCriticalityLevel(exposure.effective_criticality) !== null ||
    exposure.is_internet_accessible === true ||
    exposure.on_attack_path === true ||
    (typeof exposure.epss_score === 'number' && exposure.epss_score > 0) ||
    exposure.is_in_kev === true
  )
}

interface ExposureThreatPillsProps {
  exposure: ExposureEvent
  className?: string
}

/**
 * Compact inline pills for the exposure list. Renders KEV, EPSS, reachability
 * and effective-criticality — each only when present. Reachability collapses to
 * a single pill: the attack-path signal supersedes the plain internet-facing one
 * (a public→crown-jewel path already implies internet exposure), so the two do
 * not stack redundantly.
 */
export function ExposureThreatPills({ exposure, className }: ExposureThreatPillsProps) {
  const criticality = asCriticalityLevel(exposure.effective_criticality)
  const showEpss = typeof exposure.epss_score === 'number' && exposure.epss_score > 0
  const onAttackPath = exposure.on_attack_path === true
  const internetFacing = exposure.is_internet_accessible === true

  if (!hasExposureEnrichment(exposure)) {
    return null
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center gap-1', className)}>
        {exposure.is_in_kev && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="gap-0.5 px-1.5 py-0 text-[10px]">
                <AlertOctagon className="h-2.5 w-2.5" />
                KEV
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p className="font-semibold">CISA Known Exploited Vulnerability</p>
              {exposure.kev_due_date && (
                <p>Remediate by {new Date(exposure.kev_due_date).toLocaleDateString()}</p>
              )}
            </TooltipContent>
          </Tooltip>
        )}

        {showEpss && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px]">
                <TrendingUp className="h-2.5 w-2.5" />
                EPSS {formatEpss(exposure.epss_score as number)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Exploit Prediction Scoring System — estimated probability of exploitation in the next
              30 days
            </TooltipContent>
          </Tooltip>
        )}

        {onAttackPath ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-0.5 px-1.5 py-0 text-[10px]">
                <Route className="h-2.5 w-2.5" />
                Attack path
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              On a validated attack path from a public entry point to a KEV / crown-jewel asset
            </TooltipContent>
          </Tooltip>
        ) : (
          internetFacing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-0.5 px-1.5 py-0 text-[10px]">
                  <Globe className="h-2.5 w-2.5" />
                  Internet-facing
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                The linked asset is reachable from the public internet
              </TooltipContent>
            </Tooltip>
          )
        )}

        {criticality && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  'gap-0.5 px-1.5 py-0 text-[10px]',
                  CRITICALITY_BADGE_LIGHT[criticality]
                )}
              >
                <ShieldAlert className="h-2.5 w-2.5" />
                {CRITICALITY_LABELS[criticality]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Effective business criticality — MAX of the asset, its business unit, and the services
              it powers
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

interface ExposureSecurityContextProps {
  exposure: ExposureEvent
  className?: string
}

/**
 * "Security context" card for the exposure detail sheet — the expanded view of
 * the same signals the list shows as pills. Renders nothing when the exposure
 * carries no enrichment, so a plain exposure does not gain an empty section.
 */
export function ExposureSecurityContext({ exposure, className }: ExposureSecurityContextProps) {
  const criticality = asCriticalityLevel(exposure.effective_criticality)
  const showEpss = typeof exposure.epss_score === 'number' && exposure.epss_score > 0
  const showPercentile = typeof exposure.epss_percentile === 'number'
  const hasReachability =
    typeof exposure.is_internet_accessible === 'boolean' ||
    typeof exposure.on_attack_path === 'boolean'

  if (!hasExposureEnrichment(exposure)) {
    return null
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Security context</span>
      </div>
      <div className="divide-y">
        {criticality && (
          <Row label="Effective criticality">
            <Badge
              variant="outline"
              className={cn('px-1.5 py-0 text-xs', CRITICALITY_BADGE_LIGHT[criticality])}
            >
              {CRITICALITY_LABELS[criticality]}
            </Badge>
          </Row>
        )}

        {exposure.is_in_kev && (
          <Row label="CISA KEV">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="gap-0.5 px-1.5 py-0 text-xs">
                <AlertOctagon className="h-3 w-3" />
                Known exploited
              </Badge>
              {exposure.kev_due_date && (
                <span className="text-xs text-muted-foreground">
                  due {new Date(exposure.kev_due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </Row>
        )}

        {showEpss && (
          <Row label="EPSS">
            <span className="text-sm font-medium">
              {formatEpss(exposure.epss_score as number)}
              {showPercentile && (
                <span className="ms-1 font-normal text-muted-foreground">
                  ({((exposure.epss_percentile as number) * 100).toFixed(0)}th pct)
                </span>
              )}
            </span>
          </Row>
        )}

        {hasReachability && (
          <Row label="Reachability">
            <div className="flex flex-wrap items-center gap-1.5">
              {exposure.on_attack_path === true && (
                <Badge variant="outline" className="gap-0.5 px-1.5 py-0 text-xs">
                  <Route className="h-3 w-3" />
                  On attack path
                </Badge>
              )}
              {exposure.is_internet_accessible === true && (
                <Badge variant="outline" className="gap-0.5 px-1.5 py-0 text-xs">
                  <Globe className="h-3 w-3" />
                  Internet-facing
                </Badge>
              )}
              {exposure.on_attack_path !== true && exposure.is_internet_accessible !== true && (
                <span className="text-sm text-muted-foreground">Not internet-reachable</span>
              )}
            </div>
          </Row>
        )}

        {exposure.cve_id && (
          <Row label="CVE">
            <span className="font-mono text-xs">{exposure.cve_id}</span>
          </Row>
        )}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
