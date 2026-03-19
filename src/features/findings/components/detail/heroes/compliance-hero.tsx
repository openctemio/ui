'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, XCircle, CheckCircle2, HelpCircle, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FindingDetail } from '../../../types'

interface ComplianceHeroProps {
  finding: FindingDetail
}

const RESULT_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  pass: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
  fail: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  manual: { icon: HelpCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  not_applicable: { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-500/20' },
}

export function ComplianceHero({ finding }: ComplianceHeroProps) {
  const details = finding.complianceDetails
  if (!details) return null

  if (!details.framework && !details.controlId) return null

  const result = details.result || 'fail'
  const resultCfg = RESULT_CONFIG[result] || RESULT_CONFIG.fail
  const ResultIcon = resultCfg.icon

  return (
    <Card className="mx-6 mt-3 border-blue-500/30 bg-blue-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">Compliance Violation</span>
        </div>

        {/* Framework + Version */}
        <div className="flex items-center gap-3 mb-3">
          {details.framework && (
            <span className="text-base font-semibold uppercase">{details.framework}</span>
          )}
          {details.frameworkVersion && (
            <Badge variant="outline" className="text-xs">
              v{details.frameworkVersion}
            </Badge>
          )}
          {details.section && (
            <span className="text-xs text-muted-foreground">{details.section}</span>
          )}
        </div>

        {/* Control info */}
        {(details.controlId || details.controlName) && (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              {details.controlId && (
                <Badge variant="outline" className="text-xs font-mono">
                  {details.controlId}
                </Badge>
              )}
              {details.controlName && (
                <span className="text-sm font-medium">{details.controlName}</span>
              )}
            </div>
          </div>
        )}

        {/* Result badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Result:</span>
          <Badge variant="outline" className={cn('text-xs gap-1', resultCfg.color, resultCfg.bg)}>
            <ResultIcon className="h-3 w-3" />
            {result.toUpperCase().replace('_', ' ')}
          </Badge>
        </div>

        {/* Control description */}
        {details.controlDescription && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {details.controlDescription}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
