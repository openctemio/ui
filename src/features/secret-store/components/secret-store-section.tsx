'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Plus,
  KeyRound,
  AlertCircle,
  Pencil,
  Trash2,
  GitBranch,
  Cloud,
  Key,
  Lock,
  Terminal,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'

import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  ErrorState,
  PageHeader,
} from '@/features/shared'
import { AddCredentialDialog } from './add-credential-dialog'
import { EditCredentialDialog } from './edit-credential-dialog'
import { Can, Permission } from '@/lib/permissions'

// Note: Using CredentialsWrite/CredentialsRead permissions for secret store.
// The backend uses scans:credentials:* but the frontend maps to findings:credentials:*.
import {
  useSecretStoreCredentials,
  useDeleteSecretStoreCredential,
  invalidateSecretStoreCache,
} from '@/lib/api/secret-store-hooks'
import type { SecretStoreCredential, CredentialType } from '@/lib/api/secret-store-types'
import {
  CREDENTIAL_TYPE_DISPLAY_NAMES,
  isCredentialExpired,
  isCredentialExpiringSoon,
  formatLastUsed,
} from '@/lib/api/secret-store-types'

const CREDENTIAL_TYPE_ICONS: Record<CredentialType, React.ElementType> = {
  api_key: Key,
  basic_auth: Lock,
  bearer_token: GitBranch,
  ssh_key: Terminal,
  aws_role: Cloud,
  gcp_service_account: Cloud,
  azure_service_principal: Cloud,
  github_app: GitBranch,
  gitlab_token: GitBranch,
}

function CredentialStatusBadge({ credential }: { credential: SecretStoreCredential }) {
  if (isCredentialExpired(credential)) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Expired
      </Badge>
    )
  }
  if (isCredentialExpiringSoon(credential)) {
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expiring soon
      </Badge>
    )
  }
  return <Badge variant="outline">Active</Badge>
}

export function SecretStoreSection() {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Selected credential for dialogs
  const [selectedCredential, setSelectedCredential] = useState<SecretStoreCredential | null>(null)

  // API data
  const { data: credentialsData, error, isLoading, mutate } = useSecretStoreCredentials()
  const credentials: SecretStoreCredential[] = React.useMemo(
    () => credentialsData?.items ?? [],
    [credentialsData?.items]
  )

  // Delete mutation
  const { trigger: deleteCredential, isMutating: isDeleting } = useDeleteSecretStoreCredential(
    selectedCredential?.id || ''
  )

  // Handlers
  const handleRefresh = useCallback(async () => {
    await invalidateSecretStoreCache()
    await mutate()
    toast.success('Credentials refreshed')
  }, [mutate])

  const handleEditCredential = useCallback((credential: SecretStoreCredential) => {
    setSelectedCredential(credential)
    setEditDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((credential: SecretStoreCredential) => {
    setSelectedCredential(credential)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedCredential) return
    try {
      await deleteCredential()
      toast.success(`Credential "${selectedCredential.name}" deleted`)
      await invalidateSecretStoreCache()
      setDeleteDialogOpen(false)
      setSelectedCredential(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete credential'))
    }
  }, [selectedCredential, deleteCredential])

  const columns = useMemo<ColumnDef<SecretStoreCredential>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (c) => `${c.name} ${c.description ?? ''}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Credential" />,
        cell: ({ row }) => {
          const credential = row.original
          const Icon = CREDENTIAL_TYPE_ICONS[credential.credential_type] || Key
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate font-medium">{credential.name}</div>
                {credential.description && (
                  <p
                    className="max-w-xs truncate text-sm text-muted-foreground"
                    title={credential.description}
                  >
                    {credential.description}
                  </p>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: 'type',
        accessorFn: (c) => CREDENTIAL_TYPE_DISPLAY_NAMES[c.credential_type],
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'status',
        enableSorting: false,
        header: 'Status',
        cell: ({ row }) => <CredentialStatusBadge credential={row.original} />,
      },
      {
        id: 'last_used',
        accessorFn: (c) => c.last_used_at ?? '',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Last used" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatLastUsed(row.original.last_used_at)}
          </span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Can permission={Permission.CredentialsWrite}>
            <DataTableRowActions
              actions={[
                {
                  label: 'Edit',
                  icon: Pencil,
                  onClick: () => handleEditCredential(row.original),
                  permission: Permission.CredentialsWrite,
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  onClick: () => handleDeleteClick(row.original),
                  destructive: true,
                  separatorBefore: true,
                  permission: Permission.CredentialsWrite,
                },
              ]}
            />
          </Can>
        ),
      },
    ],
    [handleEditCredential, handleDeleteClick]
  )

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="credentials" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={3} />
  } else if (credentials.length === 0) {
    body = (
      <EmptyState
        icon={KeyRound}
        title="No credentials"
        description="Add credentials to authenticate with template sources."
        action={
          <Can permission={Permission.CredentialsWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add credential
            </Button>
          </Can>
        }
      />
    )
  } else {
    body = (
      <DataTable
        columns={columns}
        data={credentials}
        getRowId={(c) => c.id}
        searchPlaceholder="Search credentials…"
        toolbarEnd={<RefreshButton onClick={handleRefresh} loading={isLoading} />}
        emptyMessage="No credentials match your search"
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Secret store"
        description="Encrypted credentials that template sources use to authenticate (Git tokens, cloud keys and more)."
      >
        <Can permission={Permission.CredentialsWrite}>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add credential
          </Button>
        </Can>
      </PageHeader>

      <div className="mt-5">{body}</div>

      {/* Dialogs */}
      <AddCredentialDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleRefresh}
      />

      {selectedCredential && (
        <EditCredentialDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          credential={selectedCredential}
          onSuccess={handleRefresh}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete credential"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedCredential?.name}</strong>? Template
            sources using this credential will no longer be able to authenticate. This action cannot
            be undone.
          </>
        }
        confirmText="Delete"
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfirm}
      />
    </>
  )
}
