'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownPreview } from '@/components/ui/markdown-editor'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  PlusCircle,
  MessageSquare,
  ArrowRightLeft,
  Gauge,
  UserPlus,
  UserMinus,
  Lock,
  FilePlus,
  Wrench,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Link,
  Copy,
  XCircle,
  Bot,
  Paperclip,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { Activity, ActivityType } from '../../types'
import { ACTIVITY_TYPE_CONFIG, FINDING_STATUS_CONFIG, SEVERITY_CONFIG } from '../../types'
import type { Severity } from '@/features/shared/types'

interface ActivityPanelProps {
  activities: Activity[]
  onAddComment?: (comment: string, isInternal: boolean) => void
  // Pagination props
  total?: number
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
}

const ACTIVITY_ICONS: Record<ActivityType, React.ReactNode> = {
  created: <PlusCircle className="h-4 w-4" />,
  ai_triage: <Bot className="h-4 w-4" />,
  ai_triage_requested: <Bot className="h-4 w-4" />,
  ai_triage_failed: <AlertTriangle className="h-4 w-4" />,
  status_changed: <ArrowRightLeft className="h-4 w-4" />,
  severity_changed: <Gauge className="h-4 w-4" />,
  assigned: <UserPlus className="h-4 w-4" />,
  unassigned: <UserMinus className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
  internal_note: <Lock className="h-4 w-4" />,
  evidence_added: <FilePlus className="h-4 w-4" />,
  remediation_started: <Wrench className="h-4 w-4" />,
  remediation_updated: <RefreshCw className="h-4 w-4" />,
  verified: <ShieldCheck className="h-4 w-4" />,
  reopened: <RotateCcw className="h-4 w-4" />,
  linked: <Link className="h-4 w-4" />,
  duplicate_marked: <Copy className="h-4 w-4" />,
  false_positive_marked: <XCircle className="h-4 w-4" />,
}

