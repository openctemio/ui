'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Main } from '@/components/layout'
import { cn } from '@/lib/utils'
import {
  Search,
  RefreshCw,
  Loader2,
  Download,
  Shield,
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  X,
  Clock,
  Activity,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Database,
  Key,
  Globe,
  User,
  Server,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { useTenant } from '@/context/tenant-provider'

import { useExposures, useExposureStats, useExposureHistory } from '@/features/exposures/hooks'
import {
  ExposureStatsCards,
  ExposureSeverityBreakdown,
  ExposureStateBreakdown,
  ExposureTable,
  ExposureActionDialog,
  ExposureBulkActions,
} from '@/features/exposures/components'
import type {
  ExposureEvent,
  ExposureListFilters,
  ExposureSeverity,
  ExposureState,
} from '@/lib/api/exposure-types'

type ActionType = 'resolve' | 'accept' | 'false_positive' | 'reactivate'

// State tab type for cleaner organization
type StateTab = 'needs_attention' | 'resolved' | 'all'

export default function ExposuresPage() {
  const { currentTenant } = useTenant()
  const tenantId = currentTenant?.id || null

  // State tab - primary filter
  const [activeTab, setActiveTab] = useState<StateTab>('needs_attention')

  // Filters state
  const [filters, setFilters] = useState<ExposureListFilters>({
    page: 1,
    per_page: 20,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeverities, setSelectedSeverities] = useState<ExposureSeverity[]>([])

  // Map tab to state filters
  const getStatesForTab = (tab: StateTab): ExposureState[] | undefined => {
    switch (tab) {
      case 'needs_attention':
        return ['active']
      case 'resolved':
        return ['resolved', 'accepted', 'false_positive']
      case 'all':
        return undefined // No filter = all states
    }
  }

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Action dialog state
  const [selectedExposure, setSelectedExposure] = useState<ExposureEvent | null>(null)
  const [actionType, setActionType] = useState<ActionType | null>(null)

  // Detail sheet state
  const [detailExposure, setDetailExposure] = useState<ExposureEvent | null>(null)

  // Build filters for API based on active tab
  const apiFilters: ExposureListFilters = {
    ...filters,
    search: searchQuery || undefined,
    severities: selectedSeverities.length > 0 ? selectedSeverities : undefined,
    states: getStatesForTab(activeTab),
  }

  // Data fetching
  const {
    exposures,
    total,
    page,
    totalPages,
    isLoading: exposuresLoading,
    mutate: refreshExposures,
  } = useExposures(tenantId, apiFilters)

  const { stats, isLoading: statsLoading, mutate: refreshStats } = useExposureStats(tenantId)

  const isLoading = exposuresLoading || statsLoading

  // Handlers
  const handleRefresh = useCallback(() => {
    refreshExposures()
    refreshStats()
  }, [refreshExposures, refreshStats])

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value)
    setFilters((prev) => ({ ...prev, page: 1 }))
  }, [])

  const handleSeverityFilter = useCallback((severity: ExposureSeverity) => {
    setSelectedSeverities((prev) =>
      prev.includes(severity) ? prev.filter((s) => s !== severity) : [...prev, severity]
    )
    setFilters((prev) => ({ ...prev, page: 1 }))
  }, [])

  const handleTabChange = useCallback((tab: StateTab) => {
    setActiveTab(tab)
    setFilters((prev) => ({ ...prev, page: 1 }))
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }))
  }, [])

  const handleAction = useCallback((exposure: ExposureEvent, action: ActionType) => {
    setSelectedExposure(exposure)
    setActionType(action)
  }, [])

  const handleActionSuccess = useCallback(() => {
    handleRefresh()
    setSelectedIds([])
    // Close detail sheet after successful action
    setDetailExposure(null)
  }, [handleRefresh])

  const handleBulkResolve = useCallback(
    async (ids: string[]) => {
      // In real implementation, call bulk API
      toast.success(`${ids.length} exposures resolved`)
      handleRefresh()
    },
    [handleRefresh]
  )

  const handleBulkAccept = useCallback(
    async (ids: string[], _reason: string) => {
      toast.success(`${ids.length} exposures accepted`)
      handleRefresh()
    },
    [handleRefresh]
  )

  const handleBulkFalsePositive = useCallback(
    async (ids: string[], _reason: string) => {
      toast.success(`${ids.length} exposures marked as false positive`)
      handleRefresh()
    },
    [handleRefresh]
  )

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedSeverities([])
    setActiveTab('needs_attention')
    setFilters({ page: 1, per_page: 20 })
  }, [])

  const hasActiveFilters =
    searchQuery || selectedSeverities.length > 0 || activeTab !== 'needs_attention'

  return (
    <>
      <Main>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Exposure Events</h1>
              <p className="text-muted-foreground">Monitor and manage attack surface exposures</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <ExposureStatsCards stats={stats} isLoading={statsLoading} />

          {/* Main Content */}
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">All Exposures</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* List Tab */}
            <TabsContent value="list" className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search exposures..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Severity Filter */}
                      <div className="flex items-center gap-1">
                        {(['critical', 'high', 'medium', 'low', 'info'] as ExposureSeverity[]).map(
                          (severity) => (
                            <Button
                              key={severity}
                              variant={
                                selectedSeverities.includes(severity) ? 'default' : 'outline'
                              }
                              size="sm"
                              onClick={() => handleSeverityFilter(severity)}
                              className={cn(
                                'capitalize',
                                selectedSeverities.includes(severity) &&
                                  getSeverityButtonClass(severity)
                              )}
                            >
                              {severity}
                            </Button>
                          )
                        )}
                      </div>

                      {/* State Tabs */}
                      <div className="flex items-center gap-1 rounded-lg border p-1">
                        <Button
                          variant={activeTab === 'needs_attention' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7"
                          onClick={() => handleTabChange('needs_attention')}
                        >
                          Needs Attention
                          {stats.by_state?.active > 0 && (
                            <Badge variant="secondary" className="ml-1.5">
                              {stats.by_state.active}
                            </Badge>
                          )}
                        </Button>
                        <Button
                          variant={activeTab === 'resolved' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7"
                          onClick={() => handleTabChange('resolved')}
                        >
                          Resolved
                        </Button>
                        <Button
                          variant={activeTab === 'all' ? 'default' : 'ghost'}
                          size="sm"
                          className="h-7"
                          onClick={() => handleTabChange('all')}
                        >
                          All
                        </Button>
                      </div>

                      {/* Clear Filters */}
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          <X className="mr-1 h-4 w-4" />
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Actions */}
              {selectedIds.length > 0 && (
                <ExposureBulkActions
                  selectedIds={selectedIds}
                  onClearSelection={() => setSelectedIds([])}
                  onBulkResolve={handleBulkResolve}
                  onBulkAccept={handleBulkAccept}
                  onBulkFalsePositive={handleBulkFalsePositive}
                />
              )}

              {/* Exposures Table */}
              <ExposureTable
                exposures={exposures}
                isLoading={exposuresLoading}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onResolve={(exposure) => handleAction(exposure, 'resolve')}
                onAccept={(exposure) => handleAction(exposure, 'accept')}
                onMarkFalsePositive={(exposure) => handleAction(exposure, 'false_positive')}
                onReactivate={(exposure) => handleAction(exposure, 'reactivate')}
                onViewDetails={setDetailExposure}
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {exposures.length} of {total} exposures
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <ExposureSeverityBreakdown bySeverity={stats.by_severity} />
                <ExposureStateBreakdown byState={stats.by_state} />
              </div>

              {/* Event Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">By Event Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <EventTypeDistribution byEventType={stats.by_event_type} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Dialog */}
          <ExposureActionDialog
            exposure={selectedExposure}
            actionType={actionType}
            open={actionType !== null}
            onOpenChange={(open) => {
              if (!open) {
                setActionType(null)
                setSelectedExposure(null)
              }
            }}
            onSuccess={handleActionSuccess}
          />

          {/* Detail Sheet */}
          <ExposureDetailSheet
            exposure={detailExposure}
            open={detailExposure !== null}
            onOpenChange={(open) => !open && setDetailExposure(null)}
            onAction={(action) => {
              if (detailExposure) {
                handleAction(detailExposure, action)
              }
            }}
          />
        </div>
      </Main>
    </>
  )
}

