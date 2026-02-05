'use client'

import { useState } from 'react'
import {
  MoreHorizontal,
  Trash2,
  RefreshCw,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api/error-handler'

import { ProviderIcon, SCM_PROVIDER_COLORS } from './provider-icon'
import { SyncRepositoriesDialog } from './sync-repositories-dialog'
import { EditConnectionDialog } from './edit-connection-dialog'
import type { Integration } from '@/features/integrations'
import { SCM_PROVIDER_LABELS } from '@/features/assets/types/asset.types'
import {
  useDeleteIntegrationApi,
  useTestIntegrationApi,
  invalidateSCMIntegrationsCache,
} from '@/features/integrations'

interface SCMConnectionCardProps {
  connection: Integration
  repositoryCount?: number
  onSelect?: () => void
  selected?: boolean
}

export function SCMConnectionCard({
  connection,
  repositoryCount = 0,
  onSelect,
  selected = false,
}: SCMConnectionCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const { trigger: deleteConnection, isMutating: isDeleting } = useDeleteIntegrationApi(
    connection.id
  )
  const { trigger: validateConnection, isMutating: isValidating } = useTestIntegrationApi(
    connection.id
  )

  const handleDelete = async () => {
    try {
      await deleteConnection()
      toast.success(`Connection "${connection.name}" deleted`)
      await invalidateSCMIntegrationsCache()
      setDeleteDialogOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete connection'))
    }
  }

  const handleValidate = async () => {
    try {
      const result = await validateConnection()
      await invalidateSCMIntegrationsCache()

      // Check if the test actually succeeded by looking at the returned status
      if (result && result.status === 'connected') {
        toast.success(`Connection "${connection.name}" validated successfully`)
      } else if (result && result.status === 'error') {
        toast.error(result.status_message || `Connection "${connection.name}" test failed`)
      } else {
        toast.warning(`Connection "${connection.name}" status: ${result?.status || 'unknown'}`)
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Validation failed'))
    }
  }

  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    connected: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      color: 'text-green-500',
      label: 'Connected',
    },
    pending: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      color: 'text-yellow-500',
      label: 'Pending',
    },
    disconnected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      color: 'text-gray-400',
      label: 'Disconnected',
    },
    error: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      color: 'text-red-500',
      label: 'Error',
    },
  }

  const status = statusConfig[connection.status] || statusConfig.disconnected

  return (
    <>
      <Card
        className={cn(
          'transition-all cursor-pointer hover:border-primary/50',
          selected && 'border-primary ring-1 ring-primary',
          connection.status === 'error' && 'border-red-500/30'
        )}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  SCM_PROVIDER_COLORS[connection.provider]
                )}
              >
                <ProviderIcon provider={connection.provider} className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{connection.name}</CardTitle>
                <CardDescription className="text-xs">
                  {SCM_PROVIDER_LABELS[connection.provider as keyof typeof SCM_PROVIDER_LABELS] ||
                    connection.provider}
                  {connection.scm_extension?.scm_organization &&
                    ` / ${connection.scm_extension.scm_organization}`}
                </CardDescription>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={handleValidate} disabled={isValidating}>
                  {isValidating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSyncDialogOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Sync Repositories
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Connection
                </DropdownMenuItem>
                {connection.base_url && (
                  <DropdownMenuItem
                    onClick={() => {
                      // Build the URL to open - include organization if available
                      let url = connection.base_url
                      const org = connection.scm_extension?.scm_organization
                      if (org) {
                        // Handle different provider URL structures
                        if (connection.provider === 'github') {
                          url = `${connection.base_url}/${org}`
                        } else if (connection.provider === 'gitlab') {
                          url = `${connection.base_url}/${org}`
                        } else if (connection.provider === 'bitbucket') {
                          url = `${connection.base_url}/${org}`
                        } else if (connection.provider === 'azure_devops') {
                          url = `${connection.base_url}/${org}`
                        }
                      }
                      window.open(url, '_blank')
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in Browser
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn('flex items-center gap-1', status.color)}>
                      {status.icon}
                      {status.label}
                    </span>
                  </TooltipTrigger>
                  {connection.status_message && connection.status === 'error' && (
                    <TooltipContent className="max-w-xs">
                      <p className="text-red-400">{connection.status_message}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Badge variant="secondary" className="text-xs">
                {repositoryCount} repos
              </Badge>
            </div>
            {connection.last_sync_at && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(connection.last_sync_at).toLocaleDateString()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last validated: {new Date(connection.last_sync_at).toLocaleString()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{connection.name}</strong>?
              {repositoryCount > 0 && (
                <> This will affect {repositoryCount} repositories that use this connection.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SyncRepositoriesDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        connection={connection}
      />

      <EditConnectionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        connection={connection}
      />
    </>
  )
}
