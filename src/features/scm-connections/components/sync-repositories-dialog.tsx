'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Loader2,
  Search,
  GitBranch,
  Lock,
  Globe,
  Star,
  GitFork,
  Archive,
  CheckSquare,
  Square,
  MinusSquare,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

import { ProviderIcon } from './provider-icon'
import type { Integration, SCMRepository } from '@/features/integrations'
import type { SCMConnection } from '@/features/repositories/types/repository.types'
import { useIntegrationRepositoriesApi } from '@/features/integrations'
import {
  useCreateRepository,
  useRepositories,
  useBulkSyncRepositories,
  invalidateRepositoriesCache,
} from '@/features/repositories/hooks/use-repositories'
import type { SCMProvider } from '@/features/assets/types/asset.types'

// Helper to get scmOrganization from either Integration or SCMConnection
function getScmOrganization(connection: Integration | SCMConnection): string | undefined {
  // SCMConnection uses camelCase
  if ('scmOrganization' in connection && connection.scmOrganization) {
    return connection.scmOrganization
  }
  // Integration uses scm_extension
  if ('scm_extension' in connection && connection.scm_extension?.scm_organization) {
    return connection.scm_extension.scm_organization
  }
  return undefined
}

interface SyncRepositoriesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: Integration | SCMConnection
  onSuccess?: () => void
}

interface ImportProgress {
  total: number
  completed: number
  failed: number
  current: string
  phase: 'importing' | 'syncing'
}

