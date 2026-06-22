import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Icon shown above the title. */
  icon: LucideIcon
  /** Primary message (e.g. "No data available"). */
  title: string
  /** Optional secondary line explaining how to get data. */
  description?: string
  /** Optional action (e.g. a Button) rendered below the description. */
  action?: ReactNode
  /** Wrap in a Card (default true). Set false to drop into an existing Card. */
  card?: boolean
  className?: string
}

/**
 * Shared empty-state placeholder. Replaces the per-page `EmptyState`
 * components that were copy-pasted across ~19 files, so the "no data" look
 * stays consistent (icon + title + description, centered, muted) everywhere.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  card = true,
  className,
}: EmptyStateProps) {
  const body = (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center',
        card ? '' : className
      )}
    >
      <Icon className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )

  if (!card) return body

  return (
    <Card className={className}>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
