'use client'

import { Play, Server, Database, Radar, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SensorType } from '@/lib/api/sensor-types'

interface SensorTypeIconProps {
  type: SensorType
  className?: string
}

// Sensor types: runner (CI/CD), worker (daemon), collector (assets), sensor (EASM)
const SENSOR_TYPE_ICONS: Record<SensorType, LucideIcon> = {
  runner: Play, // CI/CD one-shot execution
  worker: Server, // Long-running daemon
  collector: Database, // Asset discovery
  sensor: Radar, // EASM monitoring
}

export function SensorTypeIcon({ type, className }: SensorTypeIconProps) {
  const Icon = SENSOR_TYPE_ICONS[type] || Server
  return <Icon className={cn('h-4 w-4', className)} />
}

export const SENSOR_TYPE_COLORS: Record<SensorType, string> = {
  runner: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  worker: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  collector: 'bg-green-500/10 text-green-600 border-green-500/30',
  sensor: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
}

export const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  runner: 'Runner', // CI/CD pipeline runner
  worker: 'Worker', // Daemon worker
  collector: 'Collector', // Asset collector
  sensor: 'External (EASM)', // legacy type 'sensor': an EASM vantage point
}
