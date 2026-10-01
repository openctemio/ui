'use client'

import { Shield } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Role } from '@/features/access-control/types/role.types'

export type RoleChecklistItem = Pick<
  Role,
  'id' | 'name' | 'slug' | 'description' | 'is_system' | 'permission_count'
>

interface RoleChecklistProps {
  roles: RoleChecklistItem[]
  selected: string[]
  onChange: (next: string[]) => void
  loading?: boolean
  disabled?: boolean
  /** Upper bound on how many roles may be selected. */
  max?: number
  className?: string
}

/** The picker hides the owner role (ownership is not assigned through roles) and junk rows. */
export function selectableRoles<T extends RoleChecklistItem>(roles: T[]): T[] {
  return roles.filter(
    (r) => r.slug !== 'owner' && r.id && typeof r.name === 'string' && r.name.length > 0
  )
}

function RoleGroup({
  title,
  roles,
  selected,
  toggle,
  disabled,
  atMax,
}: {
  title: string
  roles: RoleChecklistItem[]
  selected: string[]
  toggle: (id: string) => void
  disabled?: boolean
  atMax: boolean
}) {
  if (roles.length === 0) return null
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-2">
        {roles.map((role) => {
          const isSelected = selected.includes(role.id)
          const itemDisabled = disabled || (atMax && !isSelected)
          const name = role.name.slice(0, 100)
          return (
            <label
              key={role.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-transparent bg-muted/30 hover:border-muted hover:bg-muted/50',
                itemDisabled && 'cursor-not-allowed opacity-60'
              )}
            >
              <Checkbox
                className="mt-0.5"
                checked={isSelected}
                disabled={itemDisabled}
                onCheckedChange={() => toggle(role.id)}
                aria-label={name}
              />
              <div
                className={cn(
                  'rounded-lg p-2',
                  role.is_system
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium" title={role.name}>
                  {name}
                </span>
                {role.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {role.description.slice(0, 200)}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {role.permission_count ?? 0} permissions
                </p>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The RBAC role picker used wherever roles are granted to a person: inviting
 * them, creating their account, and changing their roles. System roles first,
 * then custom roles.
 */
export function RoleChecklist({
  roles,
  selected,
  onChange,
  loading,
  disabled,
  max,
  className,
}: RoleChecklistProps) {
  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const available = selectableRoles(roles)
  if (available.length === 0) {
    return (
      <div className={cn('py-6 text-center', className)}>
        <Shield className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No roles available</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create roles in Access Control settings
        </p>
      </div>
    )
  }

  const atMax = max !== undefined && selected.length >= max
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  return (
    <div className={cn('max-h-[320px] space-y-4 overflow-y-auto pe-1', className)}>
      <RoleGroup
        title="System roles"
        roles={available.filter((r) => r.is_system)}
        selected={selected}
        toggle={toggle}
        disabled={disabled}
        atMax={atMax}
      />
      <RoleGroup
        title="Custom roles"
        roles={available.filter((r) => !r.is_system)}
        selected={selected}
        toggle={toggle}
        disabled={disabled}
        atMax={atMax}
      />
    </div>
  )
}
