'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface TriageResultSkeletonProps {
  className?: string
}

/**
 * Loading skeleton for the AI triage result card.
 * Shows placeholder content while triage result is being fetched.
 */
export function TriageResultSkeleton({ className }: TriageResultSkeletonProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <Skeleton className="h-px w-full" />

        {/* Key Metrics skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Severity */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Risk Score */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-3 w-6" />
            </div>
          </div>

          {/* Exploitability */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>

          {/* False Positive */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Priority skeleton */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Justification skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Remediation steps skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
