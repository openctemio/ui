import type { ReactNode } from 'react'
import Link from 'next/link'

interface ActivityItemProps {
  icon: ReactNode
  title: string
  description: string
  time: string
  href?: string
}

export function ActivityItem({ icon, title, description, time, href }: ActivityItemProps) {
  const inner = (
    <>
      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">{icon}</div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <span className="text-muted-foreground text-xs">{time}</span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label={`View finding: ${title}`}
        className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-start gap-3 rounded-lg px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {inner}
      </Link>
    )
  }

  return <div className="flex items-start gap-3">{inner}</div>
}
