'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, ArrowUp, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FindingDetail } from '../../../types'

interface DependencyHeroProps {
  finding: FindingDetail
}

export function DependencyHero({ finding }: DependencyHeroProps) {
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
  const isDirect = meta.is_direct === true || meta.dependency_type === 'direct'

  // If no useful SCA data, don't render
  if (!packageName && !finding.cve) return null

  return (
    <Card className="mx-6 mt-3 border-blue-500/30 bg-blue-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Dependency Vulnerability</span>
        </div>

        {/* Package info */}
        {packageName && (
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold">{packageName}</span>
              {packageVersion && (
                <span className="text-sm text-muted-foreground">@ {packageVersion}</span>
              )}
              {ecosystem && (
                <Badge variant="outline" className="text-xs capitalize">
                  {ecosystem}
                </Badge>
              )}
            </div>
            {purl && <div className="text-xs text-muted-foreground mt-0.5 font-mono">{purl}</div>}
          </div>
        )}

        {/* CVE + CVSS row */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {finding.cve && (
            <Badge variant="outline" className="text-xs font-mono">
              {finding.cve}
            </Badge>
          )}
          {finding.cvss != null && (
            <span
              className={cn(
                'text-xs font-medium',
                finding.cvss >= 9
                  ? 'text-red-400'
                  : finding.cvss >= 7
                    ? 'text-orange-400'
                    : finding.cvss >= 4
                      ? 'text-yellow-400'
                      : 'text-green-400'
              )}
            >
              CVSS: {finding.cvss.toFixed(1)}
            </span>
          )}
        </div>

        {/* Version info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {affectedRange && (
            <div>
              <span className="text-xs text-muted-foreground">Affected: </span>
              <span className="text-xs font-mono">{affectedRange}</span>
            </div>
          )}
          {fixedVersion && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Fixed in: </span>
              <span className="text-xs font-mono font-medium">{fixedVersion}</span>
              <CheckCircle2 className="h-3 w-3 text-green-400" />
              <ArrowUp className="h-3 w-3 text-green-400" />
            </div>
          )}
        </div>

        {/* Dependency type + file */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-2">
          <span>{isDirect ? 'Direct dependency' : 'Transitive dependency'}</span>
          {finding.filePath && <span className="font-mono">{finding.filePath}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
