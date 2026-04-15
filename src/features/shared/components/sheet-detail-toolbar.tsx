/**
 * SheetDetailToolbar
 *
 * A unified toolbar for Sheet detail panels across the app.
 * Hides the default radix close button and provides a consistent
 * header row: optional title on left, icon actions + close on right.
 *
 * Usage:
 * ```tsx
 * <SheetContent className="[&>button]:hidden p-0 ...">
 *   <SheetDetailToolbar
 *     title="Task Details"
 *     onClose={() => setOpen(false)}
 *     onEdit={handleEdit}
 *     onCopyId={() => copyToClipboard(item.id)}
 *     onOpenExternal={() => router.push(`/items/${item.id}`)}
 *   />
 *   {/* rest of content *\/}
 * </SheetContent>
 * ```
 */

'use client'

import * as React from 'react'
import { ExternalLink, Hash, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ToolbarAction {
  /** Tooltip label */
  label: string
  /** Icon component from lucide-react */
  icon: React.ElementType
  /** Click handler */
  onClick: () => void
  /** Whether to show this action (default: true) */
  show?: boolean
}

export interface SheetDetailToolbarProps {
  /** Optional title displayed on the left */
  title?: string
  /** Close the sheet */
  onClose: () => void
  /** Edit action (shows pencil icon) */
  onEdit?: () => void
  /** Copy ID action */
  onCopyId?: () => void
  /** Open in full page / external link */
  onOpenExternal?: () => void
  /** Additional custom actions (shown before edit) */
  extraActions?: ToolbarAction[]
  /** Optional className for the toolbar container */
  className?: string
}

export function SheetDetailToolbar({
  title,
  onClose,
  onEdit,
  onCopyId,
  onOpenExternal,
  extraActions,
  className,
}: SheetDetailToolbarProps) {
  const actions: ToolbarAction[] = [
    ...(onCopyId ? [{ label: 'Copy ID', icon: Hash, onClick: onCopyId }] : []),
    ...(onOpenExternal
      ? [{ label: 'Open in full page', icon: ExternalLink, onClick: onOpenExternal }]
      : []),
    ...(extraActions?.filter((a) => a.show !== false) ?? []),
    ...(onEdit ? [{ label: 'Edit', icon: Pencil, onClick: onEdit }] : []),
  ]

  return (
    <div className={cn('flex items-center justify-between px-3 pt-3 pb-1', className)}>
      {/* Left: title */}
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>}
      </div>

      {/* Right: actions + close */}
      <div className="flex items-center gap-0.5 shrink-0">
        {actions.map((action, i) => (
          <ToolbarButton key={i} action={action} />
        ))}
        {actions.length > 0 && <Separator orientation="vertical" className="h-4 mx-1" />}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Close</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function ToolbarButton({ action }: { action: ToolbarAction }) {
  const Icon = action.icon
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={action.onClick}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{action.label}</TooltipContent>
    </Tooltip>
  )
}
