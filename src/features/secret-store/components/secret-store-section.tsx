'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  KeyRound,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  GitBranch,
  Cloud,
  Key,
  Lock,
  Terminal,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
      <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
        <AlertTriangle className="h-3 w-3" />
        Expiring Soon
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
      Active
    </Badge>
  )
}

export function SecretStoreSection() {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Selected credential for dialogs
  const [selectedCredential, setSelectedCredential] = useState<SecretStoreCredential | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')

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

  // Filter credentials
  const filteredCredentials = useMemo(() => {
    if (!searchQuery) return credentials
    const query = searchQuery.toLowerCase()
    return credentials.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.credential_type.toLowerCase().includes(query)
    )
  }, [credentials, searchQuery])

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

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load credentials</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Secret Store</CardTitle>
                  <CardDescription>
                    Securely store credentials for template sources (Git tokens, AWS keys, etc.)
                  </CardDescription>
                </div>
                {!isLoading && credentials.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {credentials.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Can permission={Permission.CredentialsWrite}>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Credential
                  </Button>
                </Can>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search credentials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredCredentials.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credential</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredentials.map((credential) => {
                    const Icon = CREDENTIAL_TYPE_ICONS[credential.credential_type] || Key
                    return (
                      <TableRow key={credential.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{credential.name}</div>
                              {credential.description && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                                        {credential.description}
                                      </p>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{credential.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CREDENTIAL_TYPE_DISPLAY_NAMES[credential.credential_type]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <CredentialStatusBadge credential={credential} />
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatLastUsed(credential.last_used_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Can
                            permission={[Permission.CredentialsWrite, Permission.CredentialsWrite]}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <Can permission={Permission.CredentialsWrite}>
                                  <DropdownMenuItem
                                    onClick={() => handleEditCredential(credential)}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                </Can>
                                <Can permission={Permission.CredentialsWrite}>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-500"
                                    onClick={() => handleDeleteClick(credential)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </Can>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </Can>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <KeyRound className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No Credentials Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'No credentials match your search criteria.'
                    : 'Add credentials to authenticate with template sources.'}
                </p>
                {!searchQuery && (
                  <Can permission={Permission.CredentialsWrite}>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Credential
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedCredential?.name}</strong>? Template
              sources using this credential will no longer be able to authenticate. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
