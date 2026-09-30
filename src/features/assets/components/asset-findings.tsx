'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Info,
  KeyRound,
  Settings2,
  Shield,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/features/shared'
import { SEVERITY_BADGE_SOFT, SEVERITY_TEXT_COLORS } from '@/lib/severity-colors'

import type { AssetFinding } from '../types/asset.types'
import { useAssetFindingsApi } from '@/features/findings/api/use-findings-api'
import type { ApiFinding } from '@/features/findings/api/finding-api.types'

interface AssetFindingsProps {
  assetId: string
  assetName?: string
  className?: string
}

// Colours come from the shared severity source (dark-mode aware).
const severityConfig: Record<AssetFinding['severity'], { label: string; icon: React.ElementType }> =
  {
    critical: { label: 'Critical', icon: AlertCircle },
    high: { label: 'High', icon: AlertTriangle },
    medium: { label: 'Medium', icon: AlertTriangle },
    low: { label: 'Low', icon: Info },
    info: { label: 'Info', icon: Info },
  }

const SUMMARY_LEVELS = ['critical', 'high', 'medium', 'low'] as const

const typeConfig: Record<AssetFinding['type'], { label: string; icon: React.ElementType }> = {
  vulnerability: { label: 'Vulnerability', icon: Bug },
  misconfiguration: { label: 'Misconfiguration', icon: Settings2 },
  exposure: { label: 'Exposure', icon: ExternalLink },
  secret: { label: 'Secret', icon: KeyRound },
  compliance: { label: 'Compliance', icon: Shield },
}

const statusConfig: Record<
  AssetFinding['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  open: { label: 'Open', variant: 'destructive' },
  in_progress: { label: 'In progress', variant: 'default' },
  resolved: { label: 'Resolved', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'outline' },
  false_positive: { label: 'False positive', variant: 'outline' },
}

/**
 * Map API finding to the AssetFinding shape used by this component.
 */
function mapApiFinding(f: ApiFinding): AssetFinding {
  // Map API finding_type/source to the component's FindingType
  const typeMap: Record<string, AssetFinding['type']> = {
    vulnerability: 'vulnerability',
    misconfiguration: 'misconfiguration',
    secret: 'secret',
    compliance: 'compliance',
  }
  const findingType: AssetFinding['type'] =
    (f.finding_type && typeMap[f.finding_type]) || 'vulnerability'

  // Map API status to the component's FindingStatus
  const statusMap: Record<string, AssetFinding['status']> = {
    new: 'open',
    confirmed: 'open',
    in_progress: 'in_progress',
    resolved: 'resolved',
    false_positive: 'false_positive',
    accepted: 'accepted',
    duplicate: 'resolved',
    draft: 'open',
    in_review: 'in_progress',
    remediation: 'in_progress',
    retest: 'in_progress',
    verified: 'resolved',
    accepted_risk: 'accepted',
  }
  const status: AssetFinding['status'] = statusMap[f.status] || 'open'

  // Map severity, filtering 'none' to 'info'
  const severity: AssetFinding['severity'] =
    f.severity === 'none' ? 'info' : (f.severity as AssetFinding['severity'])

  return {
    id: f.id,
    type: findingType,
    severity,
    status,
    title: f.title || f.message,
    description: f.description || f.message,
    assetId: f.asset_id,
    assetName: f.asset?.name || '',
    assetType: (f.asset?.type as AssetFinding['assetType']) || 'host',
    cveId: f.cve_id,
    cvssScore: f.cvss_score,
    cweId: f.cwe_ids?.[0],
    rule: f.rule_id || f.rule_name,
    remediation: f.remediation?.recommendation || f.recommendation,
    references: f.remediation?.references,
    firstSeen: f.first_detected_at || f.created_at,
    lastSeen: f.last_seen_at || f.updated_at,
    resolvedAt: f.resolved_at,
  }
}

export function AssetFindings({ assetId, className }: AssetFindingsProps) {
  const { data: response, isLoading, error } = useAssetFindingsApi(assetId, undefined, 1, 50)

  const findings = React.useMemo<AssetFinding[]>(() => {
    if (!response?.data) return []
    return response.data.map(mapApiFinding)
  }, [response])

  const severityCounts = React.useMemo(() => {
    return {
      critical: findings.filter((f) => f.severity === 'critical').length,
      high: findings.filter((f) => f.severity === 'high').length,
      medium: findings.filter((f) => f.severity === 'medium').length,
      low: findings.filter((f) => f.severity === 'low').length,
      info: findings.filter((f) => f.severity === 'info').length,
    }
  }, [findings])

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-22 rounded-full" />
        </div>
        <Separator />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="py-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <AlertCircle className="h-12 w-12 text-destructive mb-3" />
        <h3 className="font-medium">Failed to load findings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Could not fetch findings for this asset. Please try again later.
        </p>
      </div>
    )
  }

  if (findings.length === 0) {
    return (
      <EmptyState
        card={false}
        icon={Shield}
        title="No findings"
        description="This asset has no security findings."
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Severity summary */}
      <div className="flex flex-wrap gap-2">
        {SUMMARY_LEVELS.filter((level) => severityCounts[level] > 0).map((level) => {
          const Icon = severityConfig[level].icon
          return (
            <Badge
              key={level}
              variant="outline"
              className={cn('gap-1.5 font-medium tabular-nums', SEVERITY_BADGE_SOFT[level])}
            >
              <Icon className="h-3.5 w-3.5" />
              {severityCounts[level]} {severityConfig[level].label}
            </Badge>
          )
        })}
      </div>

      {/* Findings list — flat rows separated by dividers (no card per row).
          The sheet's tab body is the scroll container. */}
      <ul className="divide-y border-y">
        {findings.map((finding) => {
          const severity = severityConfig[finding.severity]
          const type = typeConfig[finding.type]
          const status = statusConfig[finding.status]
          const SeverityIcon = severity.icon
          const TypeIcon = type.icon

          return (
            <li key={finding.id}>
              <Link
                href={`/findings/${finding.id}`}
                className="focus-visible:ring-ring flex items-start gap-3 py-3 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:outline-none"
              >
                <SeverityIcon
                  className={cn('mt-0.5 h-4 w-4 shrink-0', SEVERITY_TEXT_COLORS[finding.severity])}
                  aria-label={severity.label}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-medium break-words">{finding.title}</h4>
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </div>
                  {finding.description && finding.description !== finding.title && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {finding.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TypeIcon className="h-3 w-3" />
                      {type.label}
                    </span>
                    {finding.cveId && <span className="font-mono">{finding.cveId}</span>}
                    {finding.cvssScore && <span>CVSS {finding.cvssScore}</span>}
                    {finding.rule && <span className="font-mono break-all">{finding.rule}</span>}
                    <span>First seen {new Date(finding.firstSeen).toLocaleDateString()}</span>
                  </div>

                  {/* Remediation preview */}
                  {finding.remediation && (
                    <p className="mt-2 line-clamp-2 rounded bg-muted/50 p-2 text-xs">
                      <span className="font-medium">Remediation: </span>
                      <span className="text-muted-foreground">{finding.remediation}</span>
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          )
        })}
      </ul>

      {/* View All Link */}
      <div>
        <Link href={`/findings?assetId=${assetId}`}>
          <Button variant="outline" className="w-full">
            <FileWarning className="me-2 h-4 w-4" />
            View all findings ({response?.total ?? findings.length})
            <ChevronRight className="ms-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
