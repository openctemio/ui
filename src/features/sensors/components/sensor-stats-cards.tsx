'use client'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, CheckCircle, AlertCircle, Play, Server, Database } from 'lucide-react'
import type { Sensor, SensorType, ExecutionMode } from '@/lib/api/sensor-types'

interface SensorStats {
  total: number
  active: number // status === 'active'
  disabled: number // status === 'disabled' || status === 'revoked'
  online: number // health === 'online' (for active sensors)
  offline: number // health === 'offline' || health === 'unknown'
  error: number // health === 'error'
  byType: Record<SensorType, number>
  byMode: Record<ExecutionMode, number>
}

interface SensorStatsCardsProps {
  sensors: Sensor[]
  activeFilter: string | null
  onFilterChange: (filter: string | null) => void
}

function calculateSensorStats(sensors: Sensor[]): SensorStats {
  const activeSensors = sensors.filter((a) => a.status === 'active')

  return {
    total: sensors.length,
    active: activeSensors.length,
    disabled: sensors.filter((a) => a.status === 'disabled' || a.status === 'revoked').length,
    online: activeSensors.filter((a) => a.health === 'online').length,
    offline: activeSensors.filter((a) => a.health === 'offline' || a.health === 'unknown').length,
    error: sensors.filter((a) => a.health === 'error').length,
    byType: {
      runner: sensors.filter((a) => a.type === 'runner').length,
      worker: sensors.filter((a) => a.type === 'worker').length,
      collector: sensors.filter((a) => a.type === 'collector').length,
      sensor: sensors.filter((a) => a.type === 'sensor').length,
    },
    byMode: {
      standalone: sensors.filter((a) => a.execution_mode === 'standalone').length,
      daemon: sensors.filter((a) => a.execution_mode === 'daemon').length,
    },
  }
}

export function SensorStatsCards({ sensors, activeFilter, onFilterChange }: SensorStatsCardsProps) {
  const stats = calculateSensorStats(sensors)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {/* Total Sensors */}
      <Card
        className={`cursor-pointer transition-colors hover:border-primary ${
          activeFilter === null ? 'border-primary' : ''
        }`}
        onClick={() => onFilterChange(null)}
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Total
          </CardDescription>
          <CardTitle className="text-2xl">{stats.total}</CardTitle>
        </CardHeader>
      </Card>

      {/* Online */}
      <Card
        className={`cursor-pointer transition-colors hover:border-green-500 ${
          activeFilter === 'health:online' ? 'border-green-500' : ''
        }`}
        onClick={() => onFilterChange(activeFilter === 'health:online' ? null : 'health:online')}
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Online
          </CardDescription>
          <CardTitle className="text-2xl text-green-500">{stats.online}</CardTitle>
        </CardHeader>
      </Card>

      {/* Error */}
      <Card
        className={`cursor-pointer transition-colors hover:border-red-500 ${
          activeFilter === 'health:error' ? 'border-red-500' : ''
        }`}
        onClick={() => onFilterChange(activeFilter === 'health:error' ? null : 'health:error')}
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Error
          </CardDescription>
          <CardTitle className="text-2xl text-red-500">{stats.error}</CardTitle>
        </CardHeader>
      </Card>

      {/* Daemon Sensors */}
      <Card
        className={`cursor-pointer transition-colors hover:border-blue-500 ${
          activeFilter === 'mode:daemon' ? 'border-blue-500' : ''
        }`}
        onClick={() => onFilterChange(activeFilter === 'mode:daemon' ? null : 'mode:daemon')}
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            Daemon
          </CardDescription>
          <CardTitle className="text-2xl text-blue-500">{stats.byMode.daemon}</CardTitle>
        </CardHeader>
      </Card>

      {/* Standalone (CI/CD Runners) */}
      <Card
        className={`cursor-pointer transition-colors hover:border-purple-500 ${
          activeFilter === 'mode:standalone' ? 'border-purple-500' : ''
        }`}
        onClick={() =>
          onFilterChange(activeFilter === 'mode:standalone' ? null : 'mode:standalone')
        }
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Play className="h-4 w-4 text-purple-500" />
            CI/CD
          </CardDescription>
          <CardTitle className="text-2xl text-purple-500">{stats.byMode.standalone}</CardTitle>
        </CardHeader>
      </Card>

      {/* Collectors */}
      <Card
        className={`cursor-pointer transition-colors hover:border-orange-500 ${
          activeFilter === 'type:collector' ? 'border-orange-500' : ''
        }`}
        onClick={() => onFilterChange(activeFilter === 'type:collector' ? null : 'type:collector')}
      >
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-2">
            <Database className="h-4 w-4 text-orange-500" />
            Collectors
          </CardDescription>
          <CardTitle className="text-2xl text-orange-500">{stats.byType.collector}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}

/**
 * Compact stats for inline display
 */
export function SensorStatsInline({ sensors }: { sensors: Sensor[] }) {
  const stats = calculateSensorStats(sensors)

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{stats.total} sensors</span>
      <span className="text-green-500">{stats.online} online</span>
      {stats.error > 0 && <span className="text-red-500">{stats.error} error</span>}
    </div>
  )
}
