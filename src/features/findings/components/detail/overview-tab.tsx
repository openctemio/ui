'use client'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ExternalLink,
  FileText,
  AlertTriangle,
  Shield,
  FolderCode,
  Scan,
  Tag,
  Target,
  Clock,
  Link2,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  XCircle,
  Network,
  Building2,
  Bot,
} from 'lucide-react'
import type { FindingDetail, Activity } from '../../types'
import { SEVERITY_CONFIG } from '../../types'
import { CodeHighlighter } from './code-highlighter'
import { Copy, Check } from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface OverviewTabProps {
  finding: FindingDetail
  /** Activities from finding detail - used to show AI triage summary */
  activities?: Activity[]
}

/**
 * Extract AI triage data from activity changes
 */
interface AITriageActivityData {
  triageResultId?: string
  severity?: string
  riskScore?: number
  priorityRank?: number
  riskLevel?: string
  confidence?: string
  recommendation?: string
  createdAt: string
}

export function OverviewTab({ finding, activities = [] }: OverviewTabProps) {
  // Find the most recent ai_triage activity (no API call needed!)
  const aiTriageActivity = useMemo(() => {
    const triageActivities = activities.filter((a) => a.type === 'ai_triage')
    // Sort by createdAt desc to get most recent
    return triageActivities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0]
  }, [activities])

  // Extract AI triage data from activity metadata
  // Data from api.changes is spread into metadata by the mapper
  const aiTriageData: AITriageActivityData | null = useMemo(() => {
    if (!aiTriageActivity?.metadata) return null

    const m = aiTriageActivity.metadata as Record<string, unknown>

    return {
      triageResultId: (m.triage_result_id as string) || undefined,
      severity: (m.severity as string) || undefined,
      riskScore: m.risk_score as number | undefined,
      priorityRank: m.priority_rank as number | undefined,
      riskLevel: (m.ai_risk_level as string) || undefined,
      confidence: (m.ai_confidence as string) || undefined,
      recommendation: (m.ai_recommendation as string) || undefined,
      createdAt: aiTriageActivity.createdAt,
    }
  }, [aiTriageActivity])

  return (
    <div className="space-y-6">
      {/* AI Triage Summary - from activity data (no API call!) */}
      {aiTriageData && <AITriageSummaryCard data={aiTriageData} />}

      {/* Description */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <FileText className="h-4 w-4" />
          Description
        </h3>
        <p className="text-muted-foreground whitespace-pre-wrap text-sm">{finding.description}</p>
      </div>

      {/* Risk Assessment - show if any risk data exists */}
      {(finding.confidence !== undefined ||
        finding.impact ||
        finding.likelihood ||
        finding.rank !== undefined) && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Target className="h-4 w-4" />
              Risk Assessment
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
              {finding.confidence !== undefined && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Confidence</p>
                  <p className="font-medium">{finding.confidence}%</p>
                </div>
              )}
              {finding.impact && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Impact</p>
                  <Badge
                    variant="outline"
                    className={`capitalize ${
                      finding.impact === 'high' || finding.impact === 'critical'
                        ? 'border-red-500/50 text-red-400'
                        : finding.impact === 'medium'
                          ? 'border-yellow-500/50 text-yellow-400'
                          : 'border-green-500/50 text-green-400'
                    }`}
                  >
                    {finding.impact}
                  </Badge>
                </div>
              )}
              {finding.likelihood && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Likelihood</p>
                  <Badge
                    variant="outline"
                    className={`capitalize ${
                      finding.likelihood === 'high' || finding.likelihood === 'critical'
                        ? 'border-red-500/50 text-red-400'
                        : finding.likelihood === 'medium'
                          ? 'border-yellow-500/50 text-yellow-400'
                          : 'border-green-500/50 text-green-400'
                    }`}
                  >
                    {finding.likelihood}
                  </Badge>
                </div>
              )}
              {finding.rank !== undefined && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Priority Rank</p>
                  <p className="font-mono font-medium">{finding.rank}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Security Context - show if any security context data exists */}
      {(finding.exposureVector ||
        finding.isNetworkAccessible !== undefined ||
        finding.dataExposureRisk ||
        finding.attackPrerequisites) && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Security Context
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                {finding.exposureVector && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs mb-1">Exposure Vector</p>
                    <div className="flex items-center gap-1.5">
                      <Network className="h-3.5 w-3.5" />
                      <span className="font-medium capitalize">{finding.exposureVector}</span>
                    </div>
                  </div>
                )}
                {finding.isNetworkAccessible !== undefined && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs mb-1">Network Accessible</p>
                    <div className="flex items-center gap-1.5">
                      {finding.isNetworkAccessible ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-red-400" />
                          <span className="font-medium text-red-400">Yes</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-green-400" />
                          <span className="font-medium text-green-400">No</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {finding.dataExposureRisk && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs mb-1">Data Exposure Risk</p>
                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        finding.dataExposureRisk === 'critical'
                          ? 'border-red-500/50 text-red-400'
                          : finding.dataExposureRisk === 'high'
                            ? 'border-orange-500/50 text-orange-400'
                            : finding.dataExposureRisk === 'medium'
                              ? 'border-yellow-500/50 text-yellow-400'
                              : 'border-green-500/50 text-green-400'
                      }`}
                    >
                      {finding.dataExposureRisk}
                    </Badge>
                  </div>
                )}
                {finding.reputationalImpact !== undefined && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs mb-1">Reputational Impact</p>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {finding.reputationalImpact ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {finding.attackPrerequisites && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Attack Prerequisites</p>
                  <p className="text-sm">{finding.attackPrerequisites}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Compliance Impact - show if compliance data exists */}
      {finding.complianceImpact && finding.complianceImpact.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" />
              Compliance Impact
            </h3>
            <div className="flex flex-wrap gap-2">
              {finding.complianceImpact.map((standard) => (
                <Badge
                  key={standard}
                  variant="outline"
                  className="border-purple-500/50 text-purple-400"
                >
                  {standard}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Remediation Info - show if any remediation context exists */}
      {(finding.remediationType ||
        finding.estimatedFixTime !== undefined ||
        finding.fixComplexity ||
        finding.remedyAvailable !== undefined) && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Wrench className="h-4 w-4" />
              Remediation Info
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
              {finding.remediationType && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Remediation Type</p>
                  <Badge variant="outline" className="capitalize">
                    {finding.remediationType}
                  </Badge>
                </div>
              )}
              {finding.fixComplexity && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Fix Complexity</p>
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
              )}
              {finding.estimatedFixTime !== undefined && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Estimated Fix Time</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-medium">
                      {finding.estimatedFixTime >= 60
                        ? `${Math.floor(finding.estimatedFixTime / 60)}h ${finding.estimatedFixTime % 60}m`
                        : `${finding.estimatedFixTime}m`}
                    </span>
                  </div>
                </div>
              )}
              {finding.remedyAvailable !== undefined && (
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
          </div>
        </>
      )}

      {/* Linked Issues - show if work item URIs exist */}
      {finding.workItemUris && finding.workItemUris.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Link2 className="h-4 w-4" />
              Linked Issues ({finding.workItemUris.length})
            </h3>
            <div className="space-y-2">
              {finding.workItemUris.map((uri, index) => (
                <a
                  key={index}
                  href={uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:underline bg-muted/50 rounded-lg p-3"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{uri}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Vulnerability Classification - show if vulnerability class exists */}
      {finding.vulnerabilityClass && finding.vulnerabilityClass.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Vulnerability Classification
            </h3>
            <div className="flex flex-wrap gap-2">
              {finding.vulnerabilityClass.map((cls) => (
                <Badge key={cls} variant="secondary">
                  {cls}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tags - moved from header for cleaner layout */}
      {finding.tags && finding.tags.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Tag className="h-4 w-4" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {finding.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Location Info - Only show if file path exists */}
      {finding.filePath && (
        <>
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <FolderCode className="h-4 w-4" />
              Location
            </h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <div className="sm:col-span-2 md:col-span-3">
                  <p className="text-muted-foreground text-xs mb-1">File Path</p>
                  <p className="font-mono text-sm break-all">{finding.filePath}</p>
                </div>
                {finding.startLine && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Line</p>
                    <p className="font-mono text-sm">
                      {finding.startLine}
                      {finding.endLine && finding.endLine !== finding.startLine && (
                        <span className="text-muted-foreground"> - {finding.endLine}</span>
                      )}
                    </p>
                  </div>
                )}
                {finding.startColumn && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Column</p>
                    <p className="font-mono text-sm">
                      {finding.startColumn}
                      {finding.endColumn && finding.endColumn !== finding.startColumn && (
                        <span className="text-muted-foreground"> - {finding.endColumn}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Code Snippet - Show context snippet if available, otherwise regular snippet */}
      {(finding.contextSnippet || finding.snippet) && <CodeSnippetSection finding={finding} />}

      {/* Scanner Info - Always show for context */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Scan className="h-4 w-4" />
          Scanner Details
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          {finding.toolName && (
            <div>
              <p className="text-muted-foreground text-xs">Scanner</p>
              <p className="font-medium">
                {finding.toolName}
                {finding.toolVersion && (
                  <span className="text-muted-foreground ml-1 text-xs">v{finding.toolVersion}</span>
                )}
              </p>
            </div>
          )}
          {finding.ruleId && (
            <div>
              <p className="text-muted-foreground text-xs">Rule ID</p>
              <p className="font-mono text-sm">{finding.ruleId}</p>
            </div>
          )}
          {finding.ruleName && (
            <div>
              <p className="text-muted-foreground text-xs">Rule Name</p>
              <p className="text-sm">{finding.ruleName}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground text-xs">Source Type</p>
            <Badge variant="outline" className="mt-1 capitalize">
              {finding.source}
            </Badge>
          </div>
        </div>
      </div>

      {/* Technical Details - CVE/CWE/CVSS (only show section if any values exist) */}
      {(finding.cvss !== undefined ||
        finding.cvssVector ||
        finding.cve ||
        finding.cwe ||
        finding.owasp) && (
        <>
          <Separator />
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" />
              Vulnerability Classification
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
              {finding.cvss !== undefined && (
                <div>
                  <p className="text-muted-foreground text-xs">CVSS Score</p>
                  <p className="font-mono font-medium">{finding.cvss}</p>
                </div>
              )}
              {finding.cvssVector && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-xs">CVSS Vector</p>
                  <p className="font-mono text-xs sm:text-sm break-all">{finding.cvssVector}</p>
                </div>
              )}
              {finding.cve && (
                <div>
                  <p className="text-muted-foreground text-xs">CVE ID</p>
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${finding.cve}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-sm text-blue-400 hover:underline"
                  >
                    {finding.cve}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {finding.cwe && (
                <div>
                  <p className="text-muted-foreground text-xs">CWE ID</p>
                  <a
                    href={`https://cwe.mitre.org/data/definitions/${finding.cwe.replace('CWE-', '')}.html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-sm text-blue-400 hover:underline"
                  >
                    {finding.cwe}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {finding.owasp && (
                <div>
                  <p className="text-muted-foreground text-xs">OWASP</p>
                  <p className="font-mono text-sm">{finding.owasp}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Affected Assets */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Affected Assets ({finding.assets.length})
        </h3>
        <div className="space-y-2">
          {finding.assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-muted/50 flex items-center justify-between rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="capitalize">
                  {asset.type}
                </Badge>
                <div>
                  <p className="font-medium">{asset.name}</p>
                  {asset.url && (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                    >
                      {asset.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              {asset.criticality && (
                <Badge
                  className={`${SEVERITY_CONFIG[asset.criticality].bgColor} ${SEVERITY_CONFIG[asset.criticality].textColor} border-0`}
                >
                  {asset.criticality}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Code Snippet Section - displays code with syntax highlighting
 * Shows context snippet (±3 lines around vulnerability) when available
 */
function CodeSnippetSection({ finding }: { finding: FindingDetail }) {
  const [copied, setCopied] = useState(false)

  // Determine which snippet to display and the starting line
  const displaySnippet = finding.contextSnippet || finding.snippet
  const startLine = finding.contextSnippet ? finding.contextStartLine || 1 : finding.startLine || 1

  // Calculate the line to highlight (the vulnerability line)
  const highlightLine = finding.startLine

  const handleCopy = useCallback(async () => {
    if (!displaySnippet) return
    try {
      await navigator.clipboard.writeText(displaySnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore clipboard errors
    }
  }, [displaySnippet])

  if (!displaySnippet) return null

  return (
    <>
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <FileText className="h-4 w-4" />
          Code Snippet
          {finding.contextSnippet && (
            <span className="text-muted-foreground text-xs font-normal">(with context)</span>
          )}
        </h3>
        <div className="relative group">
          <div className="bg-[#1e1e2e] rounded-lg overflow-hidden border border-slate-700/50">
            {/* Header with file path and copy button */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/30">
              <span className="text-xs text-slate-400 font-mono truncate">
                {finding.filePath || 'code'}
                {finding.startLine && `:${finding.startLine}`}
                {finding.endLine && finding.endLine !== finding.startLine && `-${finding.endLine}`}
              </span>
              <button
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded"
                title="Copy code"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            {/* Code content with syntax highlighting */}
            <div className="p-3 overflow-x-auto">
              <CodeHighlighter
                code={displaySnippet}
                filePath={finding.filePath}
                className="bg-transparent"
                showLineNumbers={true}
                startLine={startLine}
                highlightLine={highlightLine}
              />
            </div>
          </div>
        </div>
      </div>
      <Separator />
    </>
  )
}

/**
 * AI Triage Summary Card - displays AI analysis from activity data
 * No API call needed - data comes from activities already loaded
 */
function AITriageSummaryCard({ data }: { data: AITriageActivityData }) {
  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-500'
    if (score >= 60) return 'text-orange-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getSeverityColor = (severity: string) => {
    const lower = severity?.toLowerCase()
    if (lower === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (lower === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    if (lower === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (lower === 'low') return 'bg-green-500/20 text-green-400 border-green-500/30'
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  const getConfidenceColor = (confidence: string) => {
    const lower = confidence?.toLowerCase()
    if (lower === 'high') return 'text-green-400'
    if (lower === 'medium') return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card className="border-purple-500/20 bg-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-400" />
            <span className="text-purple-400">AI Analysis</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">{formatDate(data.createdAt)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary/Recommendation */}
        {data.recommendation && <p className="text-sm leading-relaxed">{data.recommendation}</p>}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Severity */}
          {data.severity && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Severity</p>
              <Badge className={cn('capitalize', getSeverityColor(data.severity))}>
                {data.severity}
              </Badge>
            </div>
          )}

          {/* Risk Score */}
          {data.riskScore !== undefined && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <span className={cn('text-lg font-bold', getRiskScoreColor(data.riskScore))}>
                {data.riskScore}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </span>
            </div>
          )}

          {/* Priority Rank */}
          {data.priorityRank !== undefined && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Priority</p>
              <span className="text-lg font-bold">
                {data.priorityRank}
                <span className="text-xs text-muted-foreground font-normal">/100</span>
              </span>
            </div>
          )}

          {/* Confidence */}
          {data.confidence && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Confidence</p>
              <span
                className={cn(
                  'text-sm font-medium capitalize',
                  getConfidenceColor(data.confidence)
                )}
              >
                {data.confidence}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