function getSeverityButtonClass(severity: ExposureSeverity): string {
  const classes: Record<ExposureSeverity, string> = {
    critical: 'bg-red-500 hover:bg-red-600',
    high: 'bg-orange-500 hover:bg-orange-600',
    medium: 'bg-yellow-500 hover:bg-yellow-600 text-black',
    low: 'bg-blue-500 hover:bg-blue-600',
    info: 'bg-gray-500 hover:bg-gray-600',
  }
  return classes[severity]
}

interface EventTypeDistributionProps {
  byEventType: Record<string, number>
}

function EventTypeDistribution({ byEventType }: EventTypeDistributionProps) {
  if (!byEventType || Object.keys(byEventType).length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No exposure data available</div>
  }

  const entries = Object.entries(byEventType).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [_, count]) => sum + count, 0) || 1

  if (entries.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No exposure data available</div>
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 10).map(([type, count]) => {
        const percentage = ((count / total) * 100).toFixed(1)
        return (
          <div key={type} className="flex items-center gap-3">
            <div className="w-40 text-sm truncate capitalize">{type.replace(/_/g, ' ')}</div>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="w-20 text-sm text-right text-muted-foreground">
              {count} ({percentage}%)
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// EXPOSURE DETAILS CONSTANTS
// ============================================

// Sensitive field patterns
const SENSITIVE_FIELDS = ['secret_value', 'password', 'api_key', 'token', 'private_key', 'secret']

// Field labels mapping
const FIELD_LABELS: Record<string, string> = {
  credential_type: 'Type',
  secret_value: 'Secret',
  source_type: 'Source Type',
  source_url: 'Source URL',
  source_name: 'Source',
  database_host: 'Host',
  database_name: 'Database',
  database_port: 'Port',
  database_type: 'Type',
  username: 'Username',
  email: 'Email',
  domain: 'Domain',
  identifier: 'Identifier',
  ip_address: 'IP Address',
  file_path: 'File',
  repository: 'Repository',
  commit_hash: 'Commit',
  branch: 'Branch',
  line_number: 'Line',
  breach_name: 'Breach',
  breach_date: 'Date',
  is_verified: 'Verified',
  is_revoked: 'Revoked',
  discovered_at: 'Discovered',
  classification: 'Classification',
}

// Group fields by category
const FIELD_GROUPS: Record<string, { title: string; icon: typeof Key; fields: string[] }> = {
  credential: {
    title: 'Credential',
    icon: Key,
    fields: [
      'credential_type',
      'identifier',
      'username',
      'email',
      'secret_value',
      'is_verified',
      'is_revoked',
    ],
  },
  database: {
    title: 'Database',
    icon: Database,
    fields: ['database_host', 'database_name', 'database_port', 'database_type'],
  },
  source: {
    title: 'Source',
    icon: Globe,
    fields: [
      'source_type',
      'source_name',
      'source_url',
      'breach_name',
      'breach_date',
      'discovered_at',
    ],
  },
  code: {
    title: 'Code Location',
    icon: Server,
    fields: ['repository', 'file_path', 'branch', 'commit_hash', 'line_number'],
  },
  network: {
    title: 'Network',
    icon: Globe,
    fields: ['domain', 'ip_address'],
  },
}

// ============================================
// EXPOSURE DETAILS VIEW COMPONENT
// ============================================

interface ExposureDetailsViewProps {
  details: Record<string, unknown>
  secretsRevealed: boolean
  onToggleSecrets: () => void
}

function ExposureDetailsView({
  details,
  secretsRevealed,
  onToggleSecrets,
}: ExposureDetailsViewProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'number') return String(value)
    return String(value)
  }

  const isSensitiveField = (key: string): boolean => {
    return SENSITIVE_FIELDS.some((pattern) => key.toLowerCase().includes(pattern))
  }

  const maskValue = (value: string): string => {
    if (value.length <= 4) return '****'
    return (
      value.substring(0, 2) +
      '*'.repeat(Math.min(value.length - 4, 20)) +
      value.substring(value.length - 2)
    )
  }

  const isUrl = (value: string): boolean => {
    return value.startsWith('http://') || value.startsWith('https://')
  }

  // Organize details into groups
  const groupedDetails: Record<string, { key: string; value: unknown }[]> = {}
  const ungroupedDetails: { key: string; value: unknown }[] = []

  Object.entries(details).forEach(([key, value]) => {
    // Skip empty values
    if (value === null || value === undefined || value === '') return

    let found = false
    for (const [groupKey, group] of Object.entries(FIELD_GROUPS)) {
      if (group.fields.includes(key)) {
        if (!groupedDetails[groupKey]) {
          groupedDetails[groupKey] = []
        }
        groupedDetails[groupKey].push({ key, value })
        found = true
        break
      }
    }
    if (!found) {
      ungroupedDetails.push({ key, value })
    }
  })

  // Check if we have any sensitive fields
  const hasSensitiveFields = Object.keys(details).some(isSensitiveField)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Details</h4>
        {hasSensitiveFields && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onToggleSecrets}>
            {secretsRevealed ? (
              <>
                <EyeOff className="mr-1 h-3 w-3" />
                Hide Secrets
              </>
            ) : (
              <>
                <Eye className="mr-1 h-3 w-3" />
                Reveal Secrets
              </>
            )}
          </Button>
        )}
      </div>

      {/* Grouped Details */}
      {Object.entries(FIELD_GROUPS).map(([groupKey, group]) => {
        const groupItems = groupedDetails[groupKey]
        if (!groupItems || groupItems.length === 0) return null

        const GroupIcon = group.icon

        return (
          <div key={groupKey} className="rounded-lg border">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
              <GroupIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{group.title}</span>
            </div>
            <div className="divide-y">
              {groupItems.map(({ key, value }) => {
                const label =
                  FIELD_LABELS[key] ||
                  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                const stringValue = formatValue(key, value)
                const isSensitive = isSensitiveField(key)
                const displayValue =
                  isSensitive && !secretsRevealed ? maskValue(stringValue) : stringValue
                const showAsUrl = !isSensitive && isUrl(stringValue)

                return (
                  <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      {showAsUrl ? (
                        <a
                          href={stringValue}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
                        >
                          {displayValue}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span
                          className={cn(
                            'font-mono text-xs max-w-[200px] truncate',
                            isSensitive && 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {displayValue}
                        </span>
                      )}
                      {!isSensitive && stringValue !== '-' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(stringValue)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                      {isSensitive && secretsRevealed && stringValue !== '-' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(stringValue)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Ungrouped Details */}
      {ungroupedDetails.length > 0 && (
        <div className="rounded-lg border">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
            <span className="text-sm font-medium">Additional Details</span>
          </div>
          <div className="divide-y">
            {ungroupedDetails.map(({ key, value }) => {
              const label =
                FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
              const stringValue = formatValue(key, value)
              const isSensitive = isSensitiveField(key)
              const displayValue =
                isSensitive && !secretsRevealed ? maskValue(stringValue) : stringValue
              const showAsUrl = !isSensitive && isUrl(stringValue)

              return (
                <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-2">
                    {showAsUrl ? (
                      <a
                        href={stringValue}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
                      >
                        {displayValue}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span
                        className={cn(
                          'font-mono text-xs max-w-[200px] truncate',
                          isSensitive && 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {displayValue}
                      </span>
                    )}
                    {stringValue !== '-' && (!isSensitive || secretsRevealed) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(stringValue)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface ExposureDetailSheetProps {
  exposure: ExposureEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: ActionType) => void
}

function ExposureDetailSheet({ exposure, open, onOpenChange, onAction }: ExposureDetailSheetProps) {
  const { currentTenant } = useTenant()
  const [secretsRevealed, setSecretsRevealed] = useState(false)
  const { history, isLoading: historyLoading } = useExposureHistory(
    currentTenant?.id || null,
    exposure?.id || null
  )

  if (!exposure) return null

  const severityConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    critical: {
      color: 'text-red-700',
      bgColor: 'bg-red-50 dark:bg-red-950/50',
      borderColor: 'border-red-200 dark:border-red-900',
    },
    high: {
      color: 'text-orange-700',
      bgColor: 'bg-orange-50 dark:bg-orange-950/50',
      borderColor: 'border-orange-200 dark:border-orange-900',
    },
    medium: {
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/50',
      borderColor: 'border-yellow-200 dark:border-yellow-900',
    },
    low: {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 dark:bg-blue-950/50',
      borderColor: 'border-blue-200 dark:border-blue-900',
    },
    info: {
      color: 'text-gray-700',
      bgColor: 'bg-gray-50 dark:bg-gray-950/50',
      borderColor: 'border-gray-200 dark:border-gray-800',
    },
  }

  const stateConfig: Record<
    ExposureState,
    { icon: typeof Shield; label: string; color: string; bgColor: string }
  > = {
    active: {
      icon: AlertTriangle,
      label: 'Active',
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    resolved: {
      icon: ShieldCheck,
      label: 'Resolved',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    accepted: {
      icon: Shield,
      label: 'Accepted Risk',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    false_positive: {
      icon: ShieldX,
      label: 'False Positive',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    },
  }

  const StateIcon = stateConfig[exposure.state].icon
  const sevConfig = severityConfig[exposure.severity] || severityConfig.info

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Header with severity indicator */}
        <div className={cn('px-6 pt-6 pb-4 border-b', sevConfig.bgColor, sevConfig.borderColor)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getSeverityBadgeClass(exposure.severity)}>
                  {exposure.severity.toUpperCase()}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(stateConfig[exposure.state].color, 'border-current')}
                >
                  <StateIcon className="mr-1 h-3 w-3" />
                  {stateConfig[exposure.state].label}
                </Badge>
              </div>
              <SheetHeader className="p-0 space-y-1">
                <SheetTitle className="text-left text-lg leading-tight">
                  {exposure.title}
                </SheetTitle>
                <SheetDescription className="text-left">
                  {exposure.event_type.replace(/_/g, ' ')} from {exposure.source}
                </SheetDescription>
              </SheetHeader>
            </div>
          </div>

          {/* Quick Actions - prominent at top */}
          {exposure.state === 'active' && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => onAction('resolve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Resolve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction('accept')}
                className="bg-background"
              >
                <Shield className="mr-1.5 h-4 w-4" />
                Accept Risk
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction('false_positive')}
                className="bg-background"
              >
                <ShieldX className="mr-1.5 h-4 w-4" />
                False Positive
              </Button>
            </div>
          )}
          {exposure.state !== 'active' && (
            <div className="mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction('reactivate')}
                className="bg-background"
              >
                <Activity className="mr-1.5 h-4 w-4" />
                Reactivate
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Description */}
          {exposure.description && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-sm">{exposure.description}</p>
            </div>
          )}

          {/* Timeline Card */}
          <div className="rounded-lg border">
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Timeline</span>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x">
              <div className="p-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  First Seen
                </span>
                <p className="text-sm font-medium mt-1">
                  {formatDistanceToNow(new Date(exposure.first_seen_at), { addSuffix: true })}
                </p>
              </div>
              <div className="p-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Last Seen
                </span>
                <p className="text-sm font-medium mt-1">
                  {formatDistanceToNow(new Date(exposure.last_seen_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            {exposure.resolved_at && (
              <div className="p-4 border-t bg-green-50/50 dark:bg-green-950/20">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Resolved
                </span>
                <p className="text-sm font-medium mt-1 text-green-700 dark:text-green-400">
                  {formatDistanceToNow(new Date(exposure.resolved_at), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>

          {/* Details */}
          {exposure.details && Object.keys(exposure.details).length > 0 && (
            <ExposureDetailsView
              details={exposure.details}
              secretsRevealed={secretsRevealed}
              onToggleSecrets={() => setSecretsRevealed(!secretsRevealed)}
            />
          )}

          {/* State History */}
          <StateHistorySection history={history} isLoading={historyLoading} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// STATE HISTORY SECTION COMPONENT
// ============================================

const INITIAL_HISTORY_COUNT = 3

interface StateHistorySectionProps {
  history: import('@/lib/api/exposure-types').ExposureStateHistory[]
  isLoading: boolean
}

function StateHistorySection({ history, isLoading }: StateHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasMore = history.length > INITIAL_HISTORY_COUNT
  const displayedHistory = isExpanded ? history : history.slice(0, INITIAL_HISTORY_COUNT)

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">State History</span>
            {history.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {history.length}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className={cn('p-4', isExpanded && history.length > 5 && 'max-h-80 overflow-y-auto')}>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-3">
            {displayedHistory.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  'flex items-start gap-3 text-sm',
                  index !== displayedHistory.length - 1 && 'pb-3 border-b'
                )}
              >
                <div className="mt-0.5 p-1 rounded-full bg-muted">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-muted-foreground capitalize">
                      {entry.previous_state.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium capitalize">
                      {entry.new_state.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {entry.reason && (
                    <div className="mt-1.5 pl-3 border-l-2 border-muted-foreground/30">
                      <p className="text-xs text-foreground/80 italic">
                        &ldquo;{entry.reason}&rdquo;
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    {entry.changed_by_user ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {entry.changed_by_user.name || entry.changed_by_user.email}
                        </span>
                        <span>•</span>
                      </div>
                    ) : null}
                    <span>
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Show more/less button */}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <>Show less</> : <>Show all {history.length} changes</>}
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            No state changes recorded
          </p>
        )}
      </div>
    </div>
  )
}

function getSeverityBadgeClass(severity: ExposureSeverity): string {
  const classes: Record<ExposureSeverity, string> = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-blue-500 text-white',
    info: 'bg-gray-500 text-white',
  }
  return classes[severity]
}
