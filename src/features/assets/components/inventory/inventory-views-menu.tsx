'use client'

/**
 * The CTEM quick views as one "Views" menu in the table toolbar (it replaced a
 * row of chips above the table, which cost a line of height for six rarely
 * changed toggles). Each item toggles a small filter patch on/off, and its
 * check mark reads straight from the current filters (preset.isActive), so it
 * stays in sync when the same dimension is set from the panel, a metric or the
 * URL. The trigger names the active view when exactly one is on.
 */

import { ChevronDown, Clock, Flame, Gem, Globe, Network, UserX, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { QUICK_PRESETS, type QuickPreset } from '../../lib/inventory-facets'
import type { InventoryFilters } from '../../lib/inventory-url'

const PRESET_ICONS: Record<string, React.ElementType> = {
  'crown-jewels': Gem,
  'internet-facing': Globe,
  'critical-with-findings': Flame,
  unowned: UserX,
  'control-planes': Network,
  stale: Clock,
}

interface InventoryViewsMenuProps {
  filters: InventoryFilters
  onToggle: (preset: QuickPreset) => void
}

export function InventoryViewsMenu({ filters, onToggle }: InventoryViewsMenuProps) {
  const active = QUICK_PRESETS.filter((p) => p.isActive(filters))
  const triggerLabel =
    active.length === 0 ? 'Views' : active.length === 1 ? active[0].label : `${active.length} views`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Styled like the Group select on Findings: an outline field showing
            the current value, with a muted leading icon. */}
        <Button
          variant="outline"
          className="h-9 w-auto min-w-36 justify-between gap-2 px-3 font-normal"
          aria-label={active.length > 0 ? `Views (${triggerLabel})` : 'Views'}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="max-w-40 truncate">{triggerLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Quick views
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {QUICK_PRESETS.map((preset) => {
          const Icon = PRESET_ICONS[preset.id] ?? Gem
          return (
            <DropdownMenuCheckboxItem
              key={preset.id}
              checked={preset.isActive(filters)}
              onCheckedChange={() => onToggle(preset)}
              // Keep the menu open so several views can be combined.
              onSelect={(e) => e.preventDefault()}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {preset.label}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
