'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Loader,
  Wrench,
  Link,
  ListChecks,
  XCircle,
  Gauge,
  Timer,
  Code2,
  Zap,
  Copy,
  Check,
  Sparkles,
  Target,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import type { Remediation, RemediationStepStatus, FindingDetail } from '../../types'
import { CodeHighlighter } from './code-highlighter'
import { buildRepositoryCodeUrl } from '../../lib/repository-url'

interface RemediationTabProps {
  remediation: Remediation
  finding?: FindingDetail // Optional: for extended remediation info
}

const STATUS_ICONS: Record<RemediationStepStatus, React.ReactNode> = {
  pending: <Circle className="text-muted-foreground h-4 w-4" />,
  in_progress: <Loader className="h-4 w-4 animate-spin text-yellow-400" />,
  completed: <CheckCircle2 className="h-4 w-4 text-green-400" />,
}

// Effort level badges
const EFFORT_CONFIG: Record<string, { label: string; color: string }> = {
  trivial: { label: 'Trivial', color: 'border-green-500/50 text-green-400' },
  low: { label: 'Low', color: 'border-green-500/50 text-green-400' },
  medium: { label: 'Medium', color: 'border-yellow-500/50 text-yellow-400' },
  high: { label: 'High', color: 'border-red-500/50 text-red-400' },
}

