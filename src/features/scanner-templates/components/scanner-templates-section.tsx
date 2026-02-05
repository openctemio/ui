'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  Plus,
  FileCode2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Search,
  MoreHorizontal,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Archive,
  FileWarning,
  Filter,
  Upload,
  GitBranch,
  Cloud,
  Globe,
  Database,
} from 'lucide-react'
import { toast } from 'sonner'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { AddScannerTemplateDialog } from './add-scanner-template-dialog'
import { Can, Permission } from '@/lib/permissions'
import {
  useScannerTemplates,
  useDeleteScannerTemplate,
  useDeprecateScannerTemplate,
  useTemplateUsage,
  invalidateScannerTemplatesCache,
} from '@/lib/api/scanner-template-hooks'
import type {
  ScannerTemplate,
  TemplateType,
  TemplateStatus,
  SyncSource,
} from '@/lib/api/scanner-template-types'
import {
  TEMPLATE_TYPE_DISPLAY_NAMES,
  TEMPLATE_STATUS_DISPLAY_NAMES,
  TEMPLATE_TYPES,
  isManuallyUploadedTemplate,
  getUsagePercentage,
  formatStorageSize,
} from '@/lib/api/scanner-template-types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/api/error-handler'

function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const colorMap: Record<TemplateStatus, string> = {
    active: 'bg-green-100 text-green-700',
    pending_review: 'bg-yellow-100 text-yellow-700',
    deprecated: 'bg-gray-100 text-gray-500',
    revoked: 'bg-red-100 text-red-700',
  }

  const IconMap: Record<TemplateStatus, React.ElementType> = {
    active: CheckCircle,
    pending_review: FileWarning,
    deprecated: Archive,
    revoked: XCircle,
  }

  const Icon = IconMap[status]
  const className = colorMap[status]

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {TEMPLATE_STATUS_DISPLAY_NAMES[status]}
    </Badge>
  )
}

function TemplateTypeBadge({ type }: { type: TemplateType }) {
  const colorMap: Record<TemplateType, string> = {
    nuclei: 'bg-purple-100 text-purple-700',
    semgrep: 'bg-blue-100 text-blue-700',
    gitleaks: 'bg-orange-100 text-orange-700',
  }

  return (
    <Badge variant="outline" className={colorMap[type]}>
      {TEMPLATE_TYPE_DISPLAY_NAMES[type]}
    </Badge>
  )
}

