/**
 * Capability Badge Component
 *
 * A reusable badge component for displaying capability names with:
 * - Dynamic colors from capability metadata
 * - Optional icons from capability metadata
 * - Consistent styling across the application
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CapabilityBadge name="sast" />
 *
 * // With icon
 * <CapabilityBadge name="sast" showIcon />
 *
 * // Compact size for nodes/cards
 * <CapabilityBadge name="sast" size="sm" />
 *
 * // Multiple capabilities
 * {capabilities.map(cap => (
 *   <CapabilityBadge key={cap} name={cap} showIcon />
 * ))}
 * ```
 */

'use client'

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { useCapabilityMetadata } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Code,
  Package,
  Globe,
  Key,
  Server,
  Box,
  AlertTriangle,
  Search,
  Layers,
  Wifi,
  Radio,
  FileText,
  Cloud,
  Container,
  Zap,
  type LucideIcon,
} from 'lucide-react'

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  code: Code,
  package: Package,
  globe: Globe,
  'globe-2': Globe,
  key: Key,
  server: Server,
  box: Box,
  'alert-triangle': AlertTriangle,
  search: Search,
  layers: Layers,
  wifi: Wifi,
  radio: Radio,
  'file-text': FileText,
  'file-code': Code,
  cloud: Cloud,
  container: Container,
  zap: Zap,
  // Add spider alias (not in lucide, use search as fallback)
  spider: Search,
}

// Color class mappings for Tailwind - using specific color variants that are defined
const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  // Standard colors
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
  },
  green: {
    bg: 'bg-green-500/10',
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/30',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-500/30',
  },
  orange: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-500/30',
  },
  lime: {
    bg: 'bg-lime-500/10',
    text: 'text-lime-600 dark:text-lime-400',
    border: 'border-lime-500/30',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-500/30',
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
  violet: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-500/30',
  },
  fuchsia: {
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-500/30',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-500/30',
  },
  sky: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-500/30',
  },
  slate: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
  gray: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-500/30',
  },
}

// Default color for unknown capabilities
const DEFAULT_COLOR = COLOR_CLASSES.gray

interface CapabilityBadgeProps {
  /** The capability name (e.g., 'sast', 'sca', 'secrets') */
  name: string
  /** Whether to show the capability icon */
  showIcon?: boolean
  /** Size variant */
  size?: 'sm' | 'default'
  /** Additional class names */
  className?: string
}

function CapabilityBadgeComponent({
  name,
  showIcon = false,
  size = 'default',
  className,
}: CapabilityBadgeProps) {
  const { getDisplayName, getColor, getIcon } = useCapabilityMetadata()

  const displayName = getDisplayName(name)
  const color = getColor(name)
  const iconName = getIcon(name)

  // Get color classes
  const colorClasses = COLOR_CLASSES[color] || DEFAULT_COLOR

  // Get icon component
  const IconComponent = showIcon ? ICON_MAP[iconName] || Zap : null

  // Size-specific classes
  const sizeClasses = size === 'sm' ? 'text-[9px] px-1 py-0' : 'text-xs px-2 py-0.5'
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-normal',
        sizeClasses,
        colorClasses.bg,
        colorClasses.text,
        colorClasses.border,
        className
      )}
    >
      {IconComponent && <IconComponent className={cn(iconSize, 'shrink-0')} />}
      {displayName}
    </Badge>
  )
}

/**
 * Memoized capability badge component
 * Use this for rendering lists of capabilities to avoid unnecessary re-renders
 */
export const CapabilityBadge = memo(CapabilityBadgeComponent)

/**
 * Render a list of capability badges
 * Convenience wrapper for rendering multiple capabilities
 */
export function CapabilityBadgeList({
  capabilities,
  showIcon = false,
  size = 'default',
  className,
  maxVisible,
}: {
  capabilities: string[]
  showIcon?: boolean
  size?: 'sm' | 'default'
  className?: string
  /** Maximum number of visible badges (rest will show as "+N more") */
  maxVisible?: number
}) {
  if (!capabilities || capabilities.length === 0) {
    return null
  }

  const visibleCaps = maxVisible ? capabilities.slice(0, maxVisible) : capabilities
  const hiddenCount = maxVisible ? Math.max(0, capabilities.length - maxVisible) : 0

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleCaps.map((cap) => (
        <CapabilityBadge key={cap} name={cap} showIcon={showIcon} size={size} />
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="outline"
          className={cn(
            'font-normal',
            size === 'sm' ? 'text-[9px] px-1 py-0' : 'text-xs px-2 py-0.5',
            'bg-muted/50 text-muted-foreground border-muted-foreground/30'
          )}
        >
          +{hiddenCount} more
        </Badge>
      )}
    </div>
  )
}
