'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FindingDetail } from '../../../types'

interface DastPanelProps {
  finding: FindingDetail
}

export function DastPanel({ finding }: DastPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const meta = finding.metadata || {}

  const endpoint = (meta.endpoint as string) || (meta.url as string) || ''
  const method = (meta.method as string) || (meta.http_method as string) || ''
  const parameter = (meta.parameter as string) || (meta.param as string) || ''
  const request = (meta.request as string) || (meta.http_request as string) || ''
  const response = (meta.response as string) || (meta.http_response as string) || ''

  // If no useful DAST data, don't render
  if (!endpoint && !request && !response) return null

  const methodColor =
    method.toUpperCase() === 'GET'
      ? 'text-green-400'
      : method.toUpperCase() === 'POST'
        ? 'text-blue-400'
        : method.toUpperCase() === 'PUT'
          ? 'text-yellow-400'
          : method.toUpperCase() === 'DELETE'
            ? 'text-red-400'
            : 'text-muted-foreground'

  return (
    <Card className="mx-6 mt-3 border-cyan-500/30 bg-cyan-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-cyan-400">Dynamic Analysis Finding</span>
        </div>

        {/* Endpoint */}
        {(endpoint || method) && (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              {method && (
                <Badge variant="outline" className={cn('text-xs font-mono', methodColor)}>
                  {method.toUpperCase()}
                </Badge>
              )}
              {endpoint && <span className="text-sm font-mono">{endpoint}</span>}
            </div>
            {parameter && (
              <div className="text-xs text-muted-foreground mt-1">
                Parameter: <code className="bg-muted/50 px-1 rounded">{parameter}</code>
              </div>
            )}
          </div>
        )}

        {/* Request / Response split pane */}
        {(request || response) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {request && (
                <div className="rounded border border-border/50 bg-muted/20 p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Request</div>
                  <pre
                    className={cn(
                      'text-xs font-mono whitespace-pre-wrap overflow-hidden',
                      !expanded && 'max-h-24'
                    )}
                  >
                    {request}
                  </pre>
                </div>
              )}
              {response && (
                <div className="rounded border border-border/50 bg-muted/20 p-2">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Response</div>
                  <pre
                    className={cn(
                      'text-xs font-mono whitespace-pre-wrap overflow-hidden',
                      !expanded && 'max-h-24'
                    )}
                  >
                    {response}
                  </pre>
                </div>
              )}
            </div>
            {(request.length > 200 || response.length > 200) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-6 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" /> Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" /> Expand
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