function TemplateSourceBadge({ template }: { template: ScannerTemplate }) {
  const isManual = isManuallyUploadedTemplate(template)
  const syncSource = template.sync_source || (isManual ? 'manual' : undefined)

  const sourceConfig: Record<
    SyncSource,
    { icon: React.ElementType; label: string; className: string }
  > = {
    manual: { icon: Upload, label: 'Uploaded', className: 'bg-slate-100 text-slate-700' },
    git: { icon: GitBranch, label: 'Git', className: 'bg-emerald-100 text-emerald-700' },
    s3: { icon: Cloud, label: 'S3', className: 'bg-amber-100 text-amber-700' },
    http: { icon: Globe, label: 'HTTP', className: 'bg-sky-100 text-sky-700' },
  }

  const config = syncSource ? sourceConfig[syncSource] : sourceConfig.manual
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {isManual ? (
            <p>Uploaded directly and stored in database</p>
          ) : (
            <p>
              Synced from {config.label} source
              {template.source_path ? `: ${template.source_path}` : ''}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function UsageProgress({ current, max, label }: { current: number; max: number; label: string }) {
  const percentage = getUsagePercentage(current, max)
  const isWarning = percentage >= 80
  const isDanger = percentage >= 95

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            isDanger
              ? 'text-red-600 font-medium'
              : isWarning
                ? 'text-amber-600'
                : 'text-muted-foreground'
          }
        >
          {current} / {max}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function StorageUsageProgress({ current, max }: { current: number; max: number }) {
  const percentage = getUsagePercentage(current, max)
  const isWarning = percentage >= 80
  const isDanger = percentage >= 95

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Storage</span>
        <span
          className={
            isDanger
              ? 'text-red-600 font-medium'
              : isWarning
                ? 'text-amber-600'
                : 'text-muted-foreground'
          }
        >
          {formatStorageSize(current)} / {formatStorageSize(max)}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function ScannerTemplatesSection() {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deprecateDialogOpen, setDeprecateDialogOpen] = useState(false)

  // Selected template for dialogs
  const [selectedTemplate, setSelectedTemplate] = useState<ScannerTemplate | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TemplateType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all')

  // API data
  const filters = useMemo(
    () => ({
      template_type: typeFilter !== 'all' ? typeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchQuery || undefined,
      per_page: 100,
    }),
    [typeFilter, statusFilter, searchQuery]
  )

  const { data: templatesData, error, isLoading, mutate } = useScannerTemplates(filters)
  const templates: ScannerTemplate[] = useMemo(
    () => templatesData?.items ?? [],
    [templatesData?.items]
  )

  // Usage/quota data
  const { data: usageData } = useTemplateUsage()

  // Mutations
  const { trigger: deleteTemplate, isMutating: isDeleting } = useDeleteScannerTemplate(
    selectedTemplate?.id || ''
  )
  const { trigger: deprecateTemplate, isMutating: isDeprecating } = useDeprecateScannerTemplate(
    selectedTemplate?.id || ''
  )

  // Handlers
  const handleRefresh = useCallback(async () => {
    await invalidateScannerTemplatesCache()
    await mutate()
    toast.success('Templates refreshed')
  }, [mutate])

  const handleDeleteClick = useCallback((template: ScannerTemplate) => {
    setSelectedTemplate(template)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedTemplate) return
    try {
      await deleteTemplate()
      toast.success(`Template "${selectedTemplate.name}" deleted`)
      await invalidateScannerTemplatesCache()
      setDeleteDialogOpen(false)
      setSelectedTemplate(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete template'))
    }
  }, [selectedTemplate, deleteTemplate])

  const handleDeprecateClick = useCallback((template: ScannerTemplate) => {
    setSelectedTemplate(template)
    setDeprecateDialogOpen(true)
  }, [])

  const handleDeprecateConfirm = useCallback(async () => {
    if (!selectedTemplate) return
    try {
      await deprecateTemplate()
      toast.success(`Template "${selectedTemplate.name}" deprecated`)
      await invalidateScannerTemplatesCache()
      setDeprecateDialogOpen(false)
      setSelectedTemplate(null)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to deprecate template'))
    }
  }, [selectedTemplate, deprecateTemplate])

  const handleDownload = useCallback(async (template: ScannerTemplate) => {
    try {
      const response = await fetch(`/api/v1/scanner-templates/${template.id}/download`)
      if (!response.ok) throw new Error('Failed to download')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = template.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(`Downloaded "${template.name}"`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to download template'))
    }
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load scanner templates</span>
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
                  <FileCode2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Scanner Templates</CardTitle>
                  <CardDescription>
                    Custom templates for Nuclei, Semgrep, and Gitleaks scanners
                  </CardDescription>
                </div>
                {!isLoading && templates.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                    {templates.length}
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
                <Can permission={Permission.ScannerTemplatesWrite}>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Template
                  </Button>
                </Can>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Info Banner - How templates are stored */}
            <Alert className="mb-4 border-blue-200 bg-blue-50">
              <Database className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Template Storage:</strong> Templates can be{' '}
                <span className="font-medium">uploaded directly</span> (stored in database) or{' '}
                <span className="font-medium">synced from external sources</span> (Git, S3, HTTP).
                All templates are validated and stored securely with versioning support.
              </AlertDescription>
            </Alert>

            {/* Usage/Quota Display */}
            {usageData && (
              <div className="mb-4 rounded-lg border p-4 bg-muted/30">
                <div className="text-sm font-medium mb-3">Template Usage</div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <UsageProgress
                    current={usageData.usage.total_templates}
                    max={usageData.quota.max_templates}
                    label="Total Templates"
                  />
                  <UsageProgress
                    current={usageData.usage.nuclei_templates}
                    max={usageData.quota.max_templates_nuclei}
                    label="Nuclei"
                  />
                  <UsageProgress
                    current={usageData.usage.semgrep_templates}
                    max={usageData.quota.max_templates_semgrep}
                    label="Semgrep"
                  />
                  <UsageProgress
                    current={usageData.usage.gitleaks_templates}
                    max={usageData.quota.max_templates_gitleaks}
                    label="Gitleaks"
                  />
                  <StorageUsageProgress
                    current={usageData.usage.total_storage_bytes}
                    max={usageData.quota.max_total_storage_bytes}
                  />
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as TemplateType | 'all')}
                >
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {TEMPLATE_TYPE_DISPLAY_NAMES[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as TemplateStatus | 'all')}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                    <SelectItem value="revoked">Revoked</SelectItem>
                  </SelectContent>
                </Select>
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
            ) : templates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Rules</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                            <FileCode2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="max-w-[200px] truncate text-sm text-muted-foreground">
                                      {template.description}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-[300px]">{template.description}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TemplateTypeBadge type={template.template_type} />
                      </TableCell>
                      <TableCell>
                        <TemplateSourceBadge template={template} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {template.rule_count} {template.rule_count === 1 ? 'rule' : 'rules'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">v{template.version}</span>
                      </TableCell>
                      <TableCell>
                        <TemplateStatusBadge status={template.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(template.updated_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(template)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <Can permission={Permission.ScannerTemplatesWrite}>
                              {template.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleDeprecateClick(template)}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Deprecate
                                </DropdownMenuItem>
                              )}
                            </Can>
                            <Can permission={Permission.ScannerTemplatesDelete}>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500"
                                onClick={() => handleDeleteClick(template)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </Can>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FileCode2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-1 font-medium">No Scanner Templates Found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'No templates match your filters.'
                    : 'Upload custom templates for Nuclei, Semgrep, or Gitleaks scanners.'}
                </p>
                {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
                  <Can permission={Permission.ScannerTemplatesWrite}>
                    <Button onClick={() => setAddDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Upload Your First Template
                    </Button>
                  </Can>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddScannerTemplateDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleRefresh}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scanner Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedTemplate?.name}</strong>? This action
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

      {/* Deprecate Confirmation */}
      <AlertDialog open={deprecateDialogOpen} onOpenChange={setDeprecateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deprecate Scanner Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deprecate <strong>{selectedTemplate?.name}</strong>?
              Deprecated templates cannot be used in new scans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeprecating}>Cancel</AlertDialogCancel>
            <Button variant="secondary" onClick={handleDeprecateConfirm} disabled={isDeprecating}>
              {isDeprecating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deprecate
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
