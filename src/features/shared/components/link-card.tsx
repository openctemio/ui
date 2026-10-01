'use client'

import type { ElementType, ReactNode } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface LinkCardProps {
  href: string
  icon: ElementType
  title: string
  description: string
  /** "Soon" for a page that is not built yet (rendered as the dashed pill). */
  badge?: string
  /** Extra content on the title row, end-aligned (e.g. a count). */
  aside?: ReactNode
}

/**
 * A navigation card: icon, title, one-line description, the whole card a link.
 * Used where a page lists destinations (the /settings overview, the
 * Integrations overview), so both look and behave the same.
 */
export function LinkCard({ href, icon: Icon, title, description, badge, aside }: LinkCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-colors group-hover:border-primary/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{title}</span>
              {badge && (
                <Badge
                  variant="outline"
                  className="shrink-0 rounded-full border-dashed px-1.5 py-0 text-[10px] text-muted-foreground"
                >
                  {badge}
                </Badge>
              )}
              {aside}
            </div>
            <p className="mt-1 text-xs text-muted-foreground text-pretty">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
