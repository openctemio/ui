'use client'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Package,
  type LucideIcon,
} from 'lucide-react'
import type { Asset } from '../../types'

export interface AssetsStatsCardsProps {
  assets: Asset[]
  isLoading?: boolean
  assetTypeName: string
  assetTypeIcon?: LucideIcon
  onFilterByStatus?: (status: string | null) => void
  currentStatusFilter?: string | null
}

interface StatCardProps {
  title: string
  value: number
  icon: LucideIcon
  iconColor?: string
  isActive?: boolean
  onClick?: () => void
  isLoading?: boolean
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  isActive,
  onClick,
  isLoading,
}: StatCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-colors hover:border-primary ${
        isActive ? 'border-primary bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
        </CardDescription>
        <CardTitle className="text-3xl">
          {isLoading ? <Skeleton className="h-9 w-16" /> : value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

export function AssetsStatsCards({
  assets,
  isLoading,
  assetTypeName,
  assetTypeIcon: AssetIcon = Package,
  onFilterByStatus,
  currentStatusFilter,
}: AssetsStatsCardsProps) {
  // Calculate stats
  const total = assets.length
  const active = assets.filter((a) => a.status === 'active').length
  const inactive = assets.filter((a) => a.status === 'inactive').length
  const withFindings = assets.filter((a) => a.findingCount > 0).length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={`Total ${assetTypeName}s`}
        value={total}
        icon={AssetIcon}
        isActive={currentStatusFilter === null}
        onClick={() => onFilterByStatus?.(null)}
        isLoading={isLoading}
      />
      <StatCard
        title="Active"
        value={active}
        icon={CheckCircle}
        iconColor="text-green-500"
        isActive={currentStatusFilter === 'active'}
        onClick={() => onFilterByStatus?.('active')}
        isLoading={isLoading}
      />
      <StatCard
        title="Inactive"
        value={inactive}
        icon={Activity}
        iconColor="text-gray-500"
        isActive={currentStatusFilter === 'inactive'}
        onClick={() => onFilterByStatus?.('inactive')}
        isLoading={isLoading}
      />
      <StatCard
        title="With Findings"
        value={withFindings}
        icon={AlertTriangle}
        iconColor="text-orange-500"
        isActive={currentStatusFilter === 'with_findings'}
        onClick={() => onFilterByStatus?.('with_findings')}
        isLoading={isLoading}
      />
    </div>
  )
}