export function ActivityPanel({
  activities,
  onAddComment,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ActivityPanelProps) {
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  // Character limit for comment truncation (display)
  const COMMENT_TRUNCATE_LENGTH = 200
  // Character limit for comment input (API validation)
  // 10000 chars allows detailed technical discussions with code snippets
  const MAX_COMMENT_LENGTH = 10000

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const toggleReplies = (activityId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }

  const toggleCommentExpand = (activityId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }

  // Truncate text with ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    // Find last space before maxLength to avoid cutting words
    const lastSpace = text.lastIndexOf(' ', maxLength)
    const cutoff = lastSpace > maxLength * 0.7 ? lastSpace : maxLength
    return text.slice(0, cutoff) + '...'
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getActorName = (actor: Activity['actor']) => {
    if (actor === 'system') return 'System'
    if (actor === 'ai') return 'AI Assistant'
    return actor.name
  }

  const getActorInitials = (actor: Activity['actor']) => {
    if (actor === 'system') return 'SYS'
    if (actor === 'ai') return 'AI'
    return actor.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmitComment = () => {
    if (!comment.trim()) return
    onAddComment?.(comment, isInternal)
    setComment('')
  }

  const renderActivityContent = (activity: Activity) => {
    const config = ACTIVITY_TYPE_CONFIG[activity.type]

    switch (activity.type) {
      case 'status_changed':
        const prevStatus = activity.previousValue
          ? FINDING_STATUS_CONFIG[activity.previousValue as keyof typeof FINDING_STATUS_CONFIG]
          : null
        const newStatus = activity.newValue
          ? FINDING_STATUS_CONFIG[activity.newValue as keyof typeof FINDING_STATUS_CONFIG]
          : null

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span>Changed status from</span>
              {prevStatus && (
                <Badge className={`${prevStatus.bgColor} ${prevStatus.textColor} border-0 text-xs`}>
                  {prevStatus.label}
                </Badge>
              )}
              <span>to</span>
              {newStatus && (
                <Badge className={`${newStatus.bgColor} ${newStatus.textColor} border-0 text-xs`}>
                  {newStatus.label}
                </Badge>
              )}
            </div>
            {activity.content && (
              <p className="text-muted-foreground text-sm">{activity.content}</p>
            )}
          </div>
        )

      case 'severity_changed':
        const prevSeverity = activity.previousValue
          ? SEVERITY_CONFIG[activity.previousValue as Severity]
          : null
        const newSeverity = activity.newValue
          ? SEVERITY_CONFIG[activity.newValue as Severity]
          : null

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span>Changed severity from</span>
              {prevSeverity && (
                <Badge
                  className={`${prevSeverity.bgColor} ${prevSeverity.textColor} border-0 text-xs`}
                >
                  {prevSeverity.label}
                </Badge>
              )}
              <span>to</span>
              {newSeverity && (
                <Badge
                  className={`${newSeverity.bgColor} ${newSeverity.textColor} border-0 text-xs`}
                >
                  {newSeverity.label}
                </Badge>
              )}
            </div>
            {activity.reason && <p className="text-muted-foreground text-sm">{activity.reason}</p>}
          </div>
        )

      case 'ai_triage_requested':
        // User requested AI triage - just show who requested it
        // The actual result (success/failure) is shown by subsequent ai_triage or ai_triage_failed activity
        return (
          <p className="text-sm text-muted-foreground">
            Requested AI-assisted triage for this finding.
          </p>
        )

      case 'ai_triage':
        // AI triage data is in activity.metadata (from changes JSONB)
        const aiMeta = activity.metadata as Record<string, unknown> | undefined
        const severity = aiMeta?.severity as string | undefined
        const riskScore = aiMeta?.risk_score as number | undefined
        const riskLevel = aiMeta?.ai_risk_level as string | undefined
        const confidence = aiMeta?.ai_confidence as string | undefined
        const priorityRank = aiMeta?.priority_rank as number | undefined
        const recommendation = aiMeta?.ai_recommendation as string | undefined

        const getSeverityColor = (sev: string) => {
          const lower = sev?.toLowerCase()
          if (lower === 'critical') return 'border-red-500/50 text-red-400'
          if (lower === 'high') return 'border-orange-500/50 text-orange-400'
          if (lower === 'medium') return 'border-yellow-500/50 text-yellow-400'
          return 'border-green-500/50 text-green-400'
        }

        return (
          <div className="bg-purple-500/10 space-y-3 rounded-lg border border-purple-500/20 p-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-400">AI Analysis Complete</span>
            </div>
            {recommendation && <p className="text-sm leading-relaxed">{recommendation}</p>}
            <div className="flex flex-wrap gap-2 text-xs">
              {severity && (
                <Badge variant="outline" className={getSeverityColor(severity)}>
                  Severity: {severity}
                </Badge>
              )}
              {riskScore !== undefined && (
                <Badge variant="outline">Risk Score: {riskScore}/100</Badge>
              )}
              {priorityRank !== undefined && (
                <Badge variant="outline">Priority: {priorityRank}/100</Badge>
              )}
              {confidence && <Badge variant="outline">Confidence: {confidence}</Badge>}
            </div>
          </div>
        )

      case 'ai_triage_failed':
        // AI triage failed - show error state
        const failedMeta = activity.metadata as Record<string, unknown> | undefined
        const errorMessage = failedMeta?.error_message as string | undefined

        return (
          <div className="bg-red-500/10 space-y-2 rounded-lg border border-red-500/20 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">AI Analysis Failed</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {errorMessage || 'The AI triage process encountered an error. Please try again.'}
            </p>
          </div>
        )

      case 'comment':
      case 'internal_note':
        const showReplies = expandedReplies.has(activity.id)
        const hasReplies = activity.replies && activity.replies.length > 0
        const isCommentExpanded = expandedComments.has(activity.id)
        const commentContent = activity.content || ''
        // Check if content is long OR was already truncated by backend (ends with "...")
        const wasBackendTruncated = commentContent.endsWith('...')
        const isLongComment = commentContent.length > COMMENT_TRUNCATE_LENGTH || wasBackendTruncated
        const displayContent =
          isLongComment && !isCommentExpanded
            ? wasBackendTruncated
              ? commentContent
              : truncateText(commentContent, COMMENT_TRUNCATE_LENGTH)
            : commentContent

        return (
          <div className="space-y-3">
            <div
              className={`rounded-lg p-3 ${activity.type === 'internal_note' ? 'border border-amber-500/20 bg-amber-500/10' : 'bg-muted/50'}`}
            >
              {activity.type === 'internal_note' && (
                <div className="mb-2 flex items-center gap-1 text-xs text-amber-400">
                  <Lock className="h-3 w-3" />
                  Internal Note
                </div>
              )}
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none [&_pre]:text-xs [&_code]:text-xs [&_p]:my-1">
                <MarkdownPreview content={displayContent} />
              </div>
              {isLongComment && !wasBackendTruncated && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={() => toggleCommentExpand(activity.id)}
                >
                  {isCommentExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3 w-3" />
                      Show more
                    </>
                  )}
                </Button>
              )}
              {wasBackendTruncated && (
                <span className="text-xs text-muted-foreground italic">(Content truncated)</span>
              )}

              {/* Attachments */}
              {activity.attachments && activity.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activity.attachments.map((att) => (
                    <Badge key={att.id} variant="secondary" className="cursor-pointer gap-1">
                      <Paperclip className="h-3 w-3" />
                      {att.filename}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {activity.reactions && activity.reactions.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {activity.reactions.map((reaction, idx) => (
                    <TooltipProvider key={idx}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="cursor-pointer gap-1 text-xs">
                            {reaction.emoji} {reaction.count}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {reaction.users.map((u) => u.name).join(', ') ||
                              `${reaction.count} reactions`}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              )}
            </div>

            {/* Replies */}
            {hasReplies && (
              <div className="pl-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => toggleReplies(activity.id)}
                >
                  {showReplies ? (
                    <ChevronUp className="mr-1 h-3 w-3" />
                  ) : (
                    <ChevronDown className="mr-1 h-3 w-3" />
                  )}
                  {activity.replies!.length} repl
                  {activity.replies!.length === 1 ? 'y' : 'ies'}
                </Button>

                {showReplies && (
                  <div className="mt-2 space-y-2 border-l-2 border-muted pl-3">
                    {activity.replies!.map((reply) => (
                      <div key={reply.id} className="bg-muted/30 rounded p-2">
                        <div className="mb-1 flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {getActorInitials(reply.actor)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{getActorName(reply.actor)}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatTimeAgo(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'assigned':
        return (
          <div className="text-sm">
            <span>Assigned to </span>
            <span className="font-medium">
              {(activity.metadata?.assigneeName as string) || activity.content}
            </span>
          </div>
        )

      case 'evidence_added':
        const evidenceType = activity.metadata?.evidenceType as string | undefined
        return (
          <div className="text-sm">
            <span>{activity.content}</span>
            {evidenceType && (
              <Badge variant="outline" className="ml-2 text-xs">
                {evidenceType}
              </Badge>
            )}
          </div>
        )

      case 'created':
        const scanName = activity.metadata?.scanName as string | undefined
        return (
          <div className="space-y-1 text-sm">
            <p>{activity.content}</p>
            {scanName && (
              <Badge variant="secondary" className="text-xs">
                {scanName}
              </Badge>
            )}
          </div>
        )

      default:
        return <p className="text-sm">{activity.content || config.label}</p>
    }
  }

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Activity Timeline - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-2 p-2">
          {sortedActivities.map((activity) => {
            const config = ACTIVITY_TYPE_CONFIG[activity.type]

            return (
              <div key={activity.id} className="flex gap-2">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback
                      className={`text-xs ${activity.actor === 'ai' ? 'bg-purple-500/20 text-purple-400' : activity.actor === 'system' ? 'bg-blue-500/20 text-blue-400' : ''}`}
                    >
                      {getActorInitials(activity.actor)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium">{getActorName(activity.actor)}</span>
                    <div className={`flex items-center gap-0.5 ${config.color}`}>
                      {ACTIVITY_ICONS[activity.type]}
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatTimeAgo(activity.createdAt)}
                    </span>
                  </div>
                  {renderActivityContent(activity)}
                </div>
              </div>
            )
          })}

          {/* Load More Button */}
          {hasMore && onLoadMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full h-6 text-xs"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Load More
                </>
              )}
            </Button>
          )}

          {/* Empty state */}
          {sortedActivities.length === 0 && (
            <div className="text-center text-muted-foreground text-xs py-4">No activities yet</div>
          )}
        </div>
      </div>

      {/* Comment Input - Fixed at bottom */}
      <div className="flex-shrink-0 border-t p-2">
        <Textarea
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          className="min-h-[60px] max-h-[120px] resize-none text-sm mb-1.5"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
              <Paperclip className="h-3 w-3" />
            </Button>
            <Button
              variant={isInternal ? 'secondary' : 'ghost'}
              size="sm"
              className="h-5 gap-0.5 px-1 text-[10px]"
              onClick={() => setIsInternal(!isInternal)}
            >
              <Lock className="h-2.5 w-2.5" />
              Internal
            </Button>
            {/* Character counter - show when approaching limit */}
            {comment.length > MAX_COMMENT_LENGTH * 0.8 && (
              <span
                className={`text-[10px] ${comment.length >= MAX_COMMENT_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}
              >
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="h-6 text-xs"
            onClick={handleSubmitComment}
            disabled={!comment.trim() || comment.length > MAX_COMMENT_LENGTH}
          >
            <Send className="mr-1 h-3 w-3" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
