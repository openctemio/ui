/**
 * Platform Usage Card Component
 *
 * Displays platform agent quota usage for the current tenant.
 * Shows monthly job quota and current usage.
 */

'use client'

import { Cloud, TrendingUp, Clock, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

interface PlatformUsageData {
  // Quota
  monthlyJobLimit: number // -1 for unlimited
  jobsUsedThisMonth: number

  // Stats
  averageQueueTime: number // in seconds
  jobsCompletedThisMonth: number
  jobsFailedThisMonth: number

  // Period
  periodStart: string
  periodEnd: string
}

interface PlatformUsageCardProps {
  /**
   * Platform usage data
   */
  data?: PlatformUsageData

  /**
   * Callback when upgrade is clicked
   */
  onUpgrade?: () => void

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Visual variant
   */
  variant?: 'default' | 'compact'
}

// ============================================
// MOCK DATA (to be replaced with API call)
// ============================================

const mockUsageData: PlatformUsageData = {
  monthlyJobLimit: 100,
  jobsUsedThisMonth: 67,
  averageQueueTime: 45, // seconds
  jobsCompletedThisMonth: 62,
  jobsFailedThisMonth: 5,
  periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
  periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
}

// ============================================
// HELPERS
// ============================================

function formatQueueTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

function getStatusColor(percentage: number): string {
  if (percentage >= 100) return 'destructive'
  if (percentage >= 80) return 'warning'
  return 'default'
}

// ============================================
// COMPONENT
// ============================================

export function PlatformUsageCard({
  data = mockUsageData,
  onUpgrade,
  className,
  variant = 'default',
}: PlatformUsageCardProps) {
  const isUnlimited = data.monthlyJobLimit === -1
  const percentage = isUnlimited
    ? 0
    : Math.min((data.jobsUsedThisMonth / data.monthlyJobLimit) * 100, 100)
  const status = getStatusColor(percentage)
  const remaining = isUnlimited ? -1 : Math.max(data.monthlyJobLimit - data.jobsUsedThisMonth, 0)
  const isAtLimit = !isUnlimited && data.jobsUsedThisMonth >= data.monthlyJobLimit
  const successRate =
    data.jobsUsedThisMonth > 0
      ? Math.round((data.jobsCompletedThisMonth / data.jobsUsedThisMonth) * 100)
      : 100

  // Compact variant for stats card row
  if (variant === 'compact') {
    return (
      <Card className={cn('cursor-pointer hover:border-purple-500 transition-colors', className)}>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-purple-500" />
            Platform Jobs
          </CardDescription>
          <CardTitle className="text-3xl text-purple-500">
            {isUnlimited ? (
              <span>{data.jobsUsedThisMonth}</span>
            ) : (
              <span>
                {data.jobsUsedThisMonth}
                <span className="text-lg text-muted-foreground">/{data.monthlyJobLimit}</span>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        {!isUnlimited && (
          <CardContent className="pt-0">
            <Progress
              value={percentage}
              className={cn(
                'h-1.5',
                status === 'destructive' && '[&>div]:bg-red-500',
                status === 'warning' && '[&>div]:bg-yellow-500',
                status === 'default' && '[&>div]:bg-purple-500'
              )}
            />
          </CardContent>
        )}
      </Card>
    )
  }

  // Default variant - full display
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Cloud className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base">Platform Agent Usage</CardTitle>
              <CardDescription>Monthly job quota</CardDescription>
            </div>
          </div>
          {isAtLimit && onUpgrade && (
            <Button size="sm" variant="outline" onClick={onUpgrade}>
              <TrendingUp className="h-4 w-4 mr-1" />
              Upgrade
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Jobs Used</span>
            <span
              className={cn(
                'text-sm font-medium',
                status === 'destructive' && 'text-red-500',
                status === 'warning' && 'text-yellow-500'
              )}
            >
              {data.jobsUsedThisMonth}
              {!isUnlimited && (
                <span className="text-muted-foreground"> / {data.monthlyJobLimit}</span>
              )}
              {isUnlimited && <span className="text-muted-foreground"> (Unlimited)</span>}
            </span>
          </div>
          {!isUnlimited && (
            <Progress
              value={percentage}
              className={cn(
                'h-2',
                status === 'destructive' && '[&>div]:bg-red-500',
                status === 'warning' && '[&>div]:bg-yellow-500',
                status === 'default' && '[&>div]:bg-purple-500'
              )}
            />
          )}
          {!isUnlimited && (
            <p className="text-xs text-muted-foreground">
              {isAtLimit ? (
                <span className="text-red-500">
                  Quota exhausted. Upgrade for more platform jobs.
                </span>
              ) : (
                <span>{remaining} jobs remaining this month</span>
              )}
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-semibold">{formatQueueTime(data.averageQueueTime)}</p>
                <p className="text-xs text-muted-foreground">Avg Queue</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>Average time waiting in queue</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <p className="text-lg font-semibold">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {data.jobsCompletedThisMonth} completed, {data.jobsFailedThisMonth} failed
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border p-3 text-center">
                <Badge variant="outline" className="mb-1 text-purple-500 border-purple-500">
                  {isUnlimited ? 'Unlimited' : `${remaining} left`}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Quota</p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isUnlimited
                ? 'Unlimited platform jobs on your plan'
                : `${remaining} jobs remaining until ${new Date(data.periodEnd).toLocaleDateString()}`}
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// EXPORTS
// ============================================

export type { PlatformUsageCardProps, PlatformUsageData }
export default PlatformUsageCard
