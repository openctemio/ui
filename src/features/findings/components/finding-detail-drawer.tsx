'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ExternalLink,
  FileText,
  Wrench,
  AlertTriangle,
  Server,
  Eye,
  Send,
  Copy,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Route,
  LogIn,
  ArrowRight,
} from 'lucide-react'
import {
  DATA_FLOW_LOCATION_CONFIG,
  SEVERITY_CONFIG,
  FINDING_STATUS_CONFIG,
  requiresApproval,
} from '../types'
import { CodeHighlighter } from './detail/code-highlighter'
import type {
  Finding,
  FindingStatus,
  FindingUser,
  DataFlowLocation,
  DataFlowLocationType,
} from '../types'
import type { Severity } from '@/features/shared/types'
import {
  useUpdateFindingStatusApi,
  useUpdateFindingSeverityApi,
  useAssignFindingApi,
  useUnassignFindingApi,
  invalidateFindingsCache,
} from '../api/use-findings-api'
import { AssigneeSelect } from './assignee-select'
import { StatusSelect } from './status-select'
import { SeveritySelect } from './severity-select'
import { useTenant } from '@/context/tenant-provider'
import { useMembers } from '@/features/organization/api/use-members'

// Compact data flow location for drawer preview
function DataFlowLocationCompact({
  location,
  type,
}: {
  location: DataFlowLocation
  type: DataFlowLocationType
}) {
  const config = DATA_FLOW_LOCATION_CONFIG[type]
  const Icon = type === 'source' ? LogIn : type === 'sink' ? AlertTriangle : ArrowRight

  return (
    <div className="flex items-start gap-2">
      <div
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
      >
        <Icon className={`h-3 w-3 ${config.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge className={`text-[10px] px-1.5 py-0 ${config.bgColor} ${config.color} border-0`}>
            {config.label}
          </Badge>
          {location.label && (
            <code className="text-muted-foreground text-[10px] bg-muted px-1 rounded truncate max-w-[100px]">
              {location.label}
            </code>
          )}
        </div>
        {location.path && (
          <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
            {location.path}
            {location.line && `:${location.line}`}
          </p>
        )}
      </div>
    </div>
  )
}

// Skeleton component for loading state
function DrawerSkeleton() {
  return (
    <div className="flex w-full flex-col p-0">
      {/* Header Skeleton */}
      <div className="space-y-3 border-b px-4 sm:px-6 py-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="flex items-center gap-2 border-b px-3 sm:px-6 py-3 bg-muted/30">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 space-y-5 p-6">
        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>

        <Separator />

        {/* Assets */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>

        <Separator />

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  )
}

interface FindingDetailDrawerProps {
  finding: Finding | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Show skeleton loading state */
  isLoading?: boolean
  onStatusChange?: (findingId: string, status: FindingStatus) => void
  onSeverityChange?: (findingId: string, severity: Severity) => void
  onAssigneeChange?: (findingId: string, assignee: FindingUser | null) => void
  onAddComment?: (findingId: string, comment: string) => void
}

export function FindingDetailDrawer({
  finding,
  open,
  onOpenChange,
  isLoading = false,
  onStatusChange,
  onSeverityChange,
  onAssigneeChange,
  onAddComment,
}: FindingDetailDrawerProps) {
  const router = useRouter()
  const { currentTenant } = useTenant()
  const [status, setStatus] = useState<FindingStatus | null>(null)
  const [severity, setSeverity] = useState<Severity | null>(null)
  const [assignee, setAssignee] = useState<FindingUser | null | undefined>(undefined)
  const [comment, setComment] = useState('')
  const [showCommentInput, setShowCommentInput] = useState(false)

  // Check if we need to fetch assignee info (name is empty but id exists)
  const needsAssigneeFetch = open && finding?.assignee?.id && !finding?.assignee?.name

  // Fetch members to get assignee info if needed
  const { members: fetchedMembers } = useMembers(
    needsAssigneeFetch ? currentTenant?.id : undefined,
    { limit: 100 } // Fetch more to find the assigned user
  )

  // Find the assigned user from fetched members
  const enrichedAssignee =
    needsAssigneeFetch && finding?.assignee?.id
      ? fetchedMembers.find((m) => m.user_id === finding.assignee?.id)
      : null

  // API mutation hooks
  const { trigger: updateStatus, isMutating: isUpdatingStatus } = useUpdateFindingStatusApi(
    finding?.id || ''
  )
  const { trigger: updateSeverity, isMutating: isUpdatingSeverity } = useUpdateFindingSeverityApi(
    finding?.id || ''
  )
  const { trigger: assignUser, isMutating: isAssigning } = useAssignFindingApi(finding?.id || '')
  const { trigger: unassignUser, isMutating: isUnassigning } = useUnassignFindingApi(
    finding?.id || ''
  )

  // Reset local state when finding changes (drawer opens with new finding)
  useEffect(() => {
    if (finding) {
      setStatus(null)
      setSeverity(null)
      setAssignee(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only reset on finding.id change, not other fields
  }, [finding?.id])

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle when drawer is open and not in input/textarea
      if (!open || !finding) return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // Cmd/Ctrl + Enter: View full details
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        onOpenChange(false)
        router.push(`/findings/${finding.id}`)
      }
      // Cmd/Ctrl + C: Toggle comment input
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !e.shiftKey) {
        // Only if no text is selected (don't interfere with copy)
        if (!window.getSelection()?.toString()) {
          e.preventDefault()
          setShowCommentInput((prev) => !prev)
        }
      }
      // Escape: Close drawer (handled by Sheet, but ensure comment input closes first)
      if (e.key === 'Escape' && showCommentInput) {
        e.preventDefault()
        e.stopPropagation()
        setShowCommentInput(false)
        setComment('')
      }
    },
    [open, finding, router, onOpenChange, showCommentInput]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!finding) return null

  // Use local state if changed, otherwise use finding value
  const currentStatus = status ?? finding.status
  const currentSeverity = severity ?? finding.severity

  // For assignee: use local state > enriched data from API > finding data
  const baseAssignee = assignee !== undefined ? assignee : finding.assignee
  const currentAssignee =
    baseAssignee && enrichedAssignee && !baseAssignee.name
      ? {
          ...baseAssignee,
          name: enrichedAssignee.name || '',
          email: enrichedAssignee.email || '',
        }
      : baseAssignee

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleStatusChange = async (newStatus: FindingStatus, skipUndo = false) => {
    // Skip if selecting the same status
    if (newStatus === currentStatus) {
      return
    }

    // Check if status requires approval
    if (requiresApproval(newStatus)) {
      toast.info(
        `${FINDING_STATUS_CONFIG[newStatus].label} requires approval. Feature coming soon.`
      )
      return
    }

    const previousStatus = currentStatus
    // Optimistic update
    setStatus(newStatus)

    try {
      await updateStatus({
        status: newStatus,
        resolution: newStatus === 'resolved' ? 'Resolved via UI' : undefined,
      })
      onStatusChange?.(finding.id, newStatus)
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
    if (newSeverity === currentSeverity) {
      return
    }

    const previousSeverity = currentSeverity
    // Optimistic update
    setSeverity(newSeverity)

    try {
      await updateSeverity({ severity: newSeverity })
      onSeverityChange?.(finding.id, newSeverity)
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

  const handleAssigneeChange = async (user: FindingUser | null, skipUndo = false) => {
    const previousAssignee = currentAssignee

    // Skip if selecting the same assignee
    if (user?.id === currentAssignee?.id) {
      return
    }

    // Optimistic update
    setAssignee(user)

    try {
      if (user) {
        await assignUser({ user_id: user.id })
        toast.success(
          `Assigned to ${user.name}`,
          skipUndo
            ? { duration: 3000 }
            : {
                action: {
                  label: 'Undo',
                  onClick: () => handleAssigneeChange(previousAssignee ?? null, true),
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
                  onClick: () => handleAssigneeChange(previousAssignee ?? null, true),
                },
                duration: 5000,
              }
        )
      }
      onAssigneeChange?.(finding.id, user)
      await invalidateFindingsCache()
    } catch (error) {
      // Revert on error
      setAssignee(previousAssignee)
      toast.error(getErrorMessage(error, user ? 'Failed to assign' : 'Failed to unassign'))
      console.error('Assignee update error:', error)
    }
  }

  const handleAddComment = () => {
    if (!comment.trim()) return
    onAddComment?.(finding.id, comment)
    setComment('')
    setShowCommentInput(false)
  }

  const handleViewDetails = () => {
    onOpenChange(false)
    router.push(`/findings/${finding.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col p-0 sm:max-w-xl"
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus on mobile to avoid keyboard popup
          e.preventDefault()
        }}
      >
        {/* Loading State */}
        {isLoading && <DrawerSkeleton />}

        {/* Content - only show when not loading and finding exists */}
        {!isLoading && finding && (
          <>
            {/* Header */}
            <SheetHeader className="relative space-y-3 border-b px-4 sm:px-6 py-4 text-left">
              {/* More Actions - positioned at top right, next to close button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-12 top-4 h-8 w-8 p-0"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(finding.id)
                      toast.success('Finding ID copied to clipboard')
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Finding ID
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(
                        window.location.origin + `/findings/${finding.id}`
                      )
                      toast.success('Finding URL copied to clipboard')
                    }}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Copy Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Title */}
              <SheetTitle className="text-lg leading-snug pr-16">{finding.title}</SheetTitle>

              {/* CVE/CWE badges */}
              {(finding.cve || finding.cwe) && (
                <div className="flex flex-wrap gap-2">
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
                </div>
              )}

              <SheetDescription className="sr-only">
                Quick view and actions for finding
              </SheetDescription>
            </SheetHeader>

            {/* Quick Actions Bar - no longer needs ml-auto for "..." button */}
            <div className="flex items-center gap-1.5 sm:gap-2 border-b px-3 sm:px-6 py-3 bg-muted/30">
              {/* Status Select */}
              <StatusSelect
                value={currentStatus}
                onChange={handleStatusChange}
                loading={isUpdatingStatus}
                showCheck
              />

              {/* Severity Select */}
              <SeveritySelect
                value={currentSeverity}
                onChange={handleSeverityChange}
                loading={isUpdatingSeverity}
                showCheck
              />

              {/* Assignee Select with Search */}
              <AssigneeSelect
                value={
                  currentAssignee
                    ? {
                        id: currentAssignee.id,
                        name: currentAssignee.name,
                        email: currentAssignee.email,
                        role: currentAssignee.role,
                      }
                    : null
                }
                onChange={(user) => {
                  if (user) {
                    handleAssigneeChange({
                      id: user.id,
                      name: user.name,
                      email: user.email || '',
                      role: (user.role as FindingUser['role']) || 'analyst',
                    })
                  } else {
                    handleAssigneeChange(null)
                  }
                }}
                loading={isAssigning || isUnassigning}
              />
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 p-6">
                {/* Description */}
                <div className="space-y-2">
                  <h4 className="flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" />
                    Description
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {finding.description}
                  </p>
                </div>

                {/* Code Evidence - show if evidence exists or filePath exists */}
                {(finding.evidence.length > 0 || finding.filePath) && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-sm font-semibold">
                          <Eye className="h-4 w-4" />
                          Code Evidence
                        </h4>
                        {finding.evidence.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {finding.evidence.length}
                          </Badge>
                        )}
                      </div>

                      {/* File path and line info */}
                      {finding.filePath && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md font-mono">
                          <span className="truncate">{finding.filePath}</span>
                          {finding.startLine && (
                            <span className="shrink-0 text-foreground/70">
                              :{finding.startLine}
                              {finding.endLine &&
                                finding.endLine !== finding.startLine &&
                                `-${finding.endLine}`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Code snippets with syntax highlighting */}
                      <div className="space-y-2">
                        {finding.evidence.slice(0, 2).map((ev) => (
                          <div key={ev.id} className="rounded-md border overflow-hidden group">
                            <div className="bg-muted/50 px-3 py-1.5 border-b flex items-center justify-between">
                              <span className="text-xs font-medium truncate">{ev.title}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 min-h-[32px] min-w-[32px]"
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const textToCopy = ev.content || ''
                                    if (!textToCopy) {
                                      toast.error('No code content to copy')
                                      return
                                    }
                                    try {
                                      await navigator.clipboard.writeText(textToCopy)
                                      toast.success('Code copied to clipboard')
                                    } catch {
                                      // Fallback for non-HTTPS or older browsers
                                      const textArea = document.createElement('textarea')
                                      textArea.value = textToCopy
                                      textArea.style.position = 'fixed'
                                      textArea.style.left = '-999999px'
                                      document.body.appendChild(textArea)
                                      textArea.select()
                                      try {
                                        document.execCommand('copy')
                                        toast.success('Code copied to clipboard')
                                      } catch {
                                        toast.error('Failed to copy code')
                                      }
                                      document.body.removeChild(textArea)
                                    }
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {ev.type}
                                </span>
                              </div>
                            </div>
                            <div className="p-3 bg-muted/20 max-h-40 overflow-y-auto">
                              <CodeHighlighter
                                code={ev.content}
                                filePath={finding.filePath}
                                showLineNumbers={!!finding.startLine}
                                startLine={finding.startLine || 1}
                                highlightLine={finding.startLine}
                              />
                            </div>
                          </div>
                        ))}
                        {finding.evidence.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs h-7"
                            onClick={handleViewDetails}
                          >
                            +{finding.evidence.length - 2} more evidence
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Affected Assets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <Server className="h-4 w-4" />
                      Affected Assets
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {finding.assets.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {finding.assets.slice(0, 3).map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between rounded-lg border p-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-xs capitalize shrink-0">
                            {asset.type}
                          </Badge>
                          <span className="text-sm truncate">{asset.name}</span>
                        </div>
                        {asset.criticality && (
                          <Badge
                            className={`text-xs shrink-0 ${SEVERITY_CONFIG[asset.criticality].bgColor} ${SEVERITY_CONFIG[asset.criticality].textColor} border-0`}
                          >
                            {asset.criticality}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {finding.assets.length > 3 && (
                      <Button variant="ghost" size="sm" className="w-full text-xs h-7">
                        +{finding.assets.length - 3} more assets
                      </Button>
                    )}
                  </div>
                </div>

                {/* Attack Path / Data Flow */}
                {finding.dataFlow &&
                  ((finding.dataFlow.sources?.length ?? 0) > 0 ||
                    (finding.dataFlow.intermediates?.length ?? 0) > 0 ||
                    (finding.dataFlow.sinks?.length ?? 0) > 0) && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="flex items-center gap-2 text-sm font-semibold">
                            <Route className="h-4 w-4" />
                            Attack Path
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {(finding.dataFlow.sources?.length ?? 0) +
                              (finding.dataFlow.intermediates?.length ?? 0) +
                              (finding.dataFlow.sinks?.length ?? 0)}{' '}
                            steps
                          </Badge>
                        </div>

                        {/* Compact flow visualization */}
                        <div className="space-y-2">
                          {/* Sources */}
                          {finding.dataFlow.sources?.map((loc, idx) => (
                            <DataFlowLocationCompact
                              key={`source-${idx}`}
                              location={loc}
                              type="source"
                            />
                          ))}

                          {/* Intermediates - show max 2 */}
                          {finding.dataFlow.intermediates?.slice(0, 2).map((loc, idx) => (
                            <DataFlowLocationCompact
                              key={`intermediate-${idx}`}
                              location={loc}
                              type="intermediate"
                            />
                          ))}
                          {(finding.dataFlow.intermediates?.length ?? 0) > 2 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                              <ArrowRight className="h-3 w-3" />+
                              {(finding.dataFlow.intermediates?.length ?? 0) - 2} more steps
                            </div>
                          )}

                          {/* Sinks */}
                          {finding.dataFlow.sinks?.map((loc, idx) => (
                            <DataFlowLocationCompact
                              key={`sink-${idx}`}
                              location={loc}
                              type="sink"
                            />
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-7"
                          onClick={handleViewDetails}
                        >
                          View Full Attack Path
                        </Button>
                      </div>
                    </>
                  )}

                <Separator />

                {/* Remediation Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <Wrench className="h-4 w-4" />
                      Remediation
                    </h4>
                    <span className="text-sm font-semibold">{finding.remediation.progress}%</span>
                  </div>
                  <Progress value={finding.remediation.progress} className="h-2" />
                  <p className="text-muted-foreground text-xs line-clamp-2">
                    {finding.remediation.description}
                  </p>
                  {finding.remediation.deadline && (
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-muted-foreground">
                        Due: {formatDate(finding.remediation.deadline)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {finding.tags && finding.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Tags</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {finding.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Meta Info - 2x2 grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground text-xs">CVSS Score</p>
                    <p className="text-sm font-semibold font-mono">
                      {finding.cvss !== undefined ? finding.cvss : '-'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground text-xs">Source</p>
                    <p className="text-sm capitalize">{finding.source}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground text-xs">Discovered</p>
                    <p className="text-sm">{formatDate(finding.discoveredAt)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground text-xs">Last Updated</p>
                    <p className="text-sm">{formatDate(finding.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Quick Comment & View Details */}
            <div className="flex-shrink-0 border-t">
              {/* Quick Comment */}
              {showCommentInput ? (
                <div className="p-4 space-y-2 border-b">
                  <Textarea
                    placeholder="Add a quick comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCommentInput(false)
                        setComment('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleAddComment} disabled={!comment.trim()}>
                      <Send className="mr-1.5 h-3 w-3" />
                      Send
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCommentInput(true)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Add a comment...
                  </Button>
                </div>
              )}

              {/* View Details Button */}
              <div className="p-4">
                <Button className="w-full" onClick={handleViewDetails}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Details
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
