'use client'

import { useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronDown, Loader2, Check } from 'lucide-react'
import { FINDING_STATUS_CONFIG, STATUS_TRANSITIONS, getStatusesForSource } from '../types'
import type { FindingStatus } from '../types'

// Status transition descriptions for tooltips
const STATUS_DESCRIPTIONS: Partial<Record<FindingStatus, string>> = {
  new: 'Newly discovered finding awaiting triage',
  confirmed: 'Verified as a real security issue',
  in_progress: 'Remediation work has begun',
  fix_applied: 'Dev marked as fixed — awaiting verification scan',
  resolved: 'Issue has been fixed and verified',
  accepted: 'Risk acknowledged and accepted by stakeholders',
  false_positive: 'Determined to be a non-issue',
  duplicate: 'Already reported in another finding',
  draft: 'Pentest finding being drafted',
  in_review: 'Under peer review',
  remediation: 'Developer working on fix',
  retest: 'Awaiting re-verification',
  verified: 'Fix confirmed via manual retest',
  accepted_risk: 'Risk acknowledged and accepted',
}

interface StatusSelectProps {
  /** Current status value */
  value: FindingStatus
  /** Called when status changes */
  onChange: (status: FindingStatus) => void
  /** Whether the select is disabled or loading */
  disabled?: boolean
  /** Show loading spinner */
  loading?: boolean
  /** Button size */
  size?: 'sm' | 'default'
  /** Show check mark for current selection */
  showCheck?: boolean
  /** Finding source — filters available statuses per source type */
  source?: string
}

export function StatusSelect({
  value,
  onChange,
  disabled = false,
  loading = false,
  size = 'sm',
  showCheck = false,
  source,
}: StatusSelectProps) {
  const currentConfig = FINDING_STATUS_CONFIG[value]
  const allTransitions = STATUS_TRANSITIONS[value]
  // Filter transitions by source type (pentest vs automated have different valid statuses)
  const validStatuses = source ? getStatusesForSource(source) : undefined
  const availableTransitions = validStatuses
    ? allTransitions.filter((s) => validStatuses.includes(s))
    : allTransitions
  const isProcessingRef = useRef(false)

  // Debounced onChange to prevent race conditions
  const handleChange = useCallback(
    (status: FindingStatus) => {
      if (isProcessingRef.current || loading || disabled) return
      isProcessingRef.current = true
      onChange(status)
      // Reset after a short delay to allow for the API call to complete
      setTimeout(() => {
        isProcessingRef.current = false
      }, 500)
    },
    [onChange, loading, disabled]
  )

  return (
    <TooltipProvider delayDuration={300}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size={size}
                className={`${size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 sm:h-8'} min-h-[32px] ${currentConfig.bgColor} ${currentConfig.textColor} border-0 hover:opacity-80`}
                disabled={disabled || loading}
              >
                {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {currentConfig.label}
                {!disabled && <ChevronDown className="ml-1 h-3 w-3" />}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px]">
            <p className="text-xs">{STATUS_DESCRIPTIONS[value]}</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-56">
          {availableTransitions.map((status) => {
            const config = FINDING_STATUS_CONFIG[status]
            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    onClick={() => handleChange(status)}
                    className="flex items-center gap-2"
                    disabled={disabled || loading}
                  >
                    <div className={`h-2 w-2 rounded-full ${config.bgColor.replace('/20', '')}`} />
                    {config.label}
                    {showCheck && status === value && <Check className="ml-auto h-3 w-3" />}
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">{STATUS_DESCRIPTIONS[status]}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
