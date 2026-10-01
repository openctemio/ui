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
  confirmBreakGlassTest,
  resetAdminCredentials,
  unbindAdminIdP,
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
  | { kind: 'breakglass'; admin: AdminUserRecord }
  | { kind: 'test'; admin: AdminUserRecord }
  | { kind: 'unbind'; admin: AdminUserRecord }

/** Badges for how an administrator signs in. */
function SignInBadges({ a }: { a: AdminUserRecord }) {
  return (
    <div className="flex flex-wrap gap-1">
      {a.is_break_glass && <Badge variant="destructive">Break-glass</Badge>}
      {a.idp_bound && <Badge variant="secondary">Identity provider</Badge>}
      {a.password_change_required && <Badge variant="outline">Temporary password</Badge>}
      {!a.is_break_glass && !a.idp_bound && !a.password_change_required && (
        <span className="text-sm text-muted-foreground">Password</span>
      )}
    </div>
  )
}

/** Last confirmed test of a break-glass account, flagged after 90 days. */
function BreakGlassTested({ a }: { a: AdminUserRecord }) {
  if (!a.is_break_glass) return <span className="text-sm text-muted-foreground">-</span>
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {a.break_glass_tested_at ? (
        <RelativeTime date={a.break_glass_tested_at} className="text-sm" />
      ) : (
        <span className="text-sm text-muted-foreground">Never</span>
      )}
      {a.break_glass_test_overdue && <Badge variant="outline">Test overdue</Badge>}
    </div>
  )
}

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
          `${pending.admin.email} will set up two-step verification again when they next open the console`
        )
      } else if (pending.kind === 'toggle') {
        await updateAdminUser(pending.admin.id, { is_active: !pending.admin.is_active })
        toast.success(
          pending.admin.is_active ? 'Administrator deactivated' : 'Administrator reactivated'
        )
      } else if (pending.kind === 'role') {
        await updateAdminUser(pending.admin.id, { role: pending.role })
        toast.success(`${pending.admin.email} is now ${roleLabel(pending.role)}`)
      } else if (pending.kind === 'breakglass') {
        await updateAdminUser(pending.admin.id, { is_break_glass: !pending.admin.is_break_glass })
        toast.success(
          pending.admin.is_break_glass
            ? `${pending.admin.email} is no longer a break-glass account`
            : `${pending.admin.email} is now a break-glass account`
        )
      } else if (pending.kind === 'test') {
        await confirmBreakGlassTest(pending.admin.id)
        toast.success(`Test of ${pending.admin.email} recorded`)
      } else {
        await unbindAdminIdP(pending.admin.id)
        toast.success(`${pending.admin.email} is bound again on their next IdP sign-in`)
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
        id: 'sign_in',
        header: 'Sign-in',
        enableSorting: false,
        cell: ({ row }) => <SignInBadges a={row.original} />,
      },
      {
        id: 'break_glass_tested',
        header: 'Last tested',
        enableSorting: false,
        cell: ({ row }) => <BreakGlassTested a={row.original} />,
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
          if (a.id === me.id) return null // not on your own account
          return (
            <DataTableRowActions
              actions={[
                ...ADMIN_ROLE_OPTIONS.filter((o) => o.value !== a.role).map((o) => ({
                  label: `Make ${o.label.toLowerCase()}`,
                  onClick: () => setPending({ kind: 'role', admin: a, role: o.value }),
                })),
                ...(a.is_break_glass && a.last_used_at
                  ? [
                      {
                        label: 'Confirm last sign-in was a test',
                        onClick: () => setPending({ kind: 'test', admin: a }),
                        separatorBefore: true,
                      },
                    ]
                  : []),
                ...(a.role === 'super_admin' && !a.idp_bound
                  ? [
                      {
                        label: a.is_break_glass ? 'Unmark break-glass' : 'Mark as break-glass',
                        onClick: () => setPending({ kind: 'breakglass', admin: a }),
                      },
                    ]
                  : []),
                ...(a.idp_bound
                  ? [
                      {
                        label: 'Remove identity provider binding',
                        onClick: () => setPending({ kind: 'unbind', admin: a }),
                      },
                    ]
                  : []),
                {
                  label: 'Reset two-step verification',
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
      ? `${pending.admin.email} will be signed out of the console and must set up two-step verification again the next time they open it. Use this when they lose their authenticator. Their password is their account's and is reset from the sign-in page.`
      : pending?.kind === 'toggle'
        ? pending.admin.is_active
          ? `${pending.admin.email} will no longer be able to open the console.`
          : `${pending.admin.email} will be able to sign in again.`
        : pending?.kind === 'role'
          ? `${pending.admin.email} becomes ${roleLabel(pending.role)}.`
          : pending?.kind === 'breakglass'
            ? pending.admin.is_break_glass
              ? `${pending.admin.email} becomes a normal administrator: it can be bound to the identity provider and is subject to "require IdP".`
              : `${pending.admin.email} becomes a local emergency-access account: never bound to the identity provider, allowed to use its password when the IdP is required, and every sign-in alerts all administrators.`
            : pending?.kind === 'test'
              ? `Records ${pending.admin.email}'s last sign-in as its periodic test. Confirm only if that sign-in was a planned test, not an emergency or an unexpected use.`
              : pending?.kind === 'unbind'
                ? `${pending.admin.email} is signed out of the console. Their next identity-provider sign-in binds them again by verified email.`
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
            ? 'Reset two-step verification?'
            : pending?.kind === 'toggle'
              ? pending.admin.is_active
                ? 'Deactivate administrator?'
                : 'Reactivate administrator?'
              : pending?.kind === 'breakglass'
                ? pending.admin.is_break_glass
                  ? 'Unmark break-glass?'
                  : 'Mark as break-glass?'
                : pending?.kind === 'test'
                  ? 'Confirm break-glass test?'
                  : pending?.kind === 'unbind'
                    ? 'Remove identity provider binding?'
                    : 'Change role?'
        }
        desc={desc}
        confirmText="Confirm"
        destructive={
          pending?.kind === 'reset' ||
          pending?.kind === 'unbind' ||
          (pending?.kind === 'toggle' && pending.admin.is_active)
        }
        isLoading={busy}
        handleConfirm={() => void confirm()}
      />
    </Main>
  )
}
