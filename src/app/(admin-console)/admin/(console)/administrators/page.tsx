'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Main } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  DataTable,
  DataTableRowActions,
  EmptyState,
  ErrorState,
  PageHeader,
  RelativeTime,
  StackedCell,
} from '@/features/shared'
import { ShieldAlert } from 'lucide-react'
import {
  resetAdminCredentials,
  updateAdminUser,
  useAdminUsers,
} from '@/features/admin-console/api/use-admin-users'
import { AdminApiError } from '@/features/admin-console/api/admin-client'
import { useAdmin } from '@/features/admin-console/components/admin-console-shell'
import {
  ADMIN_ROLE_OPTIONS,
  CreateAdminDialog,
} from '@/features/admin-console/components/create-admin-dialog'
import { adminCan, type AdminRole, type AdminUserRecord } from '@/features/admin-console/types'

const roleLabel = (r: AdminRole) => ADMIN_ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r

type Pending =
  | { kind: 'reset'; admin: AdminUserRecord }
  | { kind: 'toggle'; admin: AdminUserRecord }
  | { kind: 'role'; admin: AdminUserRecord; role: AdminRole }

export default function AdministratorsPage() {
  const me = useAdmin()
  const isSuper = adminCan(me.role, 'super_admin')
  const { data, error, isLoading, mutate } = useAdminUsers(1, isSuper)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.kind === 'reset') {
        await resetAdminCredentials(pending.admin.id)
        toast.success(
          `${pending.admin.email} must set a new password and re-enroll two-step verification`
        )
      } else if (pending.kind === 'toggle') {
        await updateAdminUser(pending.admin.id, { is_active: !pending.admin.is_active })
        toast.success(
          pending.admin.is_active ? 'Administrator deactivated' : 'Administrator reactivated'
        )
      } else {
        await updateAdminUser(pending.admin.id, { role: pending.role })
        toast.success(`${pending.admin.email} is now ${roleLabel(pending.role)}`)
      }
      void mutate()
      setPending(null)
    } catch (e) {
      toast.error(e instanceof AdminApiError ? e.message : 'The change failed')
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo<ColumnDef<AdminUserRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Administrator',
        cell: ({ row }) => (
          <StackedCell primary={row.original.name} secondary={row.original.email} />
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => <span className="text-sm">{roleLabel(row.original.role)}</span>,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="outline">Deactivated</Badge>
          ),
      },
      {
        accessorKey: 'last_used_at',
        header: 'Last active',
        cell: ({ row }) =>
          row.original.last_used_at ? (
            <RelativeTime date={row.original.last_used_at} className="text-sm" />
          ) : (
            <span className="text-sm text-muted-foreground">Never</span>
          ),
      },
      {
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => {
          const a = row.original
          if (a.id === me.id) return null // own account: use the password endpoint
          return (
            <DataTableRowActions
              actions={[
                ...ADMIN_ROLE_OPTIONS.filter((o) => o.value !== a.role).map((o) => ({
                  label: `Make ${o.label.toLowerCase()}`,
                  onClick: () => setPending({ kind: 'role', admin: a, role: o.value }),
                })),
                {
                  label: 'Reset sign-in (password and two-step)',
                  onClick: () => setPending({ kind: 'reset', admin: a }),
                  separatorBefore: true,
                },
                {
                  label: a.is_active ? 'Deactivate' : 'Reactivate',
                  onClick: () => setPending({ kind: 'toggle', admin: a }),
                  destructive: a.is_active,
                },
              ]}
            />
          )
        },
      },
    ],
    [me.id]
  )

  if (!isSuper) {
    return (
      <Main>
        <PageHeader title="Administrators" />
        <EmptyState
          className="mt-5"
          icon={ShieldAlert}
          title="Super admin only"
          description="The administrator roster is visible to super admins."
        />
      </Main>
    )
  }

  const desc =
    pending?.kind === 'reset'
      ? `${pending.admin.email} will be signed out everywhere and must set a new password with their API key, then set up two-step verification again. Use this when they lose their authenticator.`
      : pending?.kind === 'toggle'
        ? pending.admin.is_active
          ? `${pending.admin.email} will no longer be able to sign in or use their API key.`
          : `${pending.admin.email} will be able to sign in again.`
        : pending?.kind === 'role'
          ? `${pending.admin.email} becomes ${roleLabel(pending.role)}.`
          : ''

  return (
    <Main>
      <PageHeader
        title="Administrators"
        description="People who administer this installation. Separate from organization accounts."
      >
        <CreateAdminDialog onCreated={() => void mutate()} />
      </PageHeader>
      <div className="mt-5">
        {error ? (
          <ErrorState title="administrators" error={error} onRetry={() => void mutate()} />
        ) : (
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            getRowId={(a) => a.id}
            isLoading={isLoading}
            showColumnToggle={false}
            showSelectionCount={false}
            searchPlaceholder="Search administrators..."
            mobileCards
          />
        )}
      </div>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.kind === 'reset'
            ? 'Reset sign-in?'
            : pending?.kind === 'toggle'
              ? pending.admin.is_active
                ? 'Deactivate administrator?'
                : 'Reactivate administrator?'
              : 'Change role?'
        }
        desc={desc}
        confirmText="Confirm"
        destructive={
          pending?.kind !== 'role' && !(pending?.kind === 'toggle' && !pending.admin.is_active)
        }
        isLoading={busy}
        handleConfirm={() => void confirm()}
      />
    </Main>
  )
}
