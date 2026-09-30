'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable, RelativeTime, StackedCell } from '@/features/shared'
import type { AdminAuditEntry } from '../types'

// Words shown in their conventional form, not sentence-cased.
const ACTION_WORDS: Record<string, string> = {
  mfa: 'two-step verification',
  sso: 'SSO',
  saml: 'SAML',
  idp: 'identity provider',
  api: 'API',
}

/** "organization.idp_create" -> "Identity provider create". */
export function humanizeAction(action: string): string {
  const [area, verb] = action.split('.')
  const words = (verb ?? area)
    .split(/[_-]+/)
    .map((w) => ACTION_WORDS[w.toLowerCase()] ?? w)
    .join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const columns: ColumnDef<AdminAuditEntry>[] = [
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => (
      <StackedCell primary={humanizeAction(row.original.action)} secondary={row.original.action} />
    ),
  },
  {
    accessorKey: 'admin_email',
    header: 'Administrator',
    cell: ({ row }) => <span className="text-sm">{row.original.admin_email}</span>,
  },
  {
    accessorKey: 'success',
    header: 'Result',
    cell: ({ row }) =>
      row.original.success ? (
        <Badge variant="secondary">Succeeded</Badge>
      ) : (
        <Badge variant="destructive">
          {row.original.response_status ? `Failed (${row.original.response_status})` : 'Failed'}
        </Badge>
      ),
  },
  {
    accessorKey: 'ip_address',
    header: 'IP address',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{row.original.ip_address || '—'}</span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: 'When',
    cell: ({ row }) => <RelativeTime date={row.original.created_at} className="text-sm" />,
  },
]

interface AdminActivityTableProps {
  entries: AdminAuditEntry[]
  isLoading?: boolean
  /** Server paging; omit for a fixed short list. */
  paging?: {
    page: number
    pageCount: number
    rowCount: number
    onPageChange: (page: number) => void
  }
  toolbarStart?: React.ReactNode
}

/** Platform admin audit trail (admin_audit_logs). */
export function AdminActivityTable({
  entries,
  isLoading,
  paging,
  toolbarStart,
}: AdminActivityTableProps) {
  return (
    <DataTable
      columns={columns}
      data={entries}
      getRowId={(e) => e.id}
      isLoading={isLoading}
      showSearch={false}
      showColumnToggle={false}
      showSelectionCount={false}
      showPagination={!!paging}
      toolbarStart={toolbarStart}
      emptyMessage="No administrator activity yet"
      mobileCards
      {...(paging && {
        manualPagination: true,
        pageCount: paging.pageCount,
        rowCount: paging.rowCount,
        pagination: { pageIndex: paging.page - 1, pageSize: 50 },
        onPaginationChange: (p: { pageIndex: number }) => paging.onPageChange(p.pageIndex + 1),
      })}
    />
  )
}
