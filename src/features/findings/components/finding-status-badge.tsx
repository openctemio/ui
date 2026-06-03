'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CircleDot,
  CheckCircle2,
  Loader2,
  Wrench,
  CheckSquare,
  XCircle,
  AlertTriangle,
  Copy,
  FileEdit,
  Eye,
  RotateCw,
  ShieldCheck,
  Circle,
  type LucideIcon,
} from 'lucide-react'
import type { FindingStatus, StatusConfig } from '../types'
import { FINDING_STATUS_CONFIG } from '../types'

// Neutral fallback for a status this UI build doesn't recognize (backend /
// source drift — e.g. a legacy or newer status value). Renders the raw status
// instead of crashing on `config.icon`.
const UNKNOWN_STATUS_CONFIG: StatusConfig = {
  label: 'Unknown',
  color: '',
  bgColor: 'bg-muted',
  textColor: 'text-muted-foreground',
  icon: 'circle',
  category: 'open',
}

interface FindingStatusBadgeProps {
  status: FindingStatus
  className?: string
  variant?: 'default' | 'outline'
}

/**
 * Maps the kebab-case icon name each status declares in FINDING_STATUS_CONFIG
 * to its lucide component. The config already names an icon per status; this
 * renders it so status is distinguishable by shape, not color alone (a11y —
 * the previous badge was color-only and unreadable to colorblind users).
 */
const STATUS_ICONS: Record<string, LucideIcon> = {
  'circle-dot': CircleDot,
  'check-circle': CheckCircle2,
  loader: Loader2,
  wrench: Wrench,
  'check-square': CheckSquare,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  copy: Copy,
  'file-edit': FileEdit,
  eye: Eye,
  'rotate-cw': RotateCw,
  'shield-check': ShieldCheck,
}

export function FindingStatusBadge({
  status,
  className,
  variant = 'default',
}: FindingStatusBadgeProps) {
  const config =
    (FINDING_STATUS_CONFIG as Record<string, StatusConfig | undefined>)[status] ?? {
      ...UNKNOWN_STATUS_CONFIG,
      label: String(status) || UNKNOWN_STATUS_CONFIG.label,
    }
  const Icon = STATUS_ICONS[config.icon] ?? Circle
  // Only the in-progress spinner should animate.
  const spin = config.icon === 'loader'

  if (variant === 'outline') {
    return (
      <Badge variant="outline" className={cn('gap-1.5', className)}>
        <Icon className={cn('h-3 w-3', config.textColor, spin && 'animate-spin')} />
        {config.label}
      </Badge>
    )
  }

  return (
    <Badge className={cn('gap-1 border-0', config.bgColor, config.textColor, className)}>
      <Icon className={cn('h-3 w-3', spin && 'animate-spin')} />
      {config.label}
    </Badge>
  )
}
