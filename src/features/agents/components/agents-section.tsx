'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Bot, Loader2, Search, Download, Trash2, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'
import { useUrlFilter } from '@/hooks/use-url-param'
import { Can, Permission } from '@/lib/permissions'

import { AddAgentDialog } from './add-agent-dialog'
import { EditAgentDialog } from './edit-agent-dialog'
import { RegenerateKeyDialog } from './regenerate-key-dialog'
import { AgentConfigDialog } from './agent-config-dialog'
import { AgentDetailSheet } from './agent-detail-sheet'
import { AgentTable } from './agent-table'
import {
  useAgents,
  useTenantAgentStats,
  useDeleteAgent,
  useBulkDeleteAgents,
  useActivateAgent,
  useDeactivateAgent,
  useRevokeAgent,
  invalidateAgentsCache,
} from '@/lib/api/agent-hooks'
import type { AgentListFilters, Agent } from '@/lib/api/agent-types'
import { PlatformStatsCard } from '@/features/platform'
import {
  BulkActionBar,
  EmptyState,
  ErrorState,
  MetricStrip,
  PageHeader,
  type MetricStripItem,
} from '@/features/shared'

type ModeFilter = 'all' | 'daemon' | 'standalone' | 'collector'
type AgentTypeFilter = 'runner' | 'worker' | 'collector' | 'sensor'

interface AgentsSectionProps {
  typeFilter?: AgentTypeFilter
  /** Page title and description; the section renders the page header. */
  title?: string
  description?: string
}

interface AgentStats {
  total: number
  online: number
  offline: number
  error: number
  activeJobs: number
  byMode: {
    daemon: number
    standalone: number
  }
  byType: {
    collector: number
  }
}

// Check if agent is online using the health field from backend
function isAgentOnline(agent: Agent): boolean {
  // Only active agents can be online
  if (agent.status !== 'active') return false
  // Use the health field from backend (heartbeat-based)
  return agent.health === 'online'
}

// Get metrics for an agent - uses real data from backend
function getAgentMetrics(agent: Agent) {
  if (agent.status !== 'active' || agent.health !== 'online') {
    return { cpu: 0, memory: 0, activeJobs: 0 }
  }
  // Use real metrics from backend
  return {
    cpu: agent.cpu_percent || 0,
    memory: agent.memory_percent || 0,
    activeJobs: agent.active_jobs || 0,
  }
}

function calculateStats(agents: Agent[]): AgentStats {
  const daemonAgents = agents.filter((w) => w.execution_mode === 'daemon')
  const onlineAgents = agents.filter(isAgentOnline)

  // Calculate total active jobs from online daemon agents
  const totalActiveJobs = daemonAgents
    .filter(isAgentOnline)
    .reduce((sum, a) => sum + getAgentMetrics(a).activeJobs, 0)

  const total = agents.length
  const online = onlineAgents.length
  const error = agents.filter((w) => w.health === 'error').length

  return {
    total,
    online,
    // Offline is everything that is neither online nor errored (offline/unknown
    // health, disabled/revoked status, ...). Deriving it as the remainder keeps
    // the KPI buckets reconciling to Total (online + offline + error === total)
    // instead of double-counting e.g. a disabled agent whose health is offline.
    offline: Math.max(total - online - error, 0),
    error,
    activeJobs: totalActiveJobs,
    byMode: {
      daemon: daemonAgents.length,
      standalone: agents.filter((w) => w.execution_mode === 'standalone').length,
    },
    byType: {
      collector: agents.filter((w) => w.type === 'collector').length,
    },
  }
}

