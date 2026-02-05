'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  Settings2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  Star,
  Copy,
  Pencil,
  Trash2,
  MoreHorizontal,
  Sparkles,
  ChevronDown,
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

export function ScanProfilesSection() {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Selected profile for dialogs
  const [selectedProfile, setSelectedProfile] = useState<ScanProfile | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')

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

  // Filter profiles
  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles
    const query = searchQuery.toLowerCase()
    return profiles.filter(
      (p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
    )
  }, [profiles, searchQuery])

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

  const getIntensityLabel = (intensity: string) => {
    return INTENSITY_OPTIONS.find((i) => i.value === intensity)?.label || intensity
  }

  const getEnabledToolsCount = (profile: ScanProfile) => {
    return Object.values(profile.tools_config || {}).filter((t) => t.enabled).length
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load scan profiles</span>
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
        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Scan Profiles</CardTitle>
                  <CardDescription>Reusable scan configurations with tool settings</CardDescription>
                </div>
                {!isLoading && profiles.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {profiles.length}
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
                <Can permission={Permission.ScanProfilesWrite}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Profile
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setAddDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Custom Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPresetDialogOpen(true)}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Add Preset Profile
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  placeholder="Search profiles..."
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
            ) : filteredProfiles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Intensity</TableHead>
                    <TableHead>Tools</TableHead>
                    <TableHead>Timeout</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              {profile.name}
                              {profile.is_default && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star className="h-3 w-3 fill-current" />
                                  Default
                                </Badge>
                              )}
                              {profile.is_system && <Badge variant="outline">System</Badge>}
                            </div>
                            {profile.description && (
                              <p className="text-sm text-muted-foreground">{profile.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getIntensityLabel(profile.intensity)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getEnabledToolsCount(profile)} enabled
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {Math.floor(profile.timeout_seconds / 60)}m
                        </span>
                      </TableCell>
                      <TableCell>
                        <Can
                          permission={[Permission.ScanProfilesWrite, Permission.ScanProfilesDelete]}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Can permission={Permission.ScanProfilesWrite}>
                                {!profile.is_default && (
                                  <DropdownMenuItem
                                    onClick={() => handleSetDefault(profile)}
                                    disabled={isSettingDefault}
                                  >
                                    <Star className="mr-2 h-4 w-4" />
                                    Set as Default
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCloneProfile(profile)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Clone
                                </DropdownMenuItem>
                              </Can>
                              <Can permission={Permission.ScanProfilesDelete}>
                                {!profile.is_system && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-500"
                                      onClick={() => handleDeleteClick(profile)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </Can>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </Can>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Settings2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No Scan Profiles Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'No profiles match your search criteria.'
                    : 'Create a profile to define reusable scan configurations.'}
                </p>
                {!searchQuery && (
                  <Can permission={Permission.ScanProfilesWrite}>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Profile
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedProfile?.name}</strong>? This action
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
