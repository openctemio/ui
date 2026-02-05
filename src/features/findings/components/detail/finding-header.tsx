'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useTenant } from '@/context/tenant-provider'
import { useCVEEnrichment } from '@/features/threat-intel/hooks'
import { EPSSScoreBadge } from '@/features/shared/components/epss-score-badge'
import { KEVIndicatorBadge } from '@/features/shared/components/kev-indicator-badge'
import { AITriageButton } from '@/features/ai-triage/components'
import {
  useUpdateFindingStatusApi,
  useUpdateFindingSeverityApi,
  useAssignFindingApi,
  useUnassignFindingApi,
  invalidateFindingsCache,
} from '../../api/use-findings-api'
import { FINDING_STATUS_CONFIG, SEVERITY_CONFIG, requiresApproval } from '../../types'
import type { FindingDetail, FindingStatus, FindingSource } from '../../types'
import type { Severity } from '@/features/shared/types'
import { AssigneeSelect } from '../assignee-select'
import { StatusSelect } from '../status-select'
import { SeveritySelect } from '../severity-select'

// Human-readable source labels
const SOURCE_LABELS: Record<FindingSource, string> = {
  // AppSec scanning
  sast: 'SAST',
  dast: 'DAST',
  sca: 'SCA',
  secret: 'Secret Scan',
  iac: 'IaC Scan',
  container: 'Container Scan',
  // Cloud & Infrastructure
  cspm: 'CSPM',
  easm: 'EASM',
  // Runtime & Production
  rasp: 'RASP',
  waf: 'WAF',
  siem: 'SIEM',
  // Manual/human sources
  manual: 'Manual Review',
  pentest: 'Pentest',
  bug_bounty: 'Bug Bounty',
  red_team: 'Red Team',
  // External sources
  external: 'External',
  threat_intel: 'Threat Intel',
  vendor: 'Vendor Assessment',
}

interface FindingHeaderProps {
  finding: FindingDetail
  onStatusChange?: (status: FindingStatus) => void
  onSeverityChange?: (severity: Severity) => void
  onAssigneeChange?: (assigneeId: string | null) => void
  /** Callback when AI triage completes (via WebSocket or polling) */
  onTriageCompleted?: () => void
}

