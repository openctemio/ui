'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, Shield, Target, FileWarning, Clock, Bot, XCircle } from 'lucide-react'
import { TriageStatusBadge } from './triage-status-badge'
import { SEVERITY_CONFIG } from '@/features/shared/types'
import type { AITriageResult, Exploitability } from '../types'
import { EXPLOITABILITY_CONFIG, EFFORT_CONFIG } from '../types'

interface TriageResultCardProps {
  result: AITriageResult
  className?: string
}

export function TriageResultCard({ result, className }: TriageResultCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) return 'bg-gray-100 text-gray-800'
    const config = SEVERITY_CONFIG[severity.toLowerCase() as keyof typeof SEVERITY_CONFIG]
    return config ? `${config.color} ${config.textColor}` : 'bg-gray-100 text-gray-800'
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getFPColor = (likelihood: number) => {
    if (likelihood >= 0.7) return 'text-green-600' // High FP = likely safe
    if (likelihood >= 0.3) return 'text-yellow-600'
    return 'text-red-600' // Low FP = likely real
  }

  if (result.status === 'pending' || result.status === 'processing') {
    return (
      <Card className={cn('', className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
            <h3 className="text-lg font-medium mb-2">
              {result.status === 'pending' ? 'Triage Pending' : 'Analyzing Finding...'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {result.status === 'pending'
                ? 'AI triage has been queued and will start shortly.'
                : 'Our AI is analyzing this finding. This may take a moment.'}
            </p>
            <TriageStatusBadge status={result.status} className="mt-4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (result.status === 'failed') {
    return (
      <Card className={cn('border-red-200', className)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Triage Failed</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {result.errorMessage || 'An error occurred during AI analysis.'}
            </p>
            <TriageStatusBadge status={result.status} />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Triage Analysis
          </CardTitle>
          <TriageStatusBadge status={result.status} />
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(result.createdAt)}
          </span>
          {result.llmProvider && (
            <span>
              {result.llmProvider}/{result.llmModel}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        {result.summary && (
          <div>
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </div>
        )}

        <Separator />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Severity Assessment */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Severity
            </div>
            <Badge className={cn('capitalize', getSeverityColor(result.severityAssessment))}>
              {result.severityAssessment || 'Unknown'}
            </Badge>
          </div>

          {/* Risk Score */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              Risk Score
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xl font-bold', getRiskScoreColor(result.riskScore || 0))}>
                {result.riskScore ?? '-'}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Exploitability */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Exploitability
            </div>
            {result.exploitability && (
              <span
                className={cn(
                  'text-sm font-medium capitalize',
                  EXPLOITABILITY_CONFIG[result.exploitability as Exploitability]?.color
                )}
              >
                {result.exploitability}
              </span>
            )}
          </div>

          {/* False Positive */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileWarning className="h-3.5 w-3.5" />
              False Positive
            </div>
            {result.falsePositiveLikelihood !== undefined && (
              <span
                className={cn('text-sm font-medium', getFPColor(result.falsePositiveLikelihood))}
              >
                {Math.round(result.falsePositiveLikelihood * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* Priority */}
        {result.priorityRank !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Priority Rank</span>
              <span className="font-medium">{result.priorityRank}/100</span>
            </div>
            <Progress value={result.priorityRank} className="h-2" />
          </div>
        )}

        {/* Justification */}
        {result.severityJustification && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Severity Justification</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.severityJustification}
            </p>
          </div>
        )}

        {/* Business Impact */}
        {result.businessImpact && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Business Impact</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.businessImpact}</p>
          </div>
        )}

        {/* Remediation Steps */}
        {result.remediationSteps && result.remediationSteps.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Remediation Steps</h4>
            <div className="space-y-2">
              {result.remediationSteps.map((step, index) => (
                <div key={index} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {step.step}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p>{step.description}</p>
                    <Badge variant="outline" className={EFFORT_CONFIG[step.effort]?.color}>
                      {EFFORT_CONFIG[step.effort]?.label || step.effort}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related CVEs/CWEs */}
        {(result.relatedCves?.length || result.relatedCwes?.length) && (
          <div className="flex flex-wrap gap-2">
            {result.relatedCves?.map((cve) => (
              <Badge key={cve} variant="secondary" className="text-xs">
                {cve}
              </Badge>
            ))}
            {result.relatedCwes?.map((cwe) => (
              <Badge key={cwe} variant="outline" className="text-xs">
                {cwe}
              </Badge>
            ))}
          </div>
        )}

        {/* Token Usage (Collapsed) */}
        {(result.promptTokens || result.completionTokens) && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            Tokens used: {result.promptTokens} input + {result.completionTokens} output ={' '}
            {(result.promptTokens || 0) + (result.completionTokens || 0)} total
          </div>
        )}
      </CardContent>
    </Card>
  )
}
