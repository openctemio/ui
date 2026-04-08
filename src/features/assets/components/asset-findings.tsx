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

import type { AssetFinding } from '../types/asset.types'
import { useAssetFindingsApi } from '@/features/findings/api/use-findings-api'
import type { ApiFinding } from '@/features/findings/api/finding-api.types'

interface AssetFindingsProps {
  assetId: string
  assetName?: string
  className?: string
}

const severityConfig: Record<
  AssetFinding['severity'],
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: AlertCircle,
  },
  high: {
    label: 'High',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: AlertTriangle,
  },
  low: {
    label: 'Low',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: Info,
  },
  info: {
    label: 'Info',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: Info,
  },
}

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
  in_progress: { label: 'In Progress', variant: 'default' },
  resolved: { label: 'Resolved', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'outline' },
  false_positive: { label: 'False Positive', variant: 'outline' },
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
            <div key={i} className="p-4 rounded-lg border bg-card">
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
      <div className={cn('flex flex-col items-center justify-center py-8 text-center', className)}>
        <Shield className="h-12 w-12 text-green-500 mb-3" />
        <h3 className="font-medium">No Findings</h3>
        <p className="text-sm text-muted-foreground mt-1">This asset has no security findings.</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Severity Summary */}
      <div className="flex flex-wrap gap-2">
        {severityCounts.critical > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            {severityCounts.critical} Critical
          </div>
        )}
        {severityCounts.high > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {severityCounts.high} High
          </div>
        )}
        {severityCounts.medium > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900 text-sm font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {severityCounts.medium} Medium
          </div>
        )}
        {severityCounts.low > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            <Info className="h-3.5 w-3.5" />
            {severityCounts.low} Low
          </div>
        )}
      </div>

      <Separator />

      {/* Findings List
          Renders inline (no fixed-height ScrollArea wrapper). The parent
          SheetContent already has overflow-y-auto, so the whole sheet
          scrolls as one — that prevents the previous bug where a fixed
          h-[400px] ScrollArea created dead empty space below the list
          when there were only a few findings, AND prevented nested
          scroll containers when there were many. */}
      <div>
        <div className="space-y-3">
          {findings.map((finding) => {
            const severity = severityConfig[finding.severity]
            const type = typeConfig[finding.type]
            const status = statusConfig[finding.status]
            const SeverityIcon = severity.icon
            const TypeIcon = type.icon

            return (
              <div
                key={finding.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', severity.bgColor)}>
                    <SeverityIcon className={cn('h-4 w-4', severity.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{finding.title}</h4>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {finding.description}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TypeIcon className="h-3 w-3" />
                        <span>{type.label}</span>
                      </div>
                      {finding.cveId && (
                        <span className="font-mono text-red-600">{finding.cveId}</span>
                      )}
                      {finding.cvssScore && (
                        <span className="font-medium">CVSS: {finding.cvssScore}</span>
                      )}
                      {finding.rule && <span className="font-mono">{finding.rule}</span>}
                      <span>First seen: {new Date(finding.firstSeen).toLocaleDateString()}</span>
                    </div>

                    {/* Remediation Preview */}
                    {finding.remediation && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                        <span className="font-medium">Remediation: </span>
                        <span className="text-muted-foreground">{finding.remediation}</span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <Link href={`/findings/${finding.id}`}>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* View All Link */}
      <div className="pt-2 border-t">
        <Link href={`/findings?assetId=${assetId}`}>
          <Button variant="outline" className="w-full">
            <FileWarning className="mr-2 h-4 w-4" />
            View All Findings ({response?.total ?? findings.length})
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
