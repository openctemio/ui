'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Settings, FileCode } from 'lucide-react'
import type { FindingDetail } from '../../../types'

interface MisconfigPanelProps {
  finding: FindingDetail
}

export function MisconfigPanel({ finding }: MisconfigPanelProps) {
  const details = finding.misconfigDetails
  if (!details) return null

  // If all fields are empty, don't render
  if (!details.policyId && !details.policyName && !details.resourceType) return null

  return (
    <Card className="mx-6 mt-3 border-orange-500/30 bg-orange-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-medium text-orange-400">
            Infrastructure Misconfiguration
          </span>
        </div>

        {/* Policy info */}
        {(details.policyId || details.policyName) && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground">Policy</div>
            <div className="text-sm font-medium">
              {details.policyId && (
                <Badge variant="outline" className="text-xs font-mono mr-2">
                  {details.policyId}
                </Badge>
              )}
              {details.policyName}
            </div>
          </div>
        )}

        {/* Resource info */}
        {(details.resourceType || details.resourceName) && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground">Resource</div>
            <div className="text-sm font-mono">
              {details.resourceType && (
                <span className="text-muted-foreground">{details.resourceType}.</span>
              )}
              {details.resourceName}
            </div>
            {details.resourcePath && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <FileCode className="h-3 w-3" />
                {details.resourcePath}
              </div>
            )}
          </div>
        )}

        {/* Expected vs Actual side-by-side */}
        {(details.expected || details.actual) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <div className="rounded border border-green-500/20 bg-green-500/5 p-2">
              <div className="text-xs text-green-400 mb-1 font-medium">Expected</div>
              <pre className="text-xs font-mono whitespace-pre-wrap text-green-300/80">
                {details.expected || '(not configured)'}
              </pre>
            </div>
            <div className="rounded border border-red-500/20 bg-red-500/5 p-2">
              <div className="text-xs text-red-400 mb-1 font-medium">Actual</div>
              <pre className="text-xs font-mono whitespace-pre-wrap text-red-300/80">
                {details.actual || '(not configured)'}
              </pre>
            </div>
          </div>
        )}

        {/* Cause */}
        {details.cause && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Cause:</span> {details.cause}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
