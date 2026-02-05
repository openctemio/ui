'use client'

import { useState, useMemo, useCallback } from 'react'
import { SortingState } from '@tanstack/react-table'
import {
  Plus,
  Bot,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Zap,
  Server,
  Play,
  Database,
  Filter,
  Ban,
} from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api/error-handler'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Can, Permission } from '@/lib/permissions'

import { AddAgentDialog } from './add-agent-dialog'
import { EditAgentDialog } from './edit-agent-dialog'
import { RegenerateKeyDialog } from './regenerate-key-dialog'
import { AgentConfigDialog } from './agent-config-dialog'
import { AgentDetailSheet } from './agent-detail-sheet'
import { AgentTable } from './agent-table'
import {
  useAgents,
  useDeleteAgent,
  useBulkDeleteAgents,
  useActivateAgent,
  useDeactivateAgent,
  useRevokeAgent,
  invalidateAgentsCache,
} from '@/lib/api/agent-hooks'
import type { AgentListFilters, Agent } from '@/lib/api/agent-types'
import { PlatformStatsCard } from '@/features/platform'

type TabFilter = 'all' | 'daemon' | 'standalone' | 'collector'
type AgentTypeFilter = 'runner' | 'worker' | 'collector' | 'sensor'

interface AgentsSectionProps {
  typeFilter?: AgentTypeFilter
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

  return {
    total: agents.length,
    online: onlineAgents.length,
    // Offline includes: health='offline' or health='unknown', or disabled agents
    offline: agents.filter(
      (a) => a.health === 'offline' || a.health === 'unknown' || a.status === 'disabled'
    ).length,
    // Error count from health field
    error: agents.filter((w) => w.health === 'error').length,
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

export function AgentsSection({ typeFilter }: AgentsSectionProps) {
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
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [_filters] = useState<AgentListFilters>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Table states
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  // API data
  const { data: agentsData, error, isLoading, mutate } = useAgents(_filters)
  const agents: Agent[] = useMemo(() => agentsData?.items ?? [], [agentsData?.items])

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

  // Calculate stats
  const stats = useMemo(() => calculateStats(typeFilteredAgents), [typeFilteredAgents])

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
    const selectedIds = Object.keys(rowSelection).filter((key) => rowSelection[key])
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
      setRowSelection({})
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete agents'))
    }
  }, [rowSelection, bulkDeleteAgentsTrigger])

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
    toast.success('Agents exported')
  }, [agents])

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load agents</span>
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
        {/* Stats Cards */}
        {!isLoading && agents.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="cursor-default">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Total Agents
                </CardDescription>
                <CardTitle className="text-2xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer hover:border-green-500/50 ${statusFilter === 'online' ? 'border-green-500 ring-1 ring-green-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'online' ? 'all' : 'online')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Online
                </CardDescription>
                <CardTitle className="text-2xl text-green-500">{stats.online}</CardTitle>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer hover:border-gray-500/50 ${statusFilter === 'offline' ? 'border-gray-500 ring-1 ring-gray-500' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'offline' ? 'all' : 'offline')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-gray-400" />
                  Offline
                </CardDescription>
                <CardTitle className="text-2xl text-gray-400">{stats.offline}</CardTitle>
              </CardHeader>
            </Card>

            <Card
              className={`cursor-pointer hover:border-red-500/50 ${statusFilter === 'error' ? 'border-red-500 ring-1 ring-red-500' : ''} ${stats.error > 0 ? 'border-red-500/30' : ''}`}
              onClick={() => setStatusFilter(statusFilter === 'error' ? 'all' : 'error')}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Error
                </CardDescription>
                <CardTitle className={`text-2xl ${stats.error > 0 ? 'text-red-500' : ''}`}>
                  {stats.error}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="cursor-default">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Active Jobs
                </CardDescription>
                <CardTitle className="text-2xl text-yellow-500">{stats.activeJobs}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Platform Agents Section */}
        <PlatformStatsCard />

        {/* Main Content Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Agents</CardTitle>
                  <CardDescription>
                    {stats.total} agents - {stats.activeJobs} active jobs
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Can permission={Permission.AgentsWrite}>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Agent
                  </Button>
                </Can>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as TabFilter)}
              className="mb-4"
            >
              <TabsList>
                <TabsTrigger value="all">
                  All Agents
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {stats.total}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="daemon" className="gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Daemon
                  {stats.byMode.daemon > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 px-1.5 text-xs bg-blue-500/10 text-blue-500"
                    >
                      {stats.byMode.daemon}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="standalone" className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  CI/CD
                  {stats.byMode.standalone > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 px-1.5 text-xs bg-purple-500/10 text-purple-500"
                    >
                      {stats.byMode.standalone}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="collector" className="gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  Collectors
                  {stats.byType.collector > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 px-1.5 text-xs bg-orange-500/10 text-orange-500"
                    >
                      {stats.byType.collector}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search and Filters */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        Online
                      </span>
                    </SelectItem>
                    <SelectItem value="offline">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-gray-400" />
                        Offline
                      </span>
                    </SelectItem>
                    <SelectItem value="error">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        Error
                      </span>
                    </SelectItem>
                    <SelectItem value="disabled">
                      <span className="flex items-center gap-2">
                        <Ban className="h-3.5 w-3.5 text-amber-500" />
                        Disabled
                      </span>
                    </SelectItem>
                    <SelectItem value="revoked">
                      <span className="flex items-center gap-2">
                        <Ban className="h-3.5 w-3.5 text-gray-500" />
                        Revoked
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              {Object.keys(rowSelection).filter((k) => rowSelection[k]).length > 0 && (
                <Can permission={Permission.AgentsDelete}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {Object.keys(rowSelection).filter((k) => rowSelection[k]).length} selected
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => setBulkDeleteDialogOpen(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Can>
              )}
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredAgents.length > 0 ? (
              <AgentTable
                agents={filteredAgents}
                sorting={sorting}
                onSortingChange={setSorting}
                globalFilter={searchQuery}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                onViewAgent={handleViewAgent}
                onEditAgent={handleEditAgent}
                onActivateAgent={handleActivateAgent}
                onDeactivateAgent={handleDeactivateAgent}
                onDeleteAgent={handleDeleteClick}
                onRegenerateKey={handleRegenerateKey}
              />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No Agents Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery
                    ? 'No agents match your search. Try adjusting your search.'
                    : 'Create an agent to start scanning and collecting data.'}
                </p>
                {!searchQuery && (
                  <Can permission={Permission.AgentsWrite}>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Agent
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedAgent?.name}</strong>? This action
              cannot be undone and will invalidate the agent&apos;s API key.
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Agents</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{Object.keys(rowSelection).filter((k) => rowSelection[k]).length}</strong>{' '}
              agent(s)? This action cannot be undone and will invalidate all their API keys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete All
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Revoke Agent Access
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Permanently revoke access for <strong>{selectedAgent?.name}</strong>?
                </p>
                <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 text-sm text-amber-600 dark:text-amber-400">
                  <p className="font-medium text-xs uppercase tracking-wide">
                    Warning: Permanent Action
                  </p>
                  <ul className="mt-1.5 text-xs space-y-0.5 text-amber-600/80 dark:text-amber-400/80">
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
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
