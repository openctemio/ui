'use client'

import { useMemo } from 'react'
import { Check, Info, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ModulePreset } from '@/features/organization/api/use-tenant-modules'
import { BUNDLE_ICONS } from '@/features/organization/components/bundle-subscription-card'

interface OnboardingBundlePickerProps {
  /** The bundle catalog (product presets). Single source of truth. */
  bundles: ModulePreset[]
  /** Currently-selected bundle IDs. Empty = every module on (the default). */
  selected: Set<string>
  onToggle: (id: string) => void
  isLoading?: boolean
  disabled?: boolean
}

/**
 * Optional product-bundle picker shown during team creation.
 *
 * A new tenant can narrow the platform to the products it runs (ASM, ASPM,
 * Vulnerability Management, …) up front. It mirrors the Settings → Products
 * card so the same catalog, icons, and mental model carry over. Leaving every
 * card unselected keeps the default — the full platform, every module on — so
 * existing onboarding flows are unchanged.
 */
export function OnboardingBundlePicker({
  bundles,
  selected,
  onToggle,
  isLoading = false,
  disabled = false,
}: OnboardingBundlePickerProps) {
  const selectedCount = selected.size

  // Summary line: bundle module_counts overlap (shared core + deps) so a naive
  // sum would overstate the resolved set. We show the number of products picked
  // instead; the authoritative resolved module set is computed server-side when
  // the subscription is saved. Per-card counts still hint at each product's size.
  const summaryLabel = useMemo(() => {
    if (selectedCount === 0) return 'Full platform — every module available'
    return `${selectedCount} product${selectedCount === 1 ? '' : 's'} selected`
  }, [selectedCount])

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />
  }

  // No catalog (e.g. endpoint unavailable) — hide the whole section so the
  // form still works exactly as before.
  if (bundles.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            Products
            <span className="text-muted-foreground ms-2 text-xs font-normal">Optional</span>
          </p>
          <p className="text-muted-foreground text-xs">
            Pick the products this team runs. Leave empty to start with the full platform.
          </p>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">{summaryLabel}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {bundles.map((b) => {
          const Icon = BUNDLE_ICONS[b.icon] ?? Sparkles
          const on = selected.has(b.id)
          return (
            <button
              key={b.id}
              type="button"
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onToggle(b.id)}
              className={cn(
                'focus-visible:ring-primary flex flex-col gap-1.5 rounded-lg border p-3 text-start transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                on
                  ? 'border-primary bg-primary/5 ring-primary/40 ring-1'
                  : 'bg-card hover:border-primary/50 hover:bg-accent/50'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="text-primary h-4 w-4 shrink-0" />
                  <span className="truncate text-sm font-medium">{b.name}</span>
                </div>
                <span
                  className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]',
                    on
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'text-muted-foreground border-border'
                  )}
                  aria-hidden
                >
                  {on ? <Check className="h-3 w-3" /> : b.module_count}
                </span>
              </div>
              <p className="text-muted-foreground line-clamp-2 min-h-[2.5rem] text-xs">
                {b.description}
              </p>
              {b.target_persona && (
                <span className="text-muted-foreground/70 truncate text-[10px]">
                  {b.target_persona}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="text-muted-foreground bg-muted/30 flex items-start gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <span className="text-foreground font-medium">Not sure? Leave this empty.</span> You get
          the full platform and can narrow it anytime in Settings → Products.
        </div>
      </div>
    </div>
  )
}
