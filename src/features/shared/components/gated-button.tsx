'use client'

import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type GatedButtonProps = ComponentProps<typeof Button> & {
  /** Whether the current user may perform the action. */
  allowed: boolean
  /** Why the action is unavailable; shown as a tooltip and to screen readers. */
  reason: string
}

/**
 * A button for an action the API restricts (an owner-only action, or one that
 * needs a permission the user may lack). When the user may not perform it,
 * the button stays visible but disabled, and says why on hover or focus,
 * instead of failing with a 403 after the click. The API stays the authority.
 */
export function GatedButton({ allowed, reason, disabled, ...props }: GatedButtonProps) {
  if (allowed) return <Button disabled={disabled} {...props} />
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex" aria-label={reason}>
          <Button {...props} disabled onClick={undefined} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  )
}
