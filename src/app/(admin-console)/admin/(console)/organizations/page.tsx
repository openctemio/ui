'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { Main } from '@/components/layout'
import { Input } from '@/components/ui/input'
import { DataTable, ErrorState, PageHeader, RelativeTime, StackedCell } from '@/features/shared'
import { useDebounce } from '@/hooks/use-debounce'
import { useOrganizations } from '@/features/admin-console/api/use-admin-organizations'
import { useAdmin } from '@/features/admin-console/components/admin-console-shell'
import { CreateOrganizationDialog } from '@/features/admin-console/components/create-organization-dialog'
import { SSOPostureBadges } from '@/features/admin-console/components/sso-posture-badges'
import { adminCan, type AdminOrganization } from '@/features/admin-console/types'

const columns: ColumnDef<AdminOrganization>[] = [
  {
    accessorKey: 'name',
    header: 'Organization',
    cell: ({ row }) => <StackedCell primary={row.original.name} secondary={row.original.slug} />,
  },
  {
    accessorKey: 'owner_emails',
    header: 'Owner',
    cell: ({ row }) => {
      const owners = row.original.owner_emails
      if (owners.length === 0)
        return <span className="text-sm text-muted-foreground">No owner</span>
      return (
        <span className="text-sm">
          {owners[0]}
          {owners.length > 1 && (
            <span className="text-muted-foreground"> +{owners.length - 1}</span>
          )}
        </span>
      )
    },
  },
  {
    accessorKey: 'active_members',
    header: 'Members',
    cell: ({ row }) => <span className="tabular-nums">{row.original.active_members}</span>,
  },
  {
    id: 'sso',
    header: 'Single sign-on',
    cell: ({ row }) => <SSOPostureBadges org={row.original} />,
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => <RelativeTime date={row.original.created_at} className="text-sm" />,
  },
]

export default function AdminOrganizationsPage() {
  const admin = useAdmin()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const debounced = useDebounce(search, 300)
  const { data, error, isLoading, mutate } = useOrganizations({
    search: debounced,
    page,
    perPage: pageSize,
  })

  return (
    <Main>
      <PageHeader
        title="Organizations"
        description="Every organization on this installation, with its size and single sign-on setup."
      >
        {adminCan(admin.role, 'ops_admin') && (
          <CreateOrganizationDialog
            onCreated={(org) => router.push(`/admin/organizations/${org.id}`)}
          />
        )}
      </PageHeader>
      <div className="mt-5">
        {error ? (
          <ErrorState title="organizations" error={error} onRetry={() => void mutate()} />
        ) : (
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            getRowId={(o) => o.id}
            isLoading={isLoading}
            showSearch={false}
            showColumnToggle={false}
            showSelectionCount={false}
            mobileCards
            onRowClick={(o) => router.push(`/admin/organizations/${o.id}`)}
            emptyMessage={
              debounced ? 'No organization matches this search' : 'No organizations yet'
            }
            manualPagination
            pageCount={data?.total_pages ?? 1}
            rowCount={data?.total ?? 0}
            pagination={{ pageIndex: page - 1, pageSize }}
            onPaginationChange={(p) => {
              // A new page size starts from the first page.
              if (p.pageSize !== pageSize) {
                setPageSize(p.pageSize)
                setPage(1)
              } else {
                setPage(p.pageIndex + 1)
              }
            }}
            toolbarStart={
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or slug..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="ps-8"
                  aria-label="Search organizations"
                />
              </div>
            }
          />
        )}
      </div>
    </Main>
  )
}