export function SyncRepositoriesDialog({
  open,
  onOpenChange,
  connection,
  onSuccess,
}: SyncRepositoriesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const perPage = 50

  // Fetch repositories from SCM
  const {
    data: repoData,
    isLoading,
    error,
    mutate: refetch,
  } = useIntegrationRepositoriesApi(
    open ? connection.id : null,
    { search: searchQuery, page, per_page: perPage },
    { revalidateOnFocus: false }
  )

  // Fetch existing repositories to check which are already imported
  const { data: existingRepos, mutate: mutateExistingRepos } = useRepositories(
    { perPage: 100 },
    { revalidateOnFocus: false }
  )

  // Create a set of already imported repository full names for quick lookup
  // Check both camelCase (frontend type) and snake_case (API response) field names
  const importedRepoNames = useMemo(() => {
    const names = new Set<string>()
    if (existingRepos?.data) {
      existingRepos.data.forEach((asset) => {
        // Check camelCase field (frontend type definition)
        if (asset.repository?.fullName) {
          names.add(asset.repository.fullName.toLowerCase())
        }
        // Also check snake_case field (API might return this directly)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const repo = asset.repository as any
        if (repo?.full_name) {
          names.add(repo.full_name.toLowerCase())
        }
        // Also check asset name as fallback (repo name without org)
        if (asset.name) {
          names.add(asset.name.toLowerCase())
        }
      })
    }
    return names
  }, [existingRepos])

  const { trigger: createRepository } = useCreateRepository()
  const { trigger: bulkSync } = useBulkSyncRepositories()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedRepos(new Set())
      setPage(1)
      setIsImporting(false)
      setImportProgress(null)
    }
  }, [open])

  // Filter repositories based on search (client-side for already loaded repos)
  const filteredRepos = useMemo(() => {
    if (!repoData?.repositories) return []
    return repoData.repositories
  }, [repoData])

  // Check if a repo is already imported
  // Check both full_name (org/repo) and just repo name
  const isRepoImported = useCallback(
    (repo: SCMRepository) => {
      const fullNameLower = repo.full_name.toLowerCase()
      const nameLower = repo.name.toLowerCase()
      return importedRepoNames.has(fullNameLower) || importedRepoNames.has(nameLower)
    },
    [importedRepoNames]
  )

  // Count of repos available to import (not already imported)
  const availableToImport = useMemo(() => {
    return filteredRepos.filter((repo) => !isRepoImported(repo)).length
  }, [filteredRepos, isRepoImported])

  // Create a map for quick lookup
  const reposMap = useMemo(() => {
    const map = new Map<string, SCMRepository>()
    filteredRepos.forEach((repo) => map.set(repo.id, repo))
    return map
  }, [filteredRepos])

  // Select all / deselect all logic - only consider repos that are NOT already imported
  const selectableRepos = filteredRepos.filter((repo) => !isRepoImported(repo))
  const allSelected =
    selectableRepos.length > 0 && selectableRepos.every((repo) => selectedRepos.has(repo.id))
  const someSelected = selectableRepos.some((repo) => selectedRepos.has(repo.id))
  const indeterminate = someSelected && !allSelected

  const handleSelectAll = () => {
    if (allSelected) {
      // Deselect all
      setSelectedRepos(new Set())
    } else {
      // Select all that are NOT already imported
      const allIds = new Set(selectableRepos.map((repo) => repo.id))
      setSelectedRepos(allIds)
    }
  }

  const handleSelectRepo = (repoId: string) => {
    // Prevent selecting already imported repos
    const repo = reposMap.get(repoId)
    if (repo && isRepoImported(repo)) {
      return
    }

    const newSelected = new Set(selectedRepos)
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId)
    } else {
      newSelected.add(repoId)
    }
    setSelectedRepos(newSelected)
  }

  const handleImport = useCallback(async () => {
    if (selectedRepos.size === 0) {
      toast.error('Please select at least one repository to import')
      return
    }

    const selectedIds = Array.from(selectedRepos)
    const reposToImport = selectedIds
      .map((id) => reposMap.get(id))
      .filter((repo): repo is SCMRepository => repo !== undefined)

    if (reposToImport.length === 0) {
      toast.error('No valid repositories selected')
      return
    }

    setIsImporting(true)
    setImportProgress({
      total: reposToImport.length,
      completed: 0,
      failed: 0,
      current: '',
      phase: 'importing',
    })

    let successCount = 0
    let failCount = 0
    const importedAssetIds: string[] = []

    // Phase 1: Import repositories
    for (const repo of reposToImport) {
      setImportProgress((prev) => ({
        ...prev!,
        current: repo.name,
      }))

      try {
        const result = await createRepository({
          // Basic info
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          criticality: 'medium',
          // SCM connection info
          provider: connection.provider as SCMProvider,
          externalId: repo.id,
          repoId: repo.id,
          scmOrganization: getScmOrganization(connection),
          // URLs
          cloneUrl: repo.clone_url,
          webUrl: repo.html_url,
          sshUrl: repo.ssh_url,
          // Repository settings
          defaultBranch: repo.default_branch,
          visibility: repo.is_private ? 'private' : 'public',
          language: repo.language,
          languages: repo.languages, // Include languages if available
          topics: repo.topics,
          // Stats
          stars: repo.stars,
          forks: repo.forks,
          sizeKb: repo.size, // size from SCM is in KB
          // Timestamps from SCM
          repoCreatedAt: repo.created_at,
          repoUpdatedAt: repo.updated_at,
          repoPushedAt: repo.pushed_at,
        })
        successCount++
        // Collect asset ID for syncing
        if (result?.id) {
          importedAssetIds.push(result.id)
        }
      } catch (error) {
        failCount++
        console.error(`Failed to import ${repo.name}:`, error)
      }

      setImportProgress((prev) => ({
        ...prev!,
        completed: successCount,
        failed: failCount,
      }))
    }

    // Phase 2: Bulk sync imported repos to get full data (languages, etc.)
    if (importedAssetIds.length > 0) {
      setImportProgress({
        total: importedAssetIds.length,
        completed: 0,
        failed: 0,
        current: 'Syncing all repositories...',
        phase: 'syncing',
      })

      try {
        const syncResult = await bulkSync({ asset_ids: importedAssetIds })
        if (syncResult) {
          setImportProgress({
            total: syncResult.total_count,
            completed: syncResult.success_count,
            failed: syncResult.failed_count,
            current: 'Completed',
            phase: 'syncing',
          })
        }
      } catch (error) {
        // Sync failures are not critical
        console.warn('Failed to bulk sync repositories:', error)
        setImportProgress((prev) => ({
          ...prev!,
          completed: importedAssetIds.length,
          current: 'Sync completed with errors',
        }))
      }
    }

    setIsImporting(false)

    if (failCount === 0) {
      toast.success(`Successfully imported ${successCount} repositories`)
    } else if (successCount > 0) {
      toast.warning(`Imported ${successCount} repositories, ${failCount} failed`)
    } else {
      toast.error(`Failed to import repositories`)
    }

    // Invalidate all repositories caches to refresh the main list
    await invalidateRepositoriesCache()
    // Also refresh local existing repos data to update "Imported" badges
    await mutateExistingRepos()

    if (successCount > 0) {
      onOpenChange(false)
      onSuccess?.()
    }
  }, [
    selectedRepos,
    reposMap,
    createRepository,
    connection,
    onOpenChange,
    onSuccess,
    mutateExistingRepos,
    bulkSync,
  ])

  const handleClose = () => {
    if (isImporting) return // Don't close while importing
    setSearchQuery('')
    setSelectedRepos(new Set())
    setPage(1)
    setImportProgress(null)
    onOpenChange(false)
  }

  const progressPercent = importProgress
    ? ((importProgress.completed + importProgress.failed) / importProgress.total) * 100
    : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Repositories
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <ProviderIcon provider={connection.provider} className="h-4 w-4" />
            {connection.name}
            {getScmOrganization(connection) && (
              <Badge variant="secondary" className="text-xs">
                {getScmOrganization(connection)}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Import Progress */}
        {isImporting && importProgress && (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Importing: {importProgress.current}</span>
              <span className="text-muted-foreground">
                {importProgress.completed + importProgress.failed} / {importProgress.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {importProgress.failed > 0 && (
              <p className="text-xs text-red-500">{importProgress.failed} failed</p>
            )}
          </div>
        )}

        {/* Search and Select All */}
        <div className="flex items-center gap-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="pl-9"
              disabled={isImporting}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isImporting}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Repository List */}
        <div className="border rounded-lg overflow-hidden">
          {/* Header with Select All */}
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 hover:text-primary transition-colors disabled:opacity-50"
              disabled={filteredRepos.length === 0 || isImporting}
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : indeterminate ? (
                <MinusSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {allSelected ? 'Deselect All' : 'Select All'}
              </span>
            </button>
            <span className="text-sm text-muted-foreground ml-auto">
              {repoData?.total ?? 0} repositories
              {availableToImport < (repoData?.total ?? 0) && (
                <span className="text-muted-foreground"> ({availableToImport} available)</span>
              )}
              {selectedRepos.size > 0 && (
                <span className="text-primary font-medium"> - {selectedRepos.size} selected</span>
              )}
            </span>
          </div>

          {/* Repository List Content */}
          <ScrollArea className="h-[280px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading repositories...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <p className="text-sm text-red-500">
                  {error instanceof Error ? error.message : 'Failed to load repositories'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="flex items-center justify-center h-full py-12">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No repositories match your search' : 'No repositories found'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredRepos.map((repo) => {
                  const alreadyImported = isRepoImported(repo)
                  return (
                    <RepositoryItem
                      key={repo.id}
                      repo={repo}
                      selected={selectedRepos.has(repo.id)}
                      onSelect={() => handleSelectRepo(repo.id)}
                      disabled={isImporting || alreadyImported}
                      isImported={alreadyImported}
                    />
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {repoData && repoData.has_more && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading || isImporting}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!repoData.has_more || isLoading || isImporting}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImporting || selectedRepos.size === 0}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import {selectedRepos.size > 0 ? `${selectedRepos.size} ` : ''}
            {selectedRepos.size === 1 ? 'Repository' : 'Repositories'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface RepositoryItemProps {
  repo: SCMRepository
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  isImported?: boolean
}

function RepositoryItem({ repo, selected, onSelect, disabled, isImported }: RepositoryItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-colors',
        !isImported && 'hover:bg-muted/50 cursor-pointer',
        selected && 'bg-primary/5',
        isImported && 'opacity-60 bg-muted/20',
        disabled && !isImported && 'opacity-50 pointer-events-none'
      )}
      onClick={disabled || isImported ? undefined : onSelect}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={disabled || isImported ? undefined : onSelect}
        disabled={disabled || isImported}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium truncate', isImported && 'text-muted-foreground')}>
            {repo.name}
          </span>
          {repo.is_private ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {repo.is_fork && <GitFork className="h-3.5 w-3.5 text-muted-foreground" />}
          {isImported && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
              Imported
            </Badge>
          )}
          {repo.is_archived && (
            <Badge variant="secondary" className="text-xs">
              <Archive className="h-3 w-3 mr-1" />
              Archived
            </Badge>
          )}
        </div>
        {repo.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {repo.language}
            </span>
          )}
          {repo.default_branch && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {repo.default_branch}
            </span>
          )}
          {repo.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {repo.stars}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
