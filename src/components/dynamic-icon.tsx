'use client'

import { memo, useMemo } from 'react'
import { Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as Icons from 'lucide-react'

// Icon registry - static reference
const iconRegistry = Icons as unknown as Record<string, LucideIcon>

// Convert kebab-case to PascalCase
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

interface DynamicIconProps {
  name: string
  className?: string
  fallback?: LucideIcon
}

/**
 * Dynamic icon component that renders a Lucide icon by name.
 * Memoized to avoid creating components during render.
 */
export const DynamicIcon = memo(function DynamicIcon({
  name,
  className,
  fallback = Zap,
}: DynamicIconProps) {
  const IconComponent = useMemo(() => {
    const pascalName = toPascalCase(name)
    return iconRegistry[pascalName] || fallback
  }, [name, fallback])

  return <IconComponent className={className} />
})

/**
 * Get icon component from lucide-react by name.
 * Returns the component reference, not an element.
 */
export function getIconComponent(iconName: string): LucideIcon {
  const pascalName = toPascalCase(iconName)
  return iconRegistry[pascalName] || Zap
}
