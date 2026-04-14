'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, TrendingDown, TrendingUp } from 'lucide-react'
import { useMTTRMetrics, useRiskVelocity } from '../hooks/use-dashboard-stats'
import { useTenant } from '@/context/tenant-provider'

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

export function MTTRCard() {
  const { currentTenant } = useTenant()
  const { data: mttr } = useMTTRMetrics(currentTenant?.id ?? null)

  if (!mttr) return null

  const criticalMTTR = mttr.critical ?? 0
  const highMTTR = mttr.high ?? 0
  const avgAll =
    Object.values(mttr).length > 0
      ? Object.values(mttr).reduce((sum, v) => sum + v, 0) / Object.values(mttr).length
      : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Mean Time to Remediate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatHours(avgAll)}</div>
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          <span>
            Critical: <span className="font-medium text-red-500">{formatHours(criticalMTTR)}</span>
          </span>
          <span>
            High: <span className="font-medium text-orange-500">{formatHours(highMTTR)}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export function RiskVelocityCard() {
  const { currentTenant } = useTenant()
  const { data: velocity } = useRiskVelocity(currentTenant?.id ?? null, 4)

  if (!velocity || velocity.length === 0) return null

  const latest = velocity[velocity.length - 1]
  const isImproving = latest.velocity <= 0
  const Icon = isImproving ? TrendingDown : TrendingUp

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${isImproving ? 'text-green-500' : 'text-red-500'}`} />
          Risk Velocity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isImproving ? 'text-green-600' : 'text-red-600'}`}>
          {latest.velocity > 0 ? '+' : ''}
          {latest.velocity}
        </div>
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          <span>New: {latest.new_count}/wk</span>
          <span>Resolved: {latest.resolved_count}/wk</span>
        </div>
      </CardContent>
    </Card>
  )
}