export function FindingHeader({
  finding,
  onStatusChange,
  onSeverityChange,
  onAssigneeChange,
  onTriageCompleted,
}: FindingHeaderProps) {
  const [status, setStatus] = useState<FindingStatus>(finding.status)
  const [severity, setSeverity] = useState<Severity>(finding.severity)
  const [assigneeState, setAssigneeState] = useState(finding.assignee)
  const { currentTenant } = useTenant()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Sync local state when finding prop changes (after SWR revalidation)
  useEffect(() => {
    setStatus(finding.status)
  }, [finding.status])

  useEffect(() => {
    setSeverity(finding.severity)
  }, [finding.severity])

  useEffect(() => {
    setAssigneeState(finding.assignee)
  }, [finding.assignee])

  // API mutation hooks
  const { trigger: updateStatus, isMutating: isUpdatingStatus } = useUpdateFindingStatusApi(
    finding.id
  )
  const { trigger: updateSeverity, isMutating: isUpdatingSeverity } = useUpdateFindingSeverityApi(
    finding.id
  )
  const { trigger: assignUser, isMutating: isAssigning } = useAssignFindingApi(finding.id)
  const { trigger: unassignUser, isMutating: isUnassigning } = useUnassignFindingApi(finding.id)

  // Assignee comes from API with full user info (assigned_to_user)
  const assignee = assigneeState

  // Helper to update assignee state
  const setAssignee = (newAssignee: typeof assigneeState) => {
    setAssigneeState(newAssignee)
  }

  // Fetch EPSS/KEV data if finding has CVE
  const { epss, kev } = useCVEEnrichment(currentTenant?.id || null, finding.cve || null)

  const handleStatusChange = async (newStatus: FindingStatus, skipUndo = false) => {
    // Skip if selecting the same status
    if (newStatus === status) {
      return
    }

    // Check if status requires approval
    if (requiresApproval(newStatus)) {
      // TODO: Open approval dialog instead of direct status change
      toast.info(
        `${FINDING_STATUS_CONFIG[newStatus].label} requires approval. Feature coming soon.`
      )
      return
    }

    const previousStatus = status
    // Optimistic update
    setStatus(newStatus)

    try {
      // Backend and frontend now use unified status model
      await updateStatus({
        status: newStatus,
        resolution: newStatus === 'resolved' ? 'Resolved via UI' : undefined,
      })
      onStatusChange?.(newStatus)
      await invalidateFindingsCache()
      toast.success(
        `Status updated to ${FINDING_STATUS_CONFIG[newStatus].label}`,
        skipUndo
          ? { duration: 3000 }
          : {
              action: {
                label: 'Undo',
                onClick: () => handleStatusChange(previousStatus, true),
              },
              duration: 5000,
            }
      )
    } catch (error) {
      // Revert on error
      setStatus(previousStatus)
      toast.error(getErrorMessage(error, 'Failed to update status'))
      console.error('Status update error:', error)
    }
  }

  const handleSeverityChange = async (newSeverity: Severity, skipUndo = false) => {
    // Skip if selecting the same severity
    if (newSeverity === severity) {
      return
    }

    const previousSeverity = severity
    // Optimistic update
    setSeverity(newSeverity)

    try {
      await updateSeverity({ severity: newSeverity })
      onSeverityChange?.(newSeverity)
      await invalidateFindingsCache()
      toast.success(
        `Severity updated to ${SEVERITY_CONFIG[newSeverity].label}`,
        skipUndo
          ? { duration: 3000 }
          : {
              action: {
                label: 'Undo',
                onClick: () => handleSeverityChange(previousSeverity, true),
              },
              duration: 5000,
            }
      )
    } catch (error) {
      // Revert on error
      setSeverity(previousSeverity)
      toast.error(getErrorMessage(error, 'Failed to update severity'))
      console.error('Severity update error:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleAssigneeChange = async (
    userId: string | null,
    userName?: string,
    userEmail?: string,
    skipUndo = false
  ) => {
    const previousAssignee = assignee

    // Skip if selecting the same assignee
    if (userId === assignee?.id) {
      return
    }

    // Optimistic update
    if (userId && userName) {
      setAssignee({ id: userId, name: userName, email: userEmail || '', role: 'analyst' })
    } else {
      setAssignee(undefined)
    }

    try {
      if (userId) {
        await assignUser({ user_id: userId })
        toast.success(
          `Assigned to ${userName}`,
          skipUndo
            ? { duration: 3000 }
            : {
                action: {
                  label: 'Undo',
                  onClick: () => {
                    if (previousAssignee) {
                      handleAssigneeChange(
                        previousAssignee.id,
                        previousAssignee.name,
                        previousAssignee.email,
                        true
                      )
                    } else {
                      handleAssigneeChange(null, undefined, undefined, true)
                    }
                  },
                },
                duration: 5000,
              }
        )
      } else {
        await unassignUser()
        toast.success(
          'Unassigned successfully',
          skipUndo
            ? { duration: 3000 }
            : {
                action: {
                  label: 'Undo',
                  onClick: () => {
                    if (previousAssignee) {
                      handleAssigneeChange(
                        previousAssignee.id,
                        previousAssignee.name,
                        previousAssignee.email,
                        true
                      )
                    }
                  },
                },
                duration: 5000,
              }
        )
      }
      onAssigneeChange?.(userId)
      await invalidateFindingsCache()
    } catch (error) {
      // Revert on error
      setAssignee(previousAssignee)
      toast.error(getErrorMessage(error, userId ? 'Failed to assign' : 'Failed to unassign'))
      console.error('Assignee update error:', error)
    }
  }

  return (
    <div className="space-y-2">
      {/* Mobile: Collapsible header */}
      <div className="sm:hidden">
        {/* Always visible: Title + Toggle button */}
        <div className="flex items-start justify-between gap-2">
          <h1 className="flex-1 min-w-0 text-lg font-bold leading-tight line-clamp-2">
            {finding.title}
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="shrink-0 h-8 w-8 p-0"
            aria-label={isCollapsed ? 'Expand header details' : 'Collapse header details'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {/* Collapsible content */}
        {!isCollapsed && (
          <div className="space-y-2 mt-2">
            {/* Classification badges */}
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <Badge variant="outline" className="text-xs uppercase">
                {SOURCE_LABELS[finding.source] || finding.source}
              </Badge>
              {finding.cve && (
                <Badge variant="outline" className="text-xs">
                  {finding.cve}
                </Badge>
              )}
              {finding.cwe && (
                <Badge variant="outline" className="text-xs">
                  {finding.cwe}
                </Badge>
              )}
              {epss && (
                <EPSSScoreBadge
                  score={epss.score}
                  percentile={epss.percentile}
                  showPercentile
                  size="sm"
                />
              )}
              {finding.cve && (
                <KEVIndicatorBadge
                  inKEV={!!kev}
                  kevData={
                    kev
                      ? {
                          date_added: kev.date_added,
                          due_date: kev.due_date,
                          ransomware_use: kev.known_ransomware_campaign_use,
                          notes: kev.notes,
                        }
                      : null
                  }
                  size="sm"
                />
              )}
            </div>

            {/* Status + Severity + Assignee */}
            <div className="flex items-center gap-1.5 text-sm flex-wrap">
              <StatusSelect
                value={status}
                onChange={handleStatusChange}
                loading={isUpdatingStatus}
              />
              <SeveritySelect
                value={severity}
                onChange={handleSeverityChange}
                loading={isUpdatingSeverity}
                cvss={finding.cvss}
                showIcon={false}
              />
              <AssigneeSelect
                value={
                  assignee
                    ? {
                        id: assignee.id,
                        name: assignee.name,
                        email: assignee.email,
                        role: assignee.role,
                      }
                    : null
                }
                onChange={(user) => {
                  if (user) {
                    handleAssigneeChange(user.id, user.name, user.email)
                  } else {
                    handleAssigneeChange(null)
                  }
                }}
                loading={isAssigning || isUnassigning}
                variant="ghost"
                showFullName
                placeholder="Assign"
              />
              {/* AI Triage Button - Mobile */}
              <AITriageButton
                findingId={finding.id}
                variant="ai"
                size="sm"
                onTriageCompleted={onTriageCompleted}
              />
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDate(finding.discoveredAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{SOURCE_LABELS[finding.source] || finding.source}</span>
                {finding.scanner && <span className="text-xs">({finding.scanner})</span>}
              </div>
            </div>

            {/* Repository */}
            {finding.assets.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Repo:</span>
                {finding.assets[0].url ? (
                  <a
                    href={
                      finding.assets[0].url.startsWith('http')
                        ? finding.assets[0].url
                        : `https://${finding.assets[0].url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:text-primary hover:underline flex items-center gap-1 truncate"
                  >
                    <span className="truncate max-w-[200px]">{finding.assets[0].url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="font-medium truncate">{finding.assets[0].name}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop: Full header (unchanged) */}
      <div className="hidden sm:block space-y-2">
        {/* Row 1: Classification badges (left) + Status badges (right) - 2 column grid */}
        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-sm">
          {/* Left: Classification badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source type badge - always show */}
            <Badge variant="outline" className="text-xs uppercase">
              {SOURCE_LABELS[finding.source] || finding.source}
            </Badge>
            {/* CVE if available */}
            {finding.cve && (
              <Badge variant="outline" className="text-xs">
                {finding.cve}
              </Badge>
            )}
            {/* CWE if available */}
            {finding.cwe && (
              <Badge variant="outline" className="text-xs">
                {finding.cwe}
              </Badge>
            )}
            {/* Vulnerability class badges - show if no CVE/CWE */}
            {!finding.cve &&
              !finding.cwe &&
              finding.vulnerabilityClass &&
              finding.vulnerabilityClass.slice(0, 2).map((cls) => (
                <Badge key={cls} variant="secondary" className="text-xs">
                  {cls}
                </Badge>
              ))}
            {/* EPSS Score Badge */}
            {epss && (
              <EPSSScoreBadge
                score={epss.score}
                percentile={epss.percentile}
                showPercentile
                size="sm"
              />
            )}
            {/* KEV Indicator Badge - only show if has CVE */}
            {finding.cve && (
              <KEVIndicatorBadge
                inKEV={!!kev}
                kevData={
                  kev
                    ? {
                        date_added: kev.date_added,
                        due_date: kev.due_date,
                        ransomware_use: kev.known_ransomware_campaign_use,
                        notes: kev.notes,
                      }
                    : null
                }
                size="sm"
              />
            )}
          </div>

          {/* Right: Status badges - align to end */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Triaged Badge */}
            {finding.isTriaged && (
              <Badge variant="outline" className="text-xs border-green-500/50 text-green-400 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Triaged
              </Badge>
            )}
            {/* SLA Status Badge */}
            {finding.slaStatus && finding.slaStatus !== 'not_applicable' && (
              <Badge
                variant="outline"
                className={`text-xs gap-1 ${
                  finding.slaStatus === 'breached'
                    ? 'border-red-500/50 text-red-400'
                    : finding.slaStatus === 'at_risk'
                      ? 'border-yellow-500/50 text-yellow-400'
                      : 'border-green-500/50 text-green-400'
                }`}
              >
                {finding.slaStatus === 'breached' ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                SLA:{' '}
                {finding.slaStatus === 'on_track'
                  ? 'On Track'
                  : finding.slaStatus === 'at_risk'
                    ? 'At Risk'
                    : 'Breached'}
              </Badge>
            )}
          </div>
        </div>

        {/* Row 2: Title */}
        <h1 className="text-xl font-bold leading-tight">{finding.title}</h1>

        {/* Row 3: Status + Severity + Meta (combined) */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {/* Status Select */}
          <StatusSelect value={status} onChange={handleStatusChange} loading={isUpdatingStatus} />

          {/* Severity Select */}
          <SeveritySelect
            value={severity}
            onChange={handleSeverityChange}
            loading={isUpdatingSeverity}
            cvss={finding.cvss}
          />

          {/* Divider */}
          <div className="h-4 w-px bg-border" />

          {/* Assignee Select with Search */}
          <AssigneeSelect
            value={
              assignee
                ? {
                    id: assignee.id,
                    name: assignee.name,
                    email: assignee.email,
                    role: assignee.role,
                  }
                : null
            }
            onChange={(user) => {
              if (user) {
                handleAssigneeChange(user.id, user.name, user.email)
              } else {
                handleAssigneeChange(null)
              }
            }}
            loading={isAssigning || isUnassigning}
            variant="ghost"
            showFullName
            placeholder="Unassigned"
          />

          {/* Divider */}
          <div className="h-4 w-px bg-border" />

          {/* AI Triage Button */}
          <AITriageButton
            findingId={finding.id}
            variant="ai"
            size="sm"
            onTriageCompleted={onTriageCompleted}
          />

          {/* Discovered Date - inline */}
          <div className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(finding.discoveredAt)}</span>
          </div>

          {/* Source - inline */}
          <div className="text-muted-foreground flex items-center gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{SOURCE_LABELS[finding.source] || finding.source}</span>
            {finding.scanner && <span className="text-xs">({finding.scanner})</span>}
          </div>
        </div>

        {/* Row 4: Primary Repository with full URL */}
        {finding.assets.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Repository:</span>
            {finding.assets[0].url ? (
              <a
                href={
                  finding.assets[0].url.startsWith('http')
                    ? finding.assets[0].url
                    : `https://${finding.assets[0].url}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary hover:underline flex items-center gap-1"
              >
                {finding.assets[0].url}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-medium">{finding.assets[0].name}</span>
            )}
            {finding.assets.length > 1 && (
              <Badge variant="outline" className="text-xs">
                +{finding.assets.length - 1} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
