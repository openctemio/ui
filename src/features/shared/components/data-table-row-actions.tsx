'use client'

import { Fragment } from 'react'
import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Can } from '@/lib/permissions'

/**
 * One item in a row-actions menu.
 */
export interface RowAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  /** Renders in destructive (red) styling — for Delete/Remove. */
  destructive?: boolean
  disabled?: boolean
  /**
   * Why a disabled item is unavailable (e.g. "Only the owner can…"). Shown as
   * a tooltip and to screen readers, so the action is visible but explained
   * instead of failing with a 403.
   */
  disabledReason?: string
  /** Insert a separator above this item (e.g. before a destructive action). */
  separatorBefore?: boolean
  /** Gate this item behind a permission (wrapped in <Can>). Omit = always shown. */
  permission?: string | string[]
}

interface DataTableRowActionsProps {
  actions: RowAction[]
  align?: 'end' | 'start' | 'center'
  /** Accessible label for the trigger button. */
  label?: string
}

/**
 * The canonical row "⋯" actions menu. Replaces the copy-pasted
 * MoreHorizontal → DropdownMenu (View / Edit / Delete) triad that was
 * re-implemented in ~57 tables, each drifting slightly (icon vs no-icon,
 * "Remove" vs "Delete", `text-destructive` vs `text-red-600`, align omitted).
 *
 * Permission gating stays with the caller — wrap this in <Can> as before, or
 * pass only the actions the user may perform.
 */
export function DataTableRowActions({
  actions,
  align = 'end',
  label = 'Open row actions',
}: DataTableRowActionsProps) {
  if (actions.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((action, i) => {
          const item = (
            <>
              {action.separatorBefore && <DropdownMenuSeparator />}
              {action.disabled && action.disabledReason ? (
                <DisabledMenuItem
                  label={action.label}
                  icon={action.icon}
                  reason={action.disabledReason}
                />
              ) : (
                <DropdownMenuItem
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn(action.destructive && 'text-destructive focus:text-destructive')}
                >
                  {action.icon && <action.icon className="me-2 h-4 w-4" />}
                  {action.label}
                </DropdownMenuItem>
              )}
            </>
          )
          return action.permission ? (
            <Can key={`${action.label}-${i}`} permission={action.permission}>
              {item}
            </Can>
          ) : (
            <Fragment key={`${action.label}-${i}`}>{item}</Fragment>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * A menu item the user cannot use, explaining why on hover or focus. Shared by
 * DataTableRowActions and hand-built menus (e.g. the members page).
 */
export function DisabledMenuItem({
  label,
  icon: Icon,
  reason,
}: {
  label: string
  icon?: LucideIcon
  reason: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div tabIndex={0} aria-label={`${label}: ${reason}`}>
          <DropdownMenuItem disabled>
            {Icon && <Icon className="me-2 h-4 w-4" />}
            {label}
          </DropdownMenuItem>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">{reason}</TooltipContent>
    </Tooltip>
  )
}
