'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import {
  DataTable,
  ErrorState,
  PendingSetupBadge,
  RelativeTime,
  StackedCell,
} from '@/features/shared'
import { useOrganizationUsers } from '../api/use-admin-organizations'
import type { AdminOrganizationUser } from '../types'
import { AddOrganizationUserDialog } from './add-organization-user-dialog'

const columns: ColumnDef<AdminOrganizationUser>[] = [
  {
    accessorKey: 'name',
    header: 'User',
    cell: ({ row }) => (
      <StackedCell
        primary={row.original.name || row.original.email}
        secondary={row.original.email}
      />
    ),
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) =>
      row.original.pending_setup && row.original.status !== 'suspended' ? (
        <PendingSetupBadge />
      ) : (
        <Badge
          variant={row.original.status === 'active' ? 'secondary' : 'outline'}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
  },
  {
    accessorKey: 'joined_at',
    header: 'Joined',
    cell: ({ row }) => <RelativeTime date={row.original.joined_at} className="text-sm" />,
  },
]

/** People in one organization, with "Add user" for operations admins. */
export function OrganizationUsersSection({
  tenantId,
  canManage,
  onChanged,
}: {
  tenantId: string
  canManage: boolean
  /** The organization's member count changed. */
  onChanged?: () => void
}) {
  const { data, error, isLoading, mutate } = useOrganizationUsers(tenantId)
  const refresh = () => void mutate()

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">
            People with an account in this organization. Users cannot register themselves; add them
            here or let the organization&apos;s owners add them.
          </p>
        </div>
        {canManage && (
          <AddOrganizationUserDialog
            tenantId={tenantId}
            onCreated={() => {
              refresh()
              onChanged?.()
            }}
          />
        )}
      </div>
      {error ? (
        <ErrorState title="users" error={error} onRetry={refresh} />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          getRowId={(u) => u.user_id}
          isLoading={isLoading}
          showSearch={false}
          showColumnToggle={false}
          showSelectionCount={false}
          mobileCards
          emptyMessage="No users yet"
        />
      )}
    </section>
  )
}