export function RemediationTab({ remediation, finding }: RemediationTabProps) {
  const [copiedCode, setCopiedCode] = useState(false)

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // Get data from apiRemediation JSONB (primary) or fallback to direct fields
  const apiRemed = finding?.apiRemediation
  const fixCode = apiRemed?.fix_code || finding?.fixCode
  const fixRegex = apiRemed?.fix_regex || finding?.fixRegex
  const isAutoFixable = apiRemed?.auto_fixable || (fixCode && fixCode.length > 0)
  const isFixAvailable = apiRemed?.fix_available || isAutoFixable
  const effort = apiRemed?.effort
  const remediationSteps = apiRemed?.steps || []
  const remediationReferences = apiRemed?.references || remediation.references || []
  const recommendation = apiRemed?.recommendation || remediation.description

  // Build repository code URL for "View in Repository" link
  // TODO: Use this URL in the UI to link to the repository
  const _repositoryCodeUrl = useMemo(() => {
    // Use repositoryUrl directly, or fall back to asset URL
    const repoUrl = finding?.repositoryUrl || finding?.assets?.[0]?.url
    return buildRepositoryCodeUrl({
      repositoryUrl: repoUrl,
      filePath: finding?.filePath,
      startLine: finding?.startLine,
      endLine: finding?.endLine,
      branch: finding?.branch,
      commitSha: finding?.commitSha,
    })
  }, [
    finding?.repositoryUrl,
    finding?.assets,
    finding?.filePath,
    finding?.startLine,
    finding?.endLine,
    finding?.branch,
    finding?.commitSha,
  ])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isOverdue = remediation.deadline && new Date(remediation.deadline) < new Date()
  const daysUntilDeadline = remediation.deadline
    ? Math.ceil(
        (new Date(remediation.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null

  const completedSteps = remediation.steps.filter((s) => s.status === 'completed').length
  const totalSteps = remediation.steps.length

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Remediation Progress</h3>
            <p className="text-muted-foreground text-sm">
              {completedSteps} of {totalSteps} steps completed
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{remediation.progress}%</p>
            {remediation.deadline && (
              <div
                className={`flex items-center justify-end gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-muted-foreground'}`}
              >
                {isOverdue ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {isOverdue ? (
                  <span>Overdue by {Math.abs(daysUntilDeadline!)} days</span>
                ) : (
                  <span>Due {formatDate(remediation.deadline)}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <Progress value={remediation.progress} className="h-2" />
      </div>

      {/* Remediation Context - from finding extended data and apiRemediation JSONB */}
      {(finding?.remediationType ||
        finding?.estimatedFixTime !== undefined ||
        finding?.fixComplexity ||
        finding?.remedyAvailable !== undefined ||
        effort ||
        isFixAvailable ||
        isAutoFixable) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          {/* Fix Available */}
          {isFixAvailable !== undefined && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Fix Available</p>
              <div className="flex items-center gap-1.5">
                {isFixAvailable ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    <span className="font-medium text-green-400">Yes</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">No</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Auto-fixable */}
          {isAutoFixable !== undefined && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Auto-fixable</p>
              <div className="flex items-center gap-1.5">
                {isAutoFixable ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-green-400" />
                    <span className="font-medium text-green-400">Yes</span>
                  </>
                ) : (
                  <>
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">Manual</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Effort */}
          {effort && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Effort</p>
              <Badge
                variant="outline"
                className={`capitalize ${EFFORT_CONFIG[effort]?.color || ''}`}
              >
                {EFFORT_CONFIG[effort]?.label || effort}
              </Badge>
            </div>
          )}

          {/* Fix Complexity */}
          {finding?.fixComplexity && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Fix Complexity</p>
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                <Badge
                  variant="outline"
                  className={`capitalize ${
                    finding.fixComplexity === 'complex'
                      ? 'border-red-500/50 text-red-400'
                      : finding.fixComplexity === 'moderate'
                        ? 'border-yellow-500/50 text-yellow-400'
                        : 'border-green-500/50 text-green-400'
                  }`}
                >
                  {finding.fixComplexity}
                </Badge>
              </div>
            </div>
          )}

          {/* Remediation Type */}
          {finding?.remediationType && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Remediation Type</p>
              <Badge variant="outline" className="capitalize">
                {finding.remediationType}
              </Badge>
            </div>
          )}

          {/* Estimated Fix Time */}
          {finding?.estimatedFixTime !== undefined && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Estimated Fix Time</p>
              <div className="flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {finding.estimatedFixTime >= 60
                    ? `${Math.floor(finding.estimatedFixTime / 60)}h ${finding.estimatedFixTime % 60}m`
                    : `${finding.estimatedFixTime}m`}
                </span>
              </div>
            </div>
          )}

          {/* Remedy Available (legacy field) */}
          {finding?.remedyAvailable !== undefined && !isFixAvailable && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Remedy Available</p>
              <div className="flex items-center gap-1.5">
                {finding.remedyAvailable ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    <span className="font-medium text-green-400">Yes</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="font-medium text-yellow-400">No</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description / Recommended Fix */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Wrench className="h-4 w-4" />
          Recommendation
        </h3>
        {recommendation && recommendation !== 'No recommendation provided by scanner.' ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{recommendation}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-muted-foreground text-sm">
              No remediation recommendation available from the scanner.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              Consult the vulnerability documentation or security guidelines for fix
              recommendations.
            </p>
          </div>
        )}
      </div>

      {/* Auto-Fix Code Section */}
      {(fixCode || fixRegex) && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Code2 className="h-4 w-4" />
            Auto-Fix Code
            {isAutoFixable && (
              <Badge variant="outline" className="ml-2 border-green-500/50 text-green-400">
                <Zap className="h-3 w-3 mr-1" />
                Auto-fixable
              </Badge>
            )}
          </h3>

          {fixCode && (
            <div className="relative">
              <div className="bg-[#1e1e2e] rounded-lg overflow-hidden border border-slate-700/50">
                {/* Header with copy button */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/30">
                  <span className="text-xs text-slate-400 font-mono">Fix Code</span>
                  <button
                    onClick={() => handleCopyCode(fixCode)}
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded"
                    title="Copy code"
                  >
                    {copiedCode ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                {/* Code content */}
                <ScrollArea className="p-3 max-h-[400px]">
                  <CodeHighlighter
                    code={fixCode.trim()}
                    className="bg-transparent"
                    showLineNumbers={true}
                  />
                </ScrollArea>
              </div>
              <p className="text-muted-foreground text-xs mt-2">
                This code fix was suggested by the scanner. Review carefully before applying.
              </p>
            </div>
          )}

          {fixRegex && (
            <div className="mt-4 bg-[#1e1e2e] rounded-lg overflow-hidden border border-slate-700/50">
              <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700/30">
                <span className="text-xs text-slate-400 font-mono">Regex-based fix pattern</span>
              </div>
              <div className="p-4 space-y-3 font-mono text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">Pattern:</span>
                  <code className="bg-slate-900/50 px-2 py-1 rounded text-amber-400 break-all">
                    {fixRegex.regex}
                  </code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">Replace:</span>
                  <code className="bg-slate-900/50 px-2 py-1 rounded text-green-400 break-all">
                    {fixRegex.replacement}
                  </code>
                </div>
                {fixRegex.count !== undefined && fixRegex.count > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Occurrences:</span>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {fixRegex.count}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Remediation Steps - from apiRemediation JSONB or legacy UI */}
      {(remediationSteps.length > 0 || remediation.steps.length > 0) && (
        <>
          <Separator />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <ListChecks className="h-4 w-4" />
                Remediation Steps
              </h3>
              {remediation.steps.length > 0 && (
                <Button size="sm" variant="outline">
                  Add Step
                </Button>
              )}
            </div>

            {/* Steps from apiRemediation JSONB (simple list from scanner) */}
            {remediationSteps.length > 0 && (
              <div className="space-y-2">
                {remediationSteps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Legacy steps with status tracking (for manual tracking) */}
            {remediationSteps.length === 0 && remediation.steps.length > 0 && (
              <div className="space-y-3">
                {remediation.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      step.status === 'completed'
                        ? 'border-green-500/20 bg-green-500/5'
                        : step.status === 'in_progress'
                          ? 'border-yellow-500/20 bg-yellow-500/5'
                          : 'bg-muted/30'
                    }`}
                  >
                    <div className="pt-0.5">
                      <Checkbox
                        checked={step.status === 'completed'}
                        disabled
                        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-medium">
                          Step {index + 1}
                        </span>
                        {STATUS_ICONS[step.status]}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            step.status === 'completed'
                              ? 'border-green-500/50 text-green-400'
                              : step.status === 'in_progress'
                                ? 'border-yellow-500/50 text-yellow-400'
                                : ''
                          }`}
                        >
                          {step.status === 'in_progress'
                            ? 'In Progress'
                            : step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                        </Badge>
                      </div>
                      <p
                        className={`text-sm ${step.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}
                      >
                        {step.description}
                      </p>
                      {step.completedBy && step.completedAt && (
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {getInitials(step.completedBy.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            Completed by {step.completedBy.name} on {formatDate(step.completedAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* References - from apiRemediation JSONB or legacy */}
      {remediationReferences.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Link className="h-4 w-4" />
              References
            </h3>
            <ul className="space-y-2">
              {remediationReferences.map((ref, index) => (
                <li key={index}>
                  <a
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-400 hover:underline break-all"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {ref}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
