'use client'

import { memo } from 'react'
import { Globe, Sparkles, Wrench, Bot, ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { DynamicIcon } from '@/components/dynamic-icon'

import { useCapabilityUsageStats } from '@/lib/api/capability-hooks'
import type { Capability, CapabilityUsageStats } from '@/lib/api/capability-types'

interface CapabilityDetailPanelProps {
  capability: Capability | null
  /** Initial stats from batch API (counts only) for instant display */
  initialStats?: CapabilityUsageStats
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Get color class from color name
function getColorClass(color: string) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    orange: 'bg-orange-500/10 text-orange-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    lime: 'bg-lime-500/10 text-lime-500',
    teal: 'bg-teal-500/10 text-teal-500',
    indigo: 'bg-indigo-500/10 text-indigo-500',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-500',
    amber: 'bg-amber-500/10 text-amber-500',
    violet: 'bg-violet-500/10 text-violet-500',
    sky: 'bg-sky-500/10 text-sky-500',
    slate: 'bg-slate-500/10 text-slate-500',
    gray: 'bg-gray-500/10 text-gray-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
  }
  return colorMap[color] || 'bg-primary/10 text-primary'
}

export const CapabilityDetailPanel = memo(function CapabilityDetailPanel({
  capability,
  initialStats,
  open,
  onOpenChange,
}: CapabilityDetailPanelProps) {
  // Fetch usage stats with full details (includes names)
  const { data: usageStats, isLoading } = useCapabilityUsageStats(open ? capability?.id : null)

  // Use fetched data, fall back to initial stats for instant counts display
  const stats = usageStats || initialStats
  const hasNames = usageStats?.tool_names || usageStats?.agent_names
  const isLoadingNames = isLoading && !hasNames

  if (!capability) return null

  const colorClass = getColorClass(capability.color)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        {/* Header with padding */}
        <SheetHeader className="space-y-3 px-6 pt-6 pb-4 pr-14 flex-shrink-0 border-b">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
            >
              <DynamicIcon name={capability.icon} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg leading-tight">{capability.display_name}</SheetTitle>
              <code className="text-xs text-muted-foreground">{capability.name}</code>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {capability.category && (
              <Badge variant="outline" className="capitalize">
                {capability.category}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              {capability.is_builtin ? (
                <>
                  <Globe className="h-3 w-3" />
                  Platform
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Custom
                </>
              )}
            </Badge>
          </div>

          {/* Description */}
          {capability.description && <SheetDescription>{capability.description}</SheetDescription>}
        </SheetHeader>

        {/* Scrollable content area - flex-1 with min-h-0 enables scroll */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-6 space-y-6">
            {/* Usage Summary */}
            <section>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Usage Summary</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    <span className="text-xs font-medium">Tools</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{stats?.tool_count ?? 0}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bot className="h-4 w-4" />
                    <span className="text-xs font-medium">Agents</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold">{stats?.agent_count ?? 0}</p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t" />

            {/* Tools List */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Tools
                  {stats && stats.tool_count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {stats.tool_count}
                    </Badge>
                  )}
                </h4>
                {stats && stats.tool_count > 0 && (
                  <Link
                    href="/tools"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              {isLoadingNames ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : usageStats?.tool_names && usageStats.tool_names.length > 0 ? (
                <div className="space-y-1.5">
                  {usageStats.tool_names.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              ) : stats?.tool_count === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No tools are using this capability.
                </p>
              ) : null}
            </section>

            {/* Divider */}
            <div className="border-t" />

            {/* Agents List */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Agents
                  {stats && stats.agent_count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {stats.agent_count}
                    </Badge>
                  )}
                </h4>
                {stats && stats.agent_count > 0 && (
                  <Link
                    href="/agents"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              {isLoadingNames ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : usageStats?.agent_names && usageStats.agent_names.length > 0 ? (
                <div className="space-y-1.5">
                  {usageStats.agent_names.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              ) : stats?.agent_count === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No agents have this capability assigned.
                </p>
              ) : null}
            </section>

            {/* Divider */}
            <div className="border-t" />

            {/* Metadata */}
            <section>
              <h4 className="mb-3 text-sm font-semibold text-foreground">Details</h4>
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground shrink-0">ID</dt>
                  <dd className="font-mono text-xs truncate text-right">{capability.id}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground shrink-0">Code Name</dt>
                  <dd className="font-mono text-xs truncate text-right">{capability.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground shrink-0">Category</dt>
                  <dd className="capitalize text-right">{capability.category || '-'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground shrink-0">Type</dt>
                  <dd className="text-right">{capability.is_builtin ? 'Platform' : 'Custom'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground shrink-0">Color</dt>
                  <dd className="capitalize text-right flex items-center gap-2 justify-end">
                    <span className={`h-3 w-3 rounded-full ${colorClass.split(' ')[0]}`} />
                    {capability.color}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground shrink-0">Icon</dt>
                  <dd className="text-right flex items-center gap-2 justify-end">
                    <DynamicIcon name={capability.icon} className="h-4 w-4" />
                    {capability.icon}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </ScrollArea>

        {/* Safe area padding for mobile */}
        <div className="flex-shrink-0 h-safe-area-inset-bottom" />
      </SheetContent>
    </Sheet>
  )
})
