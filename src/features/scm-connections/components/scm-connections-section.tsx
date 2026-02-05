'use client'

import { useState } from 'react'
import { Plus, Link2, AlertCircle, RefreshCw, Loader2, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'

import { AddConnectionDialog } from './add-connection-dialog'
import { SCMConnectionCard } from './scm-connection-card'
import { useSCMIntegrationsApi, invalidateSCMIntegrationsCache } from '@/features/integrations'

interface SCMConnectionsSectionProps {
  onConnectionSelect?: (connectionId: string | null) => void
  selectedConnectionId?: string | null
}

export function SCMConnectionsSection({
  onConnectionSelect,
  selectedConnectionId,
}: SCMConnectionsSectionProps) {
  const [isOpen, setIsOpen] = useState(false) // Collapsed by default
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const { data: connectionsData, error, isLoading, mutate } = useSCMIntegrationsApi()

  // Handle the API response format
  const connections = connectionsData?.data ?? []

  const handleRefresh = async () => {
    await invalidateSCMIntegrationsCache()
    await mutate()
  }

  const connectedCount = connections.filter((c) => c.status === 'connected').length
  const errorCount = connections.filter((c) => c.status === 'error').length

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load SCM connections</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message || 'An unexpected error occurred'}
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 -ml-2 h-8">
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
              />
              <Link2 className="h-4 w-4" />
              <span className="font-medium">SCM Connections</span>
              {!isLoading && connections && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {connections.length}
                  </Badge>
                  {connectedCount > 0 && (
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-xs text-green-500 border-green-500/30"
                    >
                      {connectedCount} active
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-xs text-red-500 border-red-500/30"
                    >
                      {errorCount} error
                    </Badge>
                  )}
                </div>
              )}
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : connections && connections.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => (
                <SCMConnectionCard
                  key={connection.id}
                  connection={connection}
                  repositoryCount={connection.scm_extension?.repository_count || 0}
                  selected={selectedConnectionId === connection.id}
                  onSelect={() =>
                    onConnectionSelect?.(
                      selectedConnectionId === connection.id ? null : connection.id
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Link2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">No SCM Connections</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your GitHub, GitLab, or Bitbucket account to import repositories
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Connection
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <AddConnectionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleRefresh}
      />
    </>
  )
}
