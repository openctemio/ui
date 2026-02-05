'use client'

import { useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Loader2, Shield, Check } from 'lucide-react'
import { SEVERITY_CONFIG } from '../types'
import type { Severity } from '@/features/shared/types'

interface SeveritySelectProps {
  /** Current severity value */
  value: Severity
  /** Called when severity changes */
  onChange: (severity: Severity) => void
  /** Whether the select is disabled or loading */
  disabled?: boolean
  /** Show loading spinner */
  loading?: boolean
  /** Button size */
  size?: 'sm' | 'default'
  /** Show CVSS score next to severity */
  cvss?: number
  /** Show check mark for current selection */
  showCheck?: boolean
  /** Show shield icon */
  showIcon?: boolean
}

export function SeveritySelect({
  value,
  onChange,
  disabled = false,
  loading = false,
  size = 'sm',
  cvss,
  showCheck = false,
  showIcon = true,
}: SeveritySelectProps) {
  const currentConfig = SEVERITY_CONFIG[value]
  const isProcessingRef = useRef(false)

  // Debounced onChange to prevent race conditions
  const handleChange = useCallback(
    (severity: Severity) => {
      if (isProcessingRef.current || loading || disabled) return
      isProcessingRef.current = true
      onChange(severity)
      setTimeout(() => {
        isProcessingRef.current = false
      }, 500)
    },
    [onChange, loading, disabled]
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`${size === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 sm:h-8'} min-h-[32px] ${currentConfig.bgColor} ${currentConfig.textColor} border-0 hover:opacity-80`}
          disabled={disabled || loading}
        >
          {loading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : showIcon ? (
            <Shield className="mr-1 h-3 w-3" />
          ) : null}
          {currentConfig.label}
          {cvss !== undefined && <span className="ml-1 font-mono text-[10px]">({cvss})</span>}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {(Object.keys(SEVERITY_CONFIG) as Severity[]).map((severity) => {
          const config = SEVERITY_CONFIG[severity]
          return (
            <DropdownMenuItem
              key={severity}
              onClick={() => handleChange(severity)}
              className="flex items-center gap-2"
              disabled={disabled || loading}
            >
              <div className={`h-2 w-2 rounded-full ${config.bgColor.replace('/20', '')}`} />
              {config.label}
              <span className="text-muted-foreground ml-auto text-xs">{config.cvssRange}</span>
              {showCheck && severity === value && <Check className="ml-1 h-3 w-3" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
