'use client'

/**
 * One-click CTEM preset chips. Each toggles a small filter patch on/off. A chip
 * reads "active" straight from the current filters (via preset.isActive) so it
 * stays in sync when the same dimension is set from the facet panel or the URL.
 */

import { Gem, Globe, Flame, UserX, Network, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface QuickPresetsProps {
  filters: InventoryFilters
  onToggle: (preset: QuickPreset) => void
}

export function InventoryQuickPresets({ filters, onToggle }: QuickPresetsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Quick views:</span>
      {QUICK_PRESETS.map((preset) => {
        const active = preset.isActive(filters)
        const Icon = PRESET_ICONS[preset.id] ?? Gem
        return (
          <button
            key={preset.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(preset)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
