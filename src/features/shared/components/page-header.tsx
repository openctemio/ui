'use client'

import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0',
        className
      )}
    >
      <div className="min-w-0 shrink-0 self-start sm:self-auto">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
    </div>
  )
}
