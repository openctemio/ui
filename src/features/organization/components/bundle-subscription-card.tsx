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

interface BundleSubscriptionCardProps {
  tenantId: string | undefined
  /** Called after a successful subscription change so the page can refetch modules. */
  onChanged?: () => void
}

/**
 * Lets a tenant admin pick which product bundles (ASM, ASPM, VM, …) the tenant
 * runs. The enabled-module set is resolved live from the selected bundles — no
 * subscription means every module is on. Per-module toggles below still apply
 * as overrides on top.
 */
export function BundleSubscriptionCard({ tenantId, onChanged }: BundleSubscriptionCardProps) {
  const { subscribed, available, isLoading, mutate } = useModuleBundles(tenantId)
  const { subscribeBundles, isSubscribing } = useSubscribeBundles(tenantId)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [initialised, setInitialised] = useState(false)

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

  const toggle = (id: string) => {
    setSelected((prev) => {
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
          ? 'Subscription cleared — all modules are now available'
          : `Now running ${selected.size} bundle${selected.size === 1 ? '' : 's'}`
      )
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update your bundles'))
    }
  }

  if (isLoading) {
    return <Skeleton className="mt-6 h-40 w-full" />
  }
  if (available.length === 0) {
    return null
  }

  return (
    <Card className="mt-6">
      <CardHeader className="py-3">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Your product bundles</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {selected.size === 0 ? 'All modules' : `${selected.size} selected`}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Choose the large modules this team runs — e.g. ASM, ASPM, Vulnerability Management. The
          enabled feature set updates live. Selecting none keeps every module available. You can
          fine-tune individual modules below.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((b) => {
            const Icon = BUNDLE_ICONS[b.icon] ?? Sparkles
            const on = selected.has(b.id)
            return (
              <button
                key={b.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(b.id)}
                className={cn(
                  'flex flex-col gap-1.5 rounded-lg border p-3 text-start transition-colors focus:ring-primary focus:outline-none focus:ring-2',
                  on
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                    : 'bg-card hover:bg-accent/50 hover:border-primary/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="text-primary h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-medium">{b.name}</span>
                  </div>
                  {on ? (
                    <Check className="text-primary h-4 w-4 shrink-0" />
                  ) : (
                    <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px]">
                      {b.module_count}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground line-clamp-2 text-xs">{b.description}</p>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {selected.size === 0
              ? 'No bundle selected — all modules stay available.'
              : `Running: ${available
                  .filter((b) => selected.has(b.id))
                  .map((b) => b.name)
                  .join(', ')}`}
          </p>
          <Button size="sm" onClick={handleSave} disabled={!dirty || isSubscribing}>
            {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save bundles
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
