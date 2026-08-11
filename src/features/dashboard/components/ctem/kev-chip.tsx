'use client'

import { cn } from '@/lib/utils'

/**
 * KEV chip — Known-Exploited-Vulnerability marker. Uses the semantic
 * `destructive` token (no hardcoded palette) so it themes in light/dark.
 */
export function KevChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'rounded border border-destructive/40 bg-destructive/10 px-1 font-mono text-[10px] font-bold text-destructive',
        className
      )}
    >
      KEV
    </span>
  )
}
