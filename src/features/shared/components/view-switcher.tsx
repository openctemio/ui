'use client'

import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface ViewOption<T extends string> {
  value: T
  label: string
  icon: LucideIcon
}

/**
 * Switches how the same data is shown (list / categories, table / board).
 * One look everywhere: an icon segment, the active view pressed, the name in
 * a tooltip and as the accessible label. Keep the chosen view in the URL.
 */
export function ViewSwitcher<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: ReadonlyArray<ViewOption<T>>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className={cn('flex h-9 items-center rounded-md border p-0.5', className)}
    >
      {options.map(({ value: v, label, icon: Icon }) => (
        <Tooltip key={v}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={value === v ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              aria-label={label}
              aria-pressed={value === v}
              onClick={() => onChange(v)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
