'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Package,
  Database,
  ShieldAlert,
  Globe,
  Bug,
  Crosshair,
  Cloud,
  ClipboardCheck,
  Layers,
  Boxes,
  Sparkles,
  Check,
  Loader2,
  Layers3,
  Info,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'
import { useModuleBundles, useSubscribeBundles } from '../api/use-tenant-modules'

const BUNDLE_ICONS: Record<string, LucideIcon> = {
  Package,
  Database,
  ShieldAlert,
  Globe,
  Bug,
  Crosshair,
  Cloud,
  ClipboardCheck,
  Layers,
  Boxes,
  Sparkles,
}

// Short display aliases for the long product names in the "Running now" strip.
const SHORT_NAME: Record<string, string> = {
  'Attack Surface Management': 'ASM',
  'Application Security Posture (ASPM)': 'ASPM',
  'Vulnerability Management Essentials': 'VM',
  'SBOM & Supply Chain Security': 'SBOM',
  'Cloud Security Posture': 'CSPM',
}

interface BundleSubscriptionCardProps {
  tenantId: string | undefined
  /** Called after a successful subscription change so the page can refetch modules. */
  onChanged?: () => void
}

/**
 * The single "Products" control — the one mental model for module packaging.
 *
 * A tenant admin picks which large products (ASM, ASPM, VM, …) the team runs;
 * the enabled-module set is resolved LIVE from that selection (union of the
 * chosen products + always-on core). No product selected = the full platform.
 * Non-destructive: changing the selection never wipes manual per-module
 * overrides, which layer on top. This supersedes the old one-shot "apply a
 * preset" flow, which overwrote the config and duplicated this exact catalog.
 */
export function BundleSubscriptionCard({ tenantId, onChanged }: BundleSubscriptionCardProps) {
  const { subscribed, available, isLoading, mutate } = useModuleBundles(tenantId)
  const { subscribeBundles, isSubscribing } = useSubscribeBundles(tenantId)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialised, setInitialised] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // The product grid is collapsed by default so it doesn't dominate the page —
  // most visits are to fine-tune, not re-pick products. The header row toggles
  // it; the running-summary + Save footer stay visible either way.
  const [open, setOpen] = useState(false)

  // Seed the selection from the server once the subscription loads.
  useEffect(() => {
    if (!initialised && !isLoading) {
      setSelected(new Set(subscribed))
      setInitialised(true)
    }
  }, [initialised, isLoading, subscribed])

  const dirty = useMemo(() => {
    if (selected.size !== subscribed.length) return true
    return subscribed.some((id) => !selected.has(id))
  }, [selected, subscribed])

  const runningNames = useMemo(
    () =>
      available
        .filter((b) => selected.has(b.id))
        .map((b) => SHORT_NAME[b.name] ?? b.name)
        .join(' · '),
    [available, selected]
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleDetail = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    try {
      await subscribeBundles({ bundle_ids: [...selected] })
      await mutate()
      onChanged?.()
      toast.success(
        selected.size === 0
          ? 'Running the full platform — every module is available'
          : `Now running ${selected.size} product${selected.size === 1 ? '' : 's'}`
      )
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update your products'))
    }
  }

  const handleReset = () => setSelected(new Set(subscribed))

  if (isLoading) {
    return <Skeleton className="mt-6 h-40 w-full" />
  }
  if (available.length === 0) {
    return null
  }

  return (
    <Card className="mt-6">
      <CardHeader className="py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 text-start"
        >
          <ChevronDown
            className={cn(
              'text-muted-foreground h-4 w-4 shrink-0 transition-transform',
              !open && '-rotate-90'
            )}
          />
          <Layers3 className="text-primary h-4 w-4 shrink-0" />
          <CardTitle className="text-base">Products</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {selected.size === 0 ? 'None · full platform' : `${selected.size} selected`}
          </Badge>
          {!open && selected.size > 0 && (
            <span className="text-muted-foreground ms-auto hidden min-w-0 truncate text-xs sm:inline">
              {runningNames}
            </span>
          )}
        </button>
        {open && (
          <p className="text-muted-foreground mt-1 text-xs">
            Choose the large products your team runs — ASM, ASPM, Vulnerability Management, and
            more. The enabled feature set is resolved <span className="font-medium">live</span> from
            your selection. Nothing here is destructive — fine-tune individual features below
            anytime.
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {open && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((b) => {
                const Icon = BUNDLE_ICONS[b.icon] ?? Sparkles
                const on = selected.has(b.id)
                const isOpen = expanded.has(b.id)
                const outcomes = b.key_outcomes ?? []
                return (
                  <div
                    key={b.id}
                    className={cn(
                      'flex flex-col gap-1.5 rounded-lg border p-3 transition-colors',
                      on
                        ? 'border-primary bg-primary/5 ring-primary/40 ring-1'
                        : 'bg-card hover:border-primary/50 hover:bg-accent/50'
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(b.id)}
                      className="focus-visible:ring-primary flex flex-col gap-1.5 rounded text-start focus:outline-none focus-visible:ring-2"
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
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground/70 min-w-0 flex-1 truncate text-[10px]">
                        {b.target_persona}
                      </span>
                      {outcomes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleDetail(b.id)}
                          aria-expanded={isOpen}
                          className="text-primary flex shrink-0 items-center gap-0.5 text-[11px] font-medium hover:underline"
                        >
                          Details
                          <ChevronDown
                            className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
                          />
                        </button>
                      )}
                    </div>

                    {isOpen && outcomes.length > 0 && (
                      <ul className="border-border/60 mt-1 space-y-1 border-t border-dashed pt-2">
                        {outcomes.map((k, i) => (
                          <li key={i} className="text-muted-foreground flex gap-1.5 text-[11px]">
                            <Check className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
                            <span>{k}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="text-muted-foreground bg-muted/30 mt-4 flex items-start gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <span className="text-foreground font-medium">
                  Select none to run the full platform.
                </span>{' '}
                With no product selected, every module is available. Selecting products narrows the
                platform to just what they need (plus always-on core).
              </div>
            </div>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground min-w-0 text-xs">
            {selected.size === 0 ? (
              <>Running the full platform.</>
            ) : (
              <>
                <span className="text-foreground font-medium">Running:</span> {runningNames}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button size="sm" variant="ghost" onClick={handleReset} disabled={isSubscribing}>
                Reset
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={!dirty || isSubscribing}>
              {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save products
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
