'use client'

import { Badge } from '@/components/ui/badge'
import { Package, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FindingDetail } from '../../../types'

interface DependencyPanelProps {
  finding: FindingDetail
}

/**
 * DependencyPanel — the source-specific summary shown above the tabs for SCA
 * findings. Deliberately a single, width-filling strip (label on the left,
 * facts pushed to the right) rather than a tall card: SCA metadata is often
 * sparse, and a big box with a couple of chips clustered top-left reads as
 * empty. The strip stays tidy whether it has the full upgrade path or just a
 * CVSS + dependency type.
 */
export function DependencyPanel({ finding }: DependencyPanelProps) {
  // SCA findings store package info in metadata
  const meta = finding.metadata || {}
  const packageName = (meta.package_name as string) || (meta.component_name as string) || ''
  const packageVersion =
    (meta.installed_version as string) || (meta.current_version as string) || ''
  const ecosystem = (meta.ecosystem as string) || (meta.package_manager as string) || ''
  const fixedVersion = (meta.fixed_version as string) || (meta.patched_version as string) || ''
  const affectedRange =
    (meta.vulnerable_range as string) || (meta.affected_versions as string) || ''
  const purl = (meta.purl as string) || ''
  // Only assert Direct/Transitive when the fact is actually present. Defaulting
  // an absent value to "Transitive" was a false claim about unknown metadata.
  const depTypeKnown =
    typeof meta.is_direct === 'boolean' ||
    meta.dependency_type === 'direct' ||
    meta.dependency_type === 'transitive'
  const isDirect = meta.is_direct === true || meta.dependency_type === 'direct'

  // If no useful SCA data, don't render
  if (!packageName && !finding.cve) return null

  const secondLine = purl || finding.filePath

  return (
    <div className="mx-6 mt-3 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Label */}
        <div className="flex shrink-0 items-center gap-2">
          <Package className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Dependency Vulnerability</span>
        </div>

        {/* Upgrade path — the actionable core of an SCA finding */}
        {packageName && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{packageName}</span>
            {packageVersion && (
              <Badge variant="outline" className="font-mono text-xs">
                {packageVersion}
              </Badge>
            )}
            {fixedVersion && (
              <>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge
                  variant="outline"
                  className="border-green-500/40 font-mono text-xs text-green-400"
                >
                  {fixedVersion}
                </Badge>
              </>
            )}
            {ecosystem && (
              <Badge variant="outline" className="text-xs capitalize">
                {ecosystem}
              </Badge>
            )}
          </div>
        )}

        {/* Facts — pushed to the right so the strip spans the full row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:ms-auto">
          {finding.cvss != null && (
            <span
              className={cn(
                'font-medium',
                finding.cvss >= 9
                  ? 'text-red-400'
                  : finding.cvss >= 7
                    ? 'text-orange-400'
                    : finding.cvss >= 4
                      ? 'text-yellow-400'
                      : 'text-green-400'
              )}
            >
              CVSS {finding.cvss.toFixed(1)}
            </span>
          )}
          {depTypeKnown && <span>{isDirect ? 'Direct dependency' : 'Transitive dependency'}</span>}
          {affectedRange && (
            <span className="font-mono">
              Affected <span className="text-foreground/80">{affectedRange}</span>
            </span>
          )}
        </div>
      </div>

      {/* purl / manifest path — only when present, as a subtle second line */}
      {secondLine && (
        <div className="mt-1.5 truncate font-mono text-xs text-muted-foreground" title={secondLine}>
          {secondLine}
        </div>
      )}
    </div>
  )
}
