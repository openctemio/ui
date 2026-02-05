'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Image as ImageIcon,
  Video,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Code,
  Paperclip,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  MapPin,
  Link2,
  FileImage,
  FileCode,
  ExternalLink,
  Copy,
  Github,
  GitBranch,
} from 'lucide-react'
import type { Evidence, EvidenceType, FindingDetail } from '../../types'
import { EVIDENCE_TYPE_CONFIG } from '../../types'
import { CodeHighlighter } from './code-highlighter'
import { buildRepositoryCodeUrl } from '../../lib/repository-url'

interface EvidenceTabProps {
  evidence: Evidence[]
  finding?: FindingDetail // Optional: for stack traces and related locations
}

const EVIDENCE_ICONS: Record<EvidenceType, React.ReactNode> = {
  screenshot: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  log: <FileText className="h-4 w-4" />,
  request: <ArrowUpRight className="h-4 w-4" />,
  response: <ArrowDownLeft className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  file: <Paperclip className="h-4 w-4" />,
}

// Repository Link Component
interface RepositoryLinkProps {
  repositoryUrl: string
  filePath: string
  startLine?: number
  endLine?: number
  branch?: string
  commitSha?: string
}

function RepositoryLink({
  repositoryUrl,
  filePath,
  startLine,
  endLine,
  branch,
  commitSha,
}: RepositoryLinkProps) {
  const link = buildRepositoryCodeUrl({
    repositoryUrl,
    filePath,
    startLine,
    endLine,
    branch,
    commitSha,
  })

  if (!link) return null

  // Detect provider from URL for icon
  const isGitHub = repositoryUrl.toLowerCase().includes('github')
  const isGitLab = repositoryUrl.toLowerCase().includes('gitlab')

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
      title="View in repository"
    >
      {isGitHub ? (
        <Github className="h-3 w-3" />
      ) : isGitLab ? (
        <GitBranch className="h-3 w-3" />
      ) : (
        <GitBranch className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">View source</span>
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  )
}

export function EvidenceTab({ evidence, finding }: EvidenceTabProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [expandedStacks, setExpandedStacks] = useState<Set<number>>(new Set())

  // Extract stacks, related locations, and attachments from finding
  const stacks = finding?.stacks || []
  const relatedLocations = finding?.relatedLocations || []
  const attachments = finding?.attachments || []

  const toggleStackExpand = (index: number) => {
    setExpandedStacks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const renderEvidenceContent = (item: Evidence) => {
    const isExpanded = expandedItems.has(item.id)

    switch (item.type) {
      case 'screenshot':
        return (
          <div className="bg-muted/30 rounded-lg border p-4">
            <div className="flex aspect-video items-center justify-center rounded bg-neutral-800/50">
              <ImageIcon className="text-muted-foreground h-12 w-12" />
              <span className="text-muted-foreground ml-2 text-sm">[Screenshot Preview]</span>
            </div>
          </div>
        )

      case 'video':
        return (
          <div className="bg-muted/30 rounded-lg border p-4">
            <div className="flex aspect-video items-center justify-center rounded bg-neutral-800/50">
              <Video className="text-muted-foreground h-12 w-12" />
              <span className="text-muted-foreground ml-2 text-sm">[Video Preview]</span>
            </div>
          </div>
        )

      case 'request':
      case 'response':
      case 'log':
      case 'code':
        const lines = item.content.split('\n')
        const displayContent = isExpanded ? item.content : lines.slice(0, 8).join('\n')
        const hasMore = lines.length > 8

        return (
          <div className="space-y-2">
            <div className="bg-[#1e1e2e] rounded-lg overflow-hidden border border-slate-700/50">
              {/* Header with copy button */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/30">
                <span className="text-xs text-slate-400 font-mono">{item.title}</span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(item.content)
                    } catch {
                      // Ignore
                    }
                  }}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded"
                  title="Copy code"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {/* Code content */}
              <ScrollArea className="p-3 max-h-[300px]">
                <CodeHighlighter
                  code={displayContent}
                  className="bg-transparent"
                  showLineNumbers={true}
                />
                {!isExpanded && hasMore && (
                  <p className="text-muted-foreground text-xs mt-2">
                    ... ({lines.length - 8} more lines)
                  </p>
                )}
              </ScrollArea>
            </div>
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => toggleExpand(item.id)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="mr-1 h-3 w-3" /> Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-3 w-3" /> Show All {lines.length} Lines
                  </>
                )}
              </Button>
            )}
          </div>
        )

      case 'file':
        return (
          <div className="bg-muted/30 flex items-center gap-3 rounded-lg border p-4">
            <Paperclip className="text-muted-foreground h-8 w-8" />
            <div>
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground text-xs">{item.mimeType}</p>
            </div>
          </div>
        )

      default:
        return (
          <div className="bg-muted/30 rounded-lg border p-4">
            <p className="text-muted-foreground text-sm">{item.content}</p>
          </div>
        )
    }
  }

  // Build repository code URL for "Affected Code" link
  const repositoryCodeUrl = buildRepositoryCodeUrl({
    repositoryUrl: finding?.repositoryUrl || finding?.assets?.[0]?.url,
    filePath: finding?.filePath,
    startLine: finding?.startLine,
    endLine: finding?.endLine,
    branch: finding?.branch,
    commitSha: finding?.commitSha,
  })

  // Check if there's any content to show
  // Only show context snippet (not vulnerable code snippet to avoid duplication)
  const hasAffectedCode = !!finding?.filePath
  const hasContextSnippet = !!finding?.contextSnippet
  const hasCodeSnippets = hasContextSnippet
  const hasEvidence = evidence.length > 0
  const hasStacks = stacks.length > 0
  const hasRelatedLocations = relatedLocations.length > 0
  const hasAttachments = attachments.length > 0
  const hasAnyContent =
    hasAffectedCode ||
    hasCodeSnippets ||
    hasEvidence ||
    hasStacks ||
    hasRelatedLocations ||
    hasAttachments

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Paperclip className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-semibold">No Evidence</h3>
        <p className="text-muted-foreground mb-4 text-center text-sm">
          No evidence has been attached to this finding yet.
        </p>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Evidence
        </Button>
      </div>
    )
  }

  // Calculate line numbers for context snippet
  const contextStartLine = finding?.contextStartLine || 1

  return (
    <div className="space-y-6">
      {/* Affected Code - File location with repository link */}
      {hasAffectedCode && finding?.filePath && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <Code className="h-4 w-4" />
            Affected Code
          </h3>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                {repositoryCodeUrl ? (
                  <a
                    href={repositoryCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-blue-400 hover:text-blue-300 hover:underline break-all inline-flex items-center gap-1"
                  >
                    {finding.filePath}
                    {finding.startLine && (
                      <span className="text-muted-foreground">
                        :{finding.startLine}
                        {finding.endLine &&
                          finding.endLine !== finding.startLine &&
                          `-${finding.endLine}`}
                      </span>
                    )}
                    <ExternalLink className="h-3 w-3 shrink-0 ml-1" />
                  </a>
                ) : (
                  <p className="text-sm font-mono text-slate-300 break-all">
                    {finding.filePath}
                    {finding.startLine && (
                      <span className="text-muted-foreground">
                        :{finding.startLine}
                        {finding.endLine &&
                          finding.endLine !== finding.startLine &&
                          `-${finding.endLine}`}
                      </span>
                    )}
                  </p>
                )}
                {finding.assets?.[0]?.name && (
                  <p className="text-muted-foreground text-xs mt-1">in {finding.assets[0].name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Snippets Section - Show both context and snippet */}
      {hasCodeSnippets && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Code className="h-4 w-4" />
            Code Context
          </h3>

          {/* Context Snippet - Surrounding code (±3 lines) */}
          {hasContextSnippet && finding?.contextSnippet && (
            <div>
              <p className="text-muted-foreground text-xs mb-2">Context (surrounding code)</p>
              <div className="bg-[#1e1e2e] rounded-lg overflow-hidden border border-slate-700/50">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700/30">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-slate-400 font-mono truncate">
                      {finding?.filePath || 'code'}
                      {contextStartLine &&
                        ` (lines ${contextStartLine}-${contextStartLine + (finding.contextSnippet.split('\n').length - 1)})`}
                    </span>
                    {/* Repository Link */}
                    {finding?.repositoryUrl && finding?.filePath && (
                      <RepositoryLink
                        repositoryUrl={finding.repositoryUrl}
                        filePath={finding.filePath}
                        startLine={finding.startLine}
                        endLine={finding.endLine}
                        branch={finding.branch}
                        commitSha={finding.commitSha}
                      />
                    )}
                  </div>
                </div>
                <div className="p-3 overflow-x-auto">
                  <CodeHighlighter
                    code={finding.contextSnippet}
                    filePath={finding?.filePath}
                    className="bg-transparent"
                    showLineNumbers={true}
                    startLine={contextStartLine}
                    highlightLine={finding?.startLine}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Items */}
      {hasEvidence && (
        <>
          {hasCodeSnippets && <Separator />}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <Paperclip className="h-4 w-4" />
                Evidence ({evidence.length})
              </h3>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Evidence
              </Button>
            </div>

            <div className="space-y-4">
              {evidence.map((item) => {
                const typeConfig = EVIDENCE_TYPE_CONFIG[item.type]

                return (
                  <div key={item.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                          {EVIDENCE_ICONS[item.type]}
                        </div>
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-xs">
                              {typeConfig.label}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(item.createdBy.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground text-xs">{item.createdBy.name}</span>
                      </div>
                    </div>
                    {renderEvidenceContent(item)}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Stack Traces */}
      {hasStacks && (
        <>
          {(hasCodeSnippets || hasEvidence) && <Separator />}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Layers className="h-4 w-4" />
              Stack Traces ({stacks.length})
            </h3>

            <div className="space-y-3">
              {stacks.map((stack, stackIndex) => {
                const isExpanded = expandedStacks.has(stackIndex)
                const frames = stack.frames || []
                const displayFrames = isExpanded ? frames : frames.slice(0, 3)
                const hasMoreFrames = frames.length > 3

                return (
                  <div key={stackIndex} className="rounded-lg border">
                    {stack.message && (
                      <div className="border-b bg-muted/30 px-4 py-2">
                        <p className="text-sm font-medium">{stack.message}</p>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="space-y-2">
                        {displayFrames.map((frame, frameIndex) => (
                          <div
                            key={frameIndex}
                            className="flex items-start gap-2 text-sm font-mono"
                          >
                            <span className="text-muted-foreground w-6 text-right">
                              {frameIndex + 1}.
                            </span>
                            <div className="flex-1 min-w-0">
                              {frame.location?.path && (
                                <span className="text-blue-400 break-all">
                                  {frame.location.path}
                                  {frame.location.start_line && (
                                    <span className="text-muted-foreground">
                                      :{frame.location.start_line}
                                      {frame.location.start_column &&
                                        `:${frame.location.start_column}`}
                                    </span>
                                  )}
                                </span>
                              )}
                              {frame.module && (
                                <span className="text-muted-foreground ml-2">({frame.module})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasMoreFrames && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 w-full text-xs"
                          onClick={() => toggleStackExpand(stackIndex)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="mr-1 h-3 w-3" /> Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="mr-1 h-3 w-3" /> Show All {frames.length}{' '}
                              Frames
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Related Locations */}
      {hasRelatedLocations && (
        <>
          {(hasCodeSnippets || hasEvidence || hasStacks) && <Separator />}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4" />
              Related Locations ({relatedLocations.length})
            </h3>

            <div className="space-y-3">
              {relatedLocations.map((loc, index) => {
                const locSnippet = loc.context_snippet || loc.snippet
                return (
                  <div key={loc.id || index} className="rounded-lg border overflow-hidden">
                    <div className="flex items-start gap-3 p-3 bg-muted/30">
                      <div className="bg-muted flex h-6 w-6 items-center justify-center rounded text-xs font-mono">
                        {loc.id || index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {loc.path ? (
                          <p className="text-sm font-mono text-blue-400 break-all">
                            {loc.path}
                            {loc.start_line && (
                              <span className="text-muted-foreground">
                                :{loc.start_line}
                                {loc.start_column && `:${loc.start_column}`}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p className="text-sm font-mono text-muted-foreground">
                            Location {index + 1}
                          </p>
                        )}
                        {loc.message && (
                          <p className="text-muted-foreground text-sm mt-1">{loc.message}</p>
                        )}
                      </div>
                    </div>
                    {locSnippet && (
                      <div className="bg-[#1e1e2e] p-3 border-t border-slate-700/30">
                        <CodeHighlighter
                          code={locSnippet}
                          filePath={loc.path}
                          className="bg-transparent"
                          showLineNumbers={true}
                          startLine={loc.start_line || 1}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Attachments */}
      {hasAttachments && (
        <>
          {(hasCodeSnippets || hasEvidence || hasStacks || hasRelatedLocations) && <Separator />}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Link2 className="h-4 w-4" />
              Attachments ({attachments.length})
            </h3>

            <div className="space-y-2">
              {attachments.map((attachment, index) => {
                const uri = attachment.artifact_location?.uri
                const isExternal = uri?.startsWith('http://') || uri?.startsWith('https://')

                // Get icon based on attachment type
                const getAttachmentIcon = () => {
                  switch (attachment.type) {
                    case 'screenshot':
                      return <FileImage className="h-4 w-4" />
                    case 'code':
                      return <FileCode className="h-4 w-4" />
                    case 'document':
                      return <FileText className="h-4 w-4" />
                    case 'reference':
                    case 'evidence':
                      return <ExternalLink className="h-4 w-4" />
                    default:
                      return <Paperclip className="h-4 w-4" />
                  }
                }

                // Get type label
                const getTypeLabel = () => {
                  switch (attachment.type) {
                    case 'evidence':
                      return 'Evidence'
                    case 'screenshot':
                      return 'Screenshot'
                    case 'document':
                      return 'Document'
                    case 'reference':
                      return 'Reference'
                    case 'code':
                      return 'Code'
                    default:
                      return 'Attachment'
                  }
                }

                return (
                  <div key={index} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded">
                        {getAttachmentIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel()}
                          </Badge>
                        </div>
                        {attachment.description && (
                          <p className="text-sm mt-1">{attachment.description}</p>
                        )}
                        {uri && (
                          <div className="mt-2">
                            {isExternal ? (
                              <a
                                href={uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-400 hover:underline break-all inline-flex items-center gap-1"
                              >
                                {uri}
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              </a>
                            ) : (
                              <p className="text-sm font-mono text-muted-foreground break-all">
                                {uri}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
