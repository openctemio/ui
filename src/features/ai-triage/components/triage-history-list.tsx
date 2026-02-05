'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, ChevronDown, ChevronUp, Clock, Bot } from 'lucide-react'
import { TriageStatusBadge } from './triage-status-badge'
import { TriageResultCard } from './triage-result-card'
import { useTriageHistory } from '../api'
import type { AITriageResult } from '../types'

interface TriageHistoryListProps {
  findingId: string
  limit?: number
  className?: string
}

export function TriageHistoryList({ findingId, limit = 10, className }: TriageHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data, isLoading, error } = useTriageHistory(findingId, { limit })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Triage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Triage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load triage history.</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Triage History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No triage history yet. Run AI Triage to analyze this finding.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Triage History
          </CardTitle>
          <span className="text-sm text-muted-foreground">{data.total} total</span>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {data.data.map((result: AITriageResult) => (
              <div key={result.id} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full p-3 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => toggleExpand(result.id)}
                >
                  <TriageStatusBadge status={result.status} />
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(result.createdAt)}
                  </div>
                  {result.severityAssessment && (
                    <span className="text-sm font-medium capitalize">
                      {result.severityAssessment}
                    </span>
                  )}
                  {result.riskScore !== undefined && (
                    <span className="text-sm text-muted-foreground">Risk: {result.riskScore}</span>
                  )}
                  <div className="ml-auto">
                    {expandedId === result.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {expandedId === result.id && (
                  <div className="border-t p-3 bg-muted/20">
                    <TriageResultCard result={result} className="border-0 shadow-none" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