export function AgentsSection({
  typeFilter,
  title = 'Agents',
  description = 'Agents run your scans and collect data. Add one, then deploy it with its API key.',
}: AgentsSectionProps) {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [regenerateKeyDialogOpen, setRegenerateKeyDialogOpen] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // Selected agent for dialogs
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)

  // View and filter states
  // Filters and search live in the URL so a filtered view can be shared.
  const [modeParam, setModeFilter] = useUrlFilter('mode', 'all')
  const [statusFilter, setStatusFilter] = useUrlFilter('status', 'all')
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const activeTab = modeParam as ModeFilter
  const [_filters] = useState<AgentListFilters>({})

  // Row selection (owned by the table; mirrored here for the bulk-action bar)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionEpoch, setSelectionEpoch] = useState(0)
  const clearSelection = useCallback(() => setSelectionEpoch((n) => n + 1), [])

  // API data
  const { data: agentsData, error, isLoading, mutate } = useAgents(_filters)
  const agents: Agent[] = useMemo(() => agentsData?.items ?? [], [agentsData?.items])

  // Tenant-wide aggregated stats — independent of pagination/filters so the
  // top stat cards always reflect the FULL dataset, not just the current page.
  const { data: tenantAgentStats } = useTenantAgentStats()

  // Mutations
  const { trigger: deleteAgentTrigger, isMutating: isDeleting } = useDeleteAgent(
    selectedAgent?.id || ''
  )
  const { trigger: bulkDeleteAgentsTrigger, isMutating: isBulkDeleting } = useBulkDeleteAgents()
  const { trigger: activateAgentTrigger } = useActivateAgent(selectedAgent?.id || '')
  const { trigger: deactivateAgentTrigger } = useDeactivateAgent(selectedAgent?.id || '')
  const { trigger: revokeAgentTrigger } = useRevokeAgent(selectedAgent?.id || '')

  // Apply type filter first if provided
  const typeFilteredAgents = useMemo(() => {
    if (!typeFilter) return agents
    return agents.filter((a) => a.type === typeFilter)
  }, [agents, typeFilter])

  // Stats — prefer the API-aggregated tenant stats (accurate across all
  // pages); fall back to per-page calculation if the stats request hasn't
  // resolved yet (or for the type-filtered case where we filter client-side).
  const stats = useMemo(() => {
    if (tenantAgentStats && !typeFilter) {
      // Single source of truth: derive every status bucket from the tenant
      // total so Total === Online + Offline + Error. `online_active` counts
      // agents that are both active AND health='online'; Offline is the
      // remainder (offline/unknown health + disabled/revoked status), which
      // avoids double-counting an agent across by_health and by_status.
      const total = tenantAgentStats.total
      const online = tenantAgentStats.online_active ?? tenantAgentStats.by_health?.online ?? 0
      const error = tenantAgentStats.by_health?.error ?? 0
      return {
        total,
        online,
        offline: Math.max(total - online - error, 0),
        error,
        activeJobs: tenantAgentStats.active_jobs,
        byMode: {
          daemon: tenantAgentStats.by_execution_mode?.daemon ?? 0,
          standalone: tenantAgentStats.by_execution_mode?.standalone ?? 0,
        },
        byType: {
          collector: tenantAgentStats.by_type?.collector ?? 0,
        },
      }
    }
    return calculateStats(typeFilteredAgents)
  }, [tenantAgentStats, typeFilter, typeFilteredAgents])

  // Filter agents based on tab, status, and search
  const filteredAgents = useMemo(() => {
    let result = [...typeFilteredAgents]

    // Filter by tab (execution mode / type)
    if (activeTab === 'daemon') {
      result = result.filter((a) => a.execution_mode === 'daemon')
    } else if (activeTab === 'standalone') {
      result = result.filter((a) => a.execution_mode === 'standalone')
    } else if (activeTab === 'collector') {
      result = result.filter((a) => a.type === 'collector')
    }

    // Filter by status/health
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'online':
          result = result.filter((a) => a.status === 'active' && a.health === 'online')
          break
        case 'offline':
          result = result.filter(
            (a) => a.status === 'active' && (a.health === 'offline' || a.health === 'unknown')
          )
          break
        case 'error':
          result = result.filter((a) => a.health === 'error')
          break
        case 'disabled':
          result = result.filter((a) => a.status === 'disabled')
          break
        case 'revoked':
          result = result.filter((a) => a.status === 'revoked')
          break
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description?.toLowerCase().includes(query) ||
          a.hostname?.toLowerCase().includes(query) ||
          a.ip_address?.toLowerCase().includes(query)
      )
    }

    return result
  }, [typeFilteredAgents, activeTab, statusFilter, searchQuery])

  // Handlers
  const handleRefresh = useCallback(async () => {
    await invalidateAgentsCache()
    await mutate()
    toast.success('Agents refreshed')
  }, [mutate])

  const handleViewAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    setDetailSheetOpen(true)
  }, [])

  const handleEditAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    setDetailSheetOpen(false)
    setEditDialogOpen(true)
  }, [])

  const handleRegenerateKey = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    setDetailSheetOpen(false)
    setRegenerateKeyDialogOpen(true)
  }, [])

  const handleViewConfig = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    setDetailSheetOpen(false)
    setConfigDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    setDetailSheetOpen(false)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedAgent) return
    try {
      await deleteAgentTrigger()
      toast.success(`Agent "${selectedAgent.name}" deleted`)
      await invalidateAgentsCache()
      setDeleteDialogOpen(false)
      setSelectedAgent(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete agent'))
    }
  }, [selectedAgent, deleteAgentTrigger])

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedIds.length === 0) return

    try {
      const results = await bulkDeleteAgentsTrigger(selectedIds)
      const successCount = results?.filter((r) => r.success).length || 0
      const failCount = results?.filter((r) => !r.success).length || 0

      if (failCount === 0) {
        toast.success(`${successCount} agent(s) deleted successfully`)
      } else if (successCount > 0) {
        toast.warning(`${successCount} deleted, ${failCount} failed`)
      } else {
        toast.error('Failed to delete agents')
      }

      await invalidateAgentsCache()
      setBulkDeleteDialogOpen(false)
      clearSelection()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete agents'))
    }
  }, [selectedIds, bulkDeleteAgentsTrigger, clearSelection])

  const handleActivateAgent = useCallback(
    async (agent: Agent) => {
      setSelectedAgent(agent)
      try {
        const updatedAgent = await activateAgentTrigger()
        toast.success(`Agent "${agent.name}" activated`)
        await invalidateAgentsCache()
        await mutate()
        // Update selectedAgent with the response from API
        if (updatedAgent) {
          setSelectedAgent(updatedAgent)
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to activate agent'))
      }
    },
    [activateAgentTrigger, mutate]
  )

  const handleDeactivateAgent = useCallback(
    async (agent: Agent) => {
      setSelectedAgent(agent)
      try {
        const updatedAgent = await deactivateAgentTrigger()
        toast.success(`Agent "${agent.name}" deactivated`)
        await invalidateAgentsCache()
        await mutate()
        // Update selectedAgent with the response from API
        if (updatedAgent) {
          setSelectedAgent(updatedAgent)
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to deactivate agent'))
      }
    },
    [deactivateAgentTrigger, mutate]
  )

  const handleRevokeAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    setDetailSheetOpen(false)
    setRevokeDialogOpen(true)
  }, [])

  const [isRevoking, setIsRevoking] = useState(false)

  const handleRevokeConfirm = useCallback(async () => {
    if (!selectedAgent) return
    setIsRevoking(true)
    try {
      const updatedAgent = await revokeAgentTrigger()
      toast.success(`Agent "${selectedAgent.name}" access revoked`)
      await invalidateAgentsCache()
      await mutate()
      setRevokeDialogOpen(false)
      // Update selectedAgent with the response from API
      if (updatedAgent) {
        setSelectedAgent(updatedAgent)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to revoke agent'))
    } finally {
      setIsRevoking(false)
    }
  }, [selectedAgent, revokeAgentTrigger, mutate])

  const handleExport = useCallback(() => {
    const csv = [
      ['Name', 'Type', 'Status', 'Mode', 'Scans', 'Findings', 'Last Seen'].join(','),
      ...agents.map((w) =>
        [
          w.name,
          w.type,
          w.status,
          w.execution_mode,
          w.total_scans,
          w.total_findings,
          w.last_seen_at || 'Never',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'agents.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Agents exported')
  }, [agents])

  // Each status metric toggles the matching status filter.
  const toggleStatus = (value: string) => setStatusFilter(statusFilter === value ? 'all' : value)
  const metrics: MetricStripItem[] = [
    { key: 'total', label: 'Agents', value: stats.total },
    {
      key: 'online',
      label: 'Online',
      value: stats.online,
      onClick: () => toggleStatus('online'),
      active: statusFilter === 'online',
    },
    {
      key: 'offline',
      label: 'Offline',
      value: stats.offline,
      onClick: () => toggleStatus('offline'),
      active: statusFilter === 'offline',
    },
    {
      key: 'error',
      label: 'Error',
      value: stats.error,
      tone: 'danger',
      onClick: () => toggleStatus('error'),
      active: statusFilter === 'error',
    },
    { key: 'jobs', label: 'Active jobs', value: stats.activeJobs },
  ]

  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, host or IP…"
          aria-label="Search agents"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 ps-9"
        />
      </div>
      <Select value={activeTab} onValueChange={setModeFilter}>
        <SelectTrigger className="h-9 w-[150px]" aria-label="Mode">
          <SelectValue placeholder="All modes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modes ({stats.total})</SelectItem>
          <SelectItem value="daemon">Daemon ({stats.byMode.daemon})</SelectItem>
          <SelectItem value="standalone">CI/CD ({stats.byMode.standalone})</SelectItem>
          <SelectItem value="collector">Collectors ({stats.byType.collector})</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[140px]" aria-label="Status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="online">Online</SelectItem>
          <SelectItem value="offline">Offline</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="disabled">Disabled</SelectItem>
          <SelectItem value="revoked">Revoked</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  const hasFilter = !!searchQuery || activeTab !== 'all' || statusFilter !== 'all'

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="agents" error={error} onRetry={handleRefresh} />
  } else if (isLoading) {
    body = <TableSkeleton rows={5} />
  } else if (typeFilteredAgents.length === 0 && !hasFilter) {
    body = (
      <EmptyState
        icon={Bot}
        title="No agents"
        description="Create an agent to start scanning and collecting data."
        action={
          <Can permission={Permission.AgentsWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add agent
            </Button>
          </Can>
        }
      />
    )
  } else {
    body = (
      <AgentTable
        agents={filteredAgents}
        onViewAgent={handleViewAgent}
        onEditAgent={handleEditAgent}
        onActivateAgent={handleActivateAgent}
        onDeactivateAgent={handleDeactivateAgent}
        onDeleteAgent={handleDeleteClick}
        onRegenerateKey={handleRegenerateKey}
        onSelectionChange={(rows) => setSelectedIds(rows.map((a) => a.id))}
        resetSelectionKey={selectionEpoch}
        toolbarStart={toolbarStart}
        toolbarEnd={<RefreshButton onClick={handleRefresh} loading={isLoading} />}
      />
    )
  }

  return (
    <>
      <PageHeader title={title} description={description}>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Can permission={Permission.AgentsWrite}>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add agent
          </Button>
        </Can>
      </PageHeader>

      <MetricStrip className="mt-5" loading={isLoading} items={metrics} />

      <div className="mt-5">{body}</div>

      {/* Cloud-hosted platform agents: capacity and queue, separate from the
          tenant's own agents listed above, so it follows the table. */}
      <PlatformStatsCard className="mt-5" />

      <Can permission={Permission.AgentsDelete}>
        <BulkActionBar count={selectedIds.length} onClear={clearSelection} noun="agents selected">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </BulkActionBar>
      </Can>

      {/* Dialogs - Only render AddAgentDialog when open to avoid loading tools/capabilities on page load */}
      {addDialogOpen && (
        <AddAgentDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={handleRefresh}
        />
      )}

      {selectedAgent && (
        <>
          <EditAgentDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            agent={selectedAgent}
          />

          <RegenerateKeyDialog
            open={regenerateKeyDialogOpen}
            onOpenChange={setRegenerateKeyDialogOpen}
            agent={selectedAgent}
          />

          <AgentConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            agent={selectedAgent!}
          />

          <AgentDetailSheet
            agent={selectedAgent}
            open={detailSheetOpen}
            onOpenChange={setDetailSheetOpen}
            onEdit={handleEditAgent}
            onRegenerateKey={handleRegenerateKey}
            onViewConfig={handleViewConfig}
            onDelete={handleDeleteClick}
            onActivate={handleActivateAgent}
            onDeactivate={handleDeactivateAgent}
            onRevoke={handleRevokeAgent}
          />
        </>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete agent"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedAgent?.name}</strong>? This action
            cannot be undone and will invalidate the agent&apos;s API key.
          </>
        }
        confirmText="Delete"
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfirm}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete agents"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedIds.length}</strong> agent(s)? This
            action cannot be undone and will invalidate all their API keys.
          </>
        }
        confirmText="Delete all"
        destructive
        isLoading={isBulkDeleting}
        handleConfirm={handleBulkDeleteConfirm}
      />

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ban className="h-5 w-5" />
              Revoke agent access
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Permanently revoke access for <strong>{selectedAgent?.name}</strong>?
                </p>
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
                  <p className="text-xs font-medium">This is permanent</p>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    <li>- Agent loses access immediately</li>
                    <li>- Cannot be undone</li>
                    <li>- Must create new agent to restore</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use <strong>Deactivate</strong> for temporary suspension.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRevokeDialogOpen(false)
                if (selectedAgent) {
                  handleDeactivateAgent(selectedAgent)
                }
              }}
              disabled={isRevoking}
            >
              Deactivate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRevokeConfirm}
              disabled={isRevoking}
            >
              {isRevoking && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Revoke
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
