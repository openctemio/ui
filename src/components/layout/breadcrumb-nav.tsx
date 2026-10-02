'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { breadcrumbLabel } from './breadcrumb-labels'
import { breadcrumbHasPage, isIdSegment } from './breadcrumb-routes'
import { NavPendingHint } from './sidebar-link'

interface BreadcrumbNavProps {
  /** Override the auto-generated page title */
  pageTitle?: string
  /** Custom className for the breadcrumb container */
  className?: string
  /** Hide the last segment if it's an ID (useful for detail pages with back button) */
  hideIdSegment?: boolean
}

export function BreadcrumbNav({ pageTitle, className, hideIdSegment = true }: BreadcrumbNavProps) {
  const pathname = usePathname()

  // Split pathname and filter empty strings
  const segments = pathname.split('/').filter(Boolean)

  // If we're on the home page, don't show breadcrumb
  if (segments.length === 0) {
    return null
  }

  // Build breadcrumb items with accumulated paths.
  // For detail pages (trailing UUID), keep the parent as a link and add "Detail" as current page.
  const filteredSegments = [...segments]
  let detailPageLabel: string | null = null
  if (hideIdSegment) {
    // Check if last segment(s) are IDs → this is a detail page
    while (
      filteredSegments.length > 0 &&
      isIdSegment(filteredSegments[filteredSegments.length - 1])
    ) {
      const idSegment = filteredSegments.pop()!
      detailPageLabel = idSegment.slice(0, 8) + '...'
    }
  }
  if (pageTitle && detailPageLabel !== null) {
    detailPageLabel = pageTitle
  }

  // If all segments were IDs, show at least home
  if (filteredSegments.length === 0) {
    return null
  }

  const breadcrumbItems = filteredSegments.map((segment, index) => {
    const path = '/' + filteredSegments.slice(0, index + 1).join('/')
    const label = breadcrumbLabel(path, segment)
    // When on a detail page, the parent (e.g., "Findings") becomes a link, not current page
    const isLast = index === filteredSegments.length - 1 && detailPageLabel === null

    return { path, label, isLast }
  })

  // Append the detail page label as the current (non-link) segment
  if (detailPageLabel) {
    breadcrumbItems.push({
      path: pathname,
      label: detailPageLabel,
      isLast: true,
    })
  }

  // One line, always: the trail takes the width the header leaves it and each
  // item truncates. Below lg only the last two items show, behind an ellipsis
  // (the list used to wrap, and on a tablet it stacked up out of the header).
  const hiddenBelowLg = Math.max(0, breadcrumbItems.length - 2)

  return (
    <Breadcrumb className={cn('min-w-0 flex-1 overflow-hidden', className)}>
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem className="shrink-0">
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">Dashboard</span>
              <NavPendingHint quiet />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {hiddenBelowLg > 0 && (
          <>
            <BreadcrumbSeparator className="lg:hidden" />
            <BreadcrumbItem className="shrink-0 lg:hidden" aria-hidden>
              …
            </BreadcrumbItem>
          </>
        )}

        {breadcrumbItems.map((item, i) => {
          const collapsible = i < hiddenBelowLg
          return (
            <Fragment key={item.path}>
              <BreadcrumbSeparator className={cn(collapsible && 'hidden lg:flex')} />
              <BreadcrumbItem className={cn('min-w-0', collapsible && 'hidden lg:inline-flex')}>
                {item.isLast ? (
                  <BreadcrumbPage className="truncate" aria-current="page">
                    {item.label}
                  </BreadcrumbPage>
                ) : !breadcrumbHasPage(item.path) ? (
                  // A section folder with no page: a link would lead to the 404.
                  <span className="truncate">{item.label}</span>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.path} className="truncate">
                      {item.label}
                      <NavPendingHint quiet />
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
