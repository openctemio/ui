'use client'

import { AlertOctagon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { CISAKEVData } from '../types'

interface KEVBadgeProps {
  kev?: CISAKEVData
  className?: string
}

export function KEVBadge({ kev, className }: KEVBadgeProps) {
  if (!kev) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={cn(
            'gap-1 bg-red-600 text-white hover:bg-red-700',
            kev.is_past_due && 'ring-2 ring-red-300',
            className
          )}
        >
          <AlertOctagon className="h-3 w-3" />
          KEV
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <p className="font-semibold">CISA Known Exploited Vulnerability</p>
          <p>Added: {new Date(kev.date_added).toLocaleDateString()}</p>
          <p>
            Due: {new Date(kev.due_date).toLocaleDateString()}
            {kev.is_past_due && <span className="ml-1 font-bold text-red-200">(Past Due)</span>}
          </p>
          {kev.ransomware_use && kev.ransomware_use !== 'Unknown' && (
            <p>Ransomware use: {kev.ransomware_use}</p>
          )}
          {kev.notes && <p className="mt-1 italic opacity-90">{kev.notes}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
