'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, Search, Bug, CheckCircle, Timer, BarChart3, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { useAgentSessionStats, useActiveAgentSession } from '@/lib/api/agent-hooks'

interface AgentAnalyticsProps {
  agentId: string
  showActiveSession?: boolean
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export function AgentAnalytics({ agentId, showActiveSession = true }: AgentAnalyticsProps) {
  // Get session stats for the last 30 days
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString()
  }, [])

  const { data: sessionStats, isLoading: statsLoading } = useAgentSessionStats(agentId, {
    started_at: thirtyDaysAgo,
  })

  const { data: activeSession, isLoading: sessionLoading } = useActiveAgentSession(
    showActiveSession ? agentId : null
  )

  const isLoading = statsLoading || sessionLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!sessionStats) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No analytics data available</p>
        <p className="text-sm text-muted-foreground">
          Analytics will appear once the agent starts processing jobs
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Active Session Badge */}
      {activeSession && showActiveSession && (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="flex items-center gap-1 bg-green-500">
            <Activity className="h-3 w-3" />
            Active Session
          </Badge>
          <span className="text-xs text-muted-foreground">
            Started {formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: true })}
          </span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <Activity className="mx-auto mb-2 h-5 w-5 text-blue-500" />
          <p className="text-2xl font-bold">{sessionStats.total_sessions}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Search className="mx-auto mb-2 h-5 w-5 text-purple-500" />
          <p className="text-2xl font-bold">{sessionStats.total_scans}</p>
          <p className="text-xs text-muted-foreground">Scans</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Bug className="mx-auto mb-2 h-5 w-5 text-amber-500" />
          <p className="text-2xl font-bold">{sessionStats.total_findings}</p>
          <p className="text-xs text-muted-foreground">Findings</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <CheckCircle className="mx-auto mb-2 h-5 w-5 text-green-500" />
          <p className="text-2xl font-bold">{sessionStats.total_jobs}</p>
          <p className="text-xs text-muted-foreground">Jobs Completed</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Timer className="mx-auto mb-2 h-5 w-5 text-cyan-500" />
          <p className="text-2xl font-bold">{formatUptime(sessionStats.total_online_seconds)}</p>
          <p className="text-xs text-muted-foreground">Total Uptime</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Clock className="mx-auto mb-2 h-5 w-5 text-indigo-500" />
          <p className="text-2xl font-bold">
            {formatUptime(sessionStats.average_session_time_seconds)}
          </p>
          <p className="text-xs text-muted-foreground">Avg Session</p>
        </div>
      </div>

      {/* Active Session Details */}
      {activeSession && showActiveSession && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">Current Session</p>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Findings: </span>
              <span className="font-medium">{activeSession.findings_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Scans: </span>
              <span className="font-medium">{activeSession.scans_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Jobs: </span>
              <span className="font-medium">{activeSession.jobs_completed}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Errors: </span>
              <span className="font-medium">{activeSession.errors_count}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
