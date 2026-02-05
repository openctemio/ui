'use client'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  LogIn,
  ArrowRight,
  AlertTriangle,
  Shield,
  FileCode,
  ChevronDown,
  ChevronRight,
  Info,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { useState } from 'react'
import type { FindingDetail, DataFlow, DataFlowLocation, DataFlowLocationType } from '../../types'
import { DATA_FLOW_LOCATION_CONFIG } from '../../types'
import { cn } from '@/lib/utils'
import { CodeHighlighter } from './code-highlighter'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface DataFlowTabProps {
  finding: FindingDetail
}

// Icon mapping for location types
const LocationIcon = ({ type }: { type: DataFlowLocationType }) => {
  switch (type) {
    case 'source':
      return <LogIn className="h-4 w-4" />
    case 'intermediate':
      return <ArrowRight className="h-4 w-4" />
    case 'sink':
      return <AlertTriangle className="h-4 w-4" />
    case 'sanitizer':
      return <Shield className="h-4 w-4" />
    default:
      return <ArrowRight className="h-4 w-4" />
  }
}

// Copy to clipboard helper
function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return { copied, copy }
}

// Single location card in the flow
function DataFlowLocationCard({
  location,
  type,
  index,
  isLast,
}: {
  location: DataFlowLocation
  type: DataFlowLocationType
  index: number
  isLast: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const config = DATA_FLOW_LOCATION_CONFIG[type]
  const { copied, copy } = useCopyToClipboard()

  // Build file location string for copying
  const fileLocation = location.path
    ? `${location.path}${location.line ? `:${location.line}` : ''}${location.column ? `:${location.column}` : ''}`
    : ''

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && <div className="absolute left-6 top-14 h-[calc(100%-3.5rem)] w-0.5 bg-border" />}

      <div className="flex gap-3">
        {/* Step indicator */}
        <div
          className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2',
            config.bgColor,
            type === 'source'
              ? 'border-blue-500'
              : type === 'sink'
                ? 'border-red-500'
                : type === 'sanitizer'
                  ? 'border-green-500'
                  : 'border-yellow-500'
          )}
        >
          <LocationIcon type={type} />
        </div>

        {/* Content card */}
        <div className="flex-1 mb-4">
          <div
            className={cn(
              'w-full rounded-lg border transition-colors',
              type === 'source'
                ? 'border-blue-500/30'
                : type === 'sink'
                  ? 'border-red-500/30'
                  : type === 'sanitizer'
                    ? 'border-green-500/30'
                    : 'border-yellow-500/30'
            )}
          >
            {/* Header - clickable */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full p-4 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', config.bgColor, config.color, 'border-0')}>
                    Step {index + 1}: {config.label}
                  </Badge>
                  {location.label && (
                    <code className="text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded">
                      {location.label}
                    </code>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* File location */}
              {location.path && (
                <div className="flex items-center gap-2 text-sm">
                  <FileCode className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="font-mono text-blue-400 truncate">{location.path}</span>
                  {location.line && (
                    <span className="text-muted-foreground font-mono">:{location.line}</span>
                  )}
                  {location.column && (
                    <span className="text-muted-foreground font-mono">:{location.column}</span>
                  )}
                </div>
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {/* Code snippet with syntax highlighting */}
                {location.content && (
                  <div className="relative group">
                    <div className="bg-[#1e1e2e] rounded-md overflow-hidden border border-slate-700/50">
                      {/* Code header */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 border-b border-slate-700/50">
                        <span className="text-xs text-slate-400 font-mono">
                          {location.path?.split('/').pop() || 'code'}
                          {location.line && `:${location.line}`}
                        </span>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copy(location.content || '')
                                }}
                              >
                                {copied ? (
                                  <Check className="h-3 w-3 text-green-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {copied ? 'Copied!' : 'Copy code'}
                            </TooltipContent>
                          </Tooltip>
                          {fileLocation && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copy(fileLocation)
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Copy file path</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      {/* Code content with syntax highlighting */}
                      <div className="p-3">
                        <CodeHighlighter
                          code={location.content}
                          filePath={location.path}
                          className="bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Function/class context */}
                {(location.functionName || location.className) && (
                  <div className="flex flex-wrap gap-3 text-xs">
                    {location.functionName && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-slate-500">Function:</span>
                        <code className="text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                          {location.functionName}
                        </code>
                      </div>
                    )}
                    {location.className && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-slate-500">Class:</span>
                        <code className="text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          {location.className}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main visualization component
function DataFlowVisualization({ dataFlow }: { dataFlow: DataFlow }) {
  // Flatten all locations with their types
  const allLocations: Array<{ location: DataFlowLocation; type: DataFlowLocationType }> = []

  // Add sources
  dataFlow.sources?.forEach((loc, idx) => {
    allLocations.push({ location: { ...loc, index: idx }, type: 'source' })
  })

  // Add intermediates
  dataFlow.intermediates?.forEach((loc, idx) => {
    allLocations.push({
      location: { ...loc, index: (dataFlow.sources?.length || 0) + idx },
      type: 'intermediate',
    })
  })

  // Add sinks
  dataFlow.sinks?.forEach((loc, idx) => {
    allLocations.push({
      location: {
        ...loc,
        index: (dataFlow.sources?.length || 0) + (dataFlow.intermediates?.length || 0) + idx,
      },
      type: 'sink',
    })
  })

  if (allLocations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Info className="mr-2 h-4 w-4" />
        No data flow information available
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {allLocations.map((item, index) => (
        <DataFlowLocationCard
          key={`${item.type}-${index}`}
          location={item.location}
          type={item.type}
          index={index}
          isLast={index === allLocations.length - 1}
        />
      ))}
    </div>
  )
}

// Summary statistics
function DataFlowSummary({ dataFlow }: { dataFlow: DataFlow }) {
  const sourceCount = dataFlow.sources?.length || 0
  const intermediateCount = dataFlow.intermediates?.length || 0
  const sinkCount = dataFlow.sinks?.length || 0
  const totalSteps = sourceCount + intermediateCount + sinkCount

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">Sources</p>
        <p className="text-2xl font-bold text-blue-400">{sourceCount}</p>
      </div>
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">Propagation Steps</p>
        <p className="text-2xl font-bold text-yellow-400">{intermediateCount}</p>
      </div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">Sinks</p>
        <p className="text-2xl font-bold text-red-400">{sinkCount}</p>
      </div>
      <div className="bg-muted/50 border rounded-lg p-3">
        <p className="text-xs text-muted-foreground mb-1">Total Steps</p>
        <p className="text-2xl font-bold">{totalSteps}</p>
      </div>
    </div>
  )
}

export function DataFlowTab({ finding }: DataFlowTabProps) {
  const dataFlow = finding.dataFlow

  if (!dataFlow) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ArrowRight className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Attack Path Data</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          This finding doesn&apos;t have data flow (taint tracking) information. Data flow analysis
          shows how untrusted data travels from source to sink, helping you understand the attack
          path.
        </p>
        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-left text-sm max-w-md">
          <p className="font-medium mb-2">To enable data flow tracking:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              Run Semgrep with{' '}
              <code className="text-xs bg-muted px-1 rounded">--dataflow-traces</code>
            </li>
            <li>Use CodeQL path queries</li>
            <li>Enable taint tracking in your scanner</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header explanation */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Attack Path Analysis</h3>
            <p className="text-muted-foreground text-sm">
              This diagram shows how untrusted data flows through your code from the entry point
              (source) to where the vulnerability is triggered (sink). Use this to identify the best
              place to add validation or sanitization.
            </p>
          </div>
        </div>
      </div>

      {/* Summary statistics */}
      <DataFlowSummary dataFlow={dataFlow} />

      <Separator />

      {/* Main visualization */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Data Flow Path</h3>
        <DataFlowVisualization dataFlow={dataFlow} />
      </div>

      <Separator />

      {/* Remediation guidance */}
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-400" />
          Remediation Guidance
        </h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Best practice:</strong> Add validation or
            sanitization as close to the source as possible.
          </p>
          <p>
            <strong className="text-foreground">Options:</strong>
          </p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>
              <strong>At source:</strong> Validate input immediately when received
            </li>
            <li>
              <strong>Before sink:</strong> Use parameterized queries, escaping, or encoding
            </li>
            <li>
              <strong>Add sanitizer:</strong> Transform data to safe format before use
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
