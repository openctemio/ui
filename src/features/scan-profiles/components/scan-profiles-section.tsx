'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus, Settings2, Star, Copy, Pencil, Trash2, Sparkles, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'

import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  ErrorState,
  PageHeader,
  type RowAction,
} from '@/features/shared'
import { AddScanProfileDialog } from './add-scan-profile-dialog'
import { EditScanProfileDialog } from './edit-scan-profile-dialog'
import { CloneScanProfileDialog } from './clone-scan-profile-dialog'
import { AddPresetDialog } from './add-preset-dialog'
import { Can, Permission } from '@/lib/permissions'
import {
  useScanProfiles,
  useDeleteScanProfile,
  useSetDefaultScanProfile,
  invalidateScanProfilesCache,
} from '@/lib/api/scan-profile-hooks'
import type { ScanProfile } from '@/lib/api/scan-profile-types'
import { INTENSITY_OPTIONS } from '../schemas/scan-profile-schema'

const getIntensityLabel = (intensity: string) =>
  INTENSITY_OPTIONS.find((i) => i.value === intensity)?.label || intensity

export function ScanProfilesSection() {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Selected profile for dialogs
  const [selectedProfile, setSelectedProfile] = useState<ScanProfile | null>(null)

  // API data
  const { data: profilesData, error, isLoading, mutate } = useScanProfiles()
  const profiles: ScanProfile[] = React.useMemo(
    () => profilesData?.items ?? [],
    [profilesData?.items]
  )

  // Delete mutation
  const { trigger: deleteProfile, isMutating: isDeleting } = useDeleteScanProfile(
    selectedProfile?.id || ''
  )

  // Set default mutation
  const { trigger: setDefaultProfile, isMutating: isSettingDefault } = useSetDefaultScanProfile(
    selectedProfile?.id || ''
  )

  // Handlers
  const handleRefresh = useCallback(async () => {
    await invalidateScanProfilesCache()
    await mutate()
    toast.success('Scan profiles refreshed')
  }, [mutate])

  const handleEditProfile = useCallback((profile: ScanProfile) => {
    setSelectedProfile(profile)
    setEditDialogOpen(true)
  }, [])

  const handleCloneProfile = useCallback((profile: ScanProfile) => {
    setSelectedProfile(profile)
    setCloneDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((profile: ScanProfile) => {
    setSelectedProfile(profile)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedProfile) return
    try {
      await deleteProfile()
      toast.success(`Profile "${selectedProfile.name}" deleted`)
      await invalidateScanProfilesCache()
      setDeleteDialogOpen(false)
      setSelectedProfile(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete profile'))
    }
  }, [selectedProfile, deleteProfile])

  const handleSetDefault = useCallback(
    async (profile: ScanProfile) => {
      setSelectedProfile(profile)
      try {
        await setDefaultProfile()
        toast.success(`"${profile.name}" set as default profile`)
        await invalidateScanProfilesCache()
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to set default profile'))
      }
    },
    [setDefaultProfile]
  )

  const columns = useMemo<ColumnDef<ScanProfile>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (p) => `${p.name} ${p.description ?? ''}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const profile = row.original
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                <span className="truncate">{profile.name}</span>
                {profile.is_default && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Default
                  </Badge>
                )}
                {profile.is_system && <Badge variant="outline">System</Badge>}
              </div>
              {profile.description && (
                <p className="truncate text-sm text-muted-foreground">{profile.description}</p>
              )}
            </div>
          )
        },
      },
      {
        id: 'intensity',
        accessorKey: 'intensity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Intensity" />,
        cell: ({ row }) => (
          <Badge variant="outline">{getIntensityLabel(row.original.intensity)}</Badge>
        ),
      },
      {
        id: 'tools',
        accessorFn: (p) => Object.values(p.tools_config || {}).filter((t) => t.enabled).length,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tools" />,
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {getValue<number>()} enabled
          </span>
        ),
      },
      {
        id: 'timeout',
        accessorKey: 'timeout_seconds',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Timeout" />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {Math.floor(row.original.timeout_seconds / 60)}m
          </span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const profile = row.original
          return (
            <Can permission={[Permission.ScanProfilesWrite, Permission.ScanProfilesDelete]}>
              <DataTableRowActions
                actions={[
                  ...(!profile.is_default
                    ? ([
                        {
                          label: 'Set as default',
                          icon: Star,
                          onClick: () => handleSetDefault(profile),
                          disabled: isSettingDefault,
                          permission: Permission.ScanProfilesWrite,
                        },
                      ] satisfies RowAction[])
                    : []),
                  {
                    label: 'Edit',
                    icon: Pencil,
                    onClick: () => handleEditProfile(profile),
                    permission: Permission.ScanProfilesWrite,
                  },
                  {
                    label: 'Clone',
                    icon: Copy,
                    onClick: () => handleCloneProfile(profile),
                    permission: Permission.ScanProfilesWrite,
                  },
                  ...(!profile.is_system
                    ? ([
                        {
                          label: 'Delete',
                          icon: Trash2,
                          onClick: () => handleDeleteClick(profile),
                          destructive: true,
                          separatorBefore: true,
                          permission: Permission.ScanProfilesDelete,
                        },
                      ] satisfies RowAction[])
                    : []),
                ]}
              />
            </Can>
          )
        },
      },
    ],
    [handleSetDefault, handleEditProfile, handleCloneProfile, handleDeleteClick, isSettingDefault]
  )

  const addMenu = (
    <Can permission={Permission.ScanProfilesWrite}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add profile
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setAddDialogOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            Create custom profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPresetDialogOpen(true)}>
            <Sparkles className="me-2 h-4 w-4" />
            Add preset profile
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Can>
  )

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="scan profiles" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={4} />
  } else if (profiles.length === 0) {
    body = (
      <EmptyState
        icon={Settings2}
        title="No scan profiles"
        description="Create a profile to define reusable scan configurations."
        action={
          <Can permission={Permission.ScanProfilesWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create profile
            </Button>
          </Can>
        }
      />
    )
  } else {
    body = (
      <DataTable
        columns={columns}
        data={profiles}
        getRowId={(p) => p.id}
        searchPlaceholder="Search profiles…"
        toolbarEnd={<RefreshButton onClick={handleRefresh} loading={isLoading} />}
        emptyMessage="No profiles match your search"
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Scan profiles"
        description="Reusable scan configurations: which tools run, how intensively, and for how long."
      >
        {addMenu}
      </PageHeader>

      <div className="mt-5">{body}</div>

      {/* Dialogs */}
      <AddScanProfileDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleRefresh}
      />

      <AddPresetDialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen} />

      {selectedProfile && (
        <>
          <EditScanProfileDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            profile={selectedProfile}
            onSuccess={handleRefresh}
          />

          <CloneScanProfileDialog
            open={cloneDialogOpen}
            onOpenChange={setCloneDialogOpen}
            profile={selectedProfile}
            onSuccess={handleRefresh}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Scan Profile"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedProfile?.name}</strong>? This action
            cannot be undone.
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
