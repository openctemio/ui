'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Plus,
  FileCode2,
  Loader2,
  Search,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Archive,
  FileWarning,
  Upload,
  GitBranch,
  Cloud,
  Globe,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshButton, TableSkeleton } from '@/components/list-page-parts'
import { useUrlFilter } from '@/hooks/use-url-param'

import { AddScannerTemplateDialog } from './add-scanner-template-dialog'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  EmptyState,
  ErrorState,
  MetricStrip,
  PageHeader,
  type MetricStripItem,
  type RowAction,
} from '@/features/shared'

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
import { getErrorMessage } from '@/lib/api/error-handler'

function TemplateStatusBadge({ status }: { status: TemplateStatus }) {
  const IconMap: Record<TemplateStatus, React.ElementType> = {
    active: CheckCircle,
    pending_review: FileWarning,
    deprecated: Archive,
    revoked: XCircle,
  }
  const Icon = IconMap[status]

  // Only a revoked template is a problem worth colour; the icon carries the rest.
  return (
    <Badge variant={status === 'revoked' ? 'destructive' : 'outline'} className="gap-1">
      <Icon className="h-3 w-3" />
      {TEMPLATE_STATUS_DISPLAY_NAMES[status]}
    </Badge>
  )
}

function TemplateSourceBadge({ template }: { template: ScannerTemplate }) {
  const isManual = isManuallyUploadedTemplate(template)
  const syncSource = template.sync_source || (isManual ? 'manual' : undefined)

  const sourceConfig: Record<SyncSource, { icon: React.ElementType; label: string }> = {
    manual: { icon: Upload, label: 'Uploaded' },
    git: { icon: GitBranch, label: 'Git' },
    s3: { icon: Cloud, label: 'S3' },
    http: { icon: Globe, label: 'HTTP' },
  }

  const config = syncSource ? sourceConfig[syncSource] : sourceConfig.manual
  const Icon = config.icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1">
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
  )
}

/** A quota metric: the current count, "of max" as the hint, red once nearly full. */
function quotaMetric(
  key: string,
  label: string,
  current: number,
  max: number,
  format: (n: number) => string | number = (n) => n
): MetricStripItem {
  return {
    key,
    label,
    value: format(current),
    hint: `of ${format(max)}`,
    tone: getUsagePercentage(current, max) >= 95 ? 'danger' : 'default',
  }
}

export function ScannerTemplatesSection() {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deprecateDialogOpen, setDeprecateDialogOpen] = useState(false)

  // Selected template for dialogs
  const [selectedTemplate, setSelectedTemplate] = useState<ScannerTemplate | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useUrlFilter('q', '')
  const [typeParam, setTypeFilter] = useUrlFilter('type', 'all')
  const [statusParam, setStatusFilter] = useUrlFilter('status', 'all')
  const typeFilter = typeParam as TemplateType | 'all'
  const statusFilter = statusParam as TemplateStatus | 'all'
  const anyFilter = !!searchQuery || typeFilter !== 'all' || statusFilter !== 'all'

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

  const columns = useMemo<ColumnDef<ScannerTemplate>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Template" />,
        cell: ({ row }) => {
          const template = row.original
          return (
            <div className="min-w-0">
              <div className="truncate font-medium">{template.name}</div>
              {template.description && (
                <p
                  className="max-w-xs truncate text-sm text-muted-foreground"
                  title={template.description}
                >
                  {template.description}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: 'type',
        accessorFn: (t) => TEMPLATE_TYPE_DISPLAY_NAMES[t.template_type],
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'source',
        enableSorting: false,
        header: 'Source',
        cell: ({ row }) => <TemplateSourceBadge template={row.original} />,
      },
      {
        id: 'rules',
        accessorKey: 'rule_count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rules" />,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.original.rule_count} {row.original.rule_count === 1 ? 'rule' : 'rules'}
          </span>
        ),
      },
      {
        id: 'version',
        accessorKey: 'version',
        header: 'Version',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            v{row.original.version}
          </span>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <TemplateStatusBadge status={row.original.status} />,
      },
      {
        id: 'updated',
        accessorKey: 'updated_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.updated_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const template = row.original
          return (
            <DataTableRowActions
              actions={[
                {
                  label: 'Download',
                  icon: Download,
                  onClick: () => handleDownload(template),
                },
                ...(template.status === 'active'
                  ? ([
                      {
                        label: 'Deprecate',
                        icon: Archive,
                        onClick: () => handleDeprecateClick(template),
                        permission: Permission.ScannerTemplatesWrite,
                      },
                    ] satisfies RowAction[])
                  : []),
                {
                  label: 'Delete',
                  icon: Trash2,
                  onClick: () => handleDeleteClick(template),
                  destructive: true,
                  separatorBefore: true,
                  permission: Permission.ScannerTemplatesDelete,
                },
              ]}
            />
          )
        },
      },
    ],
    [handleDownload, handleDeprecateClick, handleDeleteClick]
  )

  const metrics: MetricStripItem[] = usageData
    ? [
        quotaMetric(
          'total',
          'Templates',
          usageData.usage.total_templates,
          usageData.quota.max_templates
        ),
        quotaMetric(
          'nuclei',
          'Nuclei',
          usageData.usage.nuclei_templates,
          usageData.quota.max_templates_nuclei
        ),
        quotaMetric(
          'semgrep',
          'Semgrep',
          usageData.usage.semgrep_templates,
          usageData.quota.max_templates_semgrep
        ),
        quotaMetric(
          'gitleaks',
          'Gitleaks',
          usageData.usage.gitleaks_templates,
          usageData.quota.max_templates_gitleaks
        ),
        quotaMetric(
          'storage',
          'Storage',
          usageData.usage.total_storage_bytes,
          usageData.quota.max_total_storage_bytes,
          formatStorageSize
        ),
      ]
    : []

  // Search and filters are applied by the API, so the table gets its own
  // server-backed search box instead of its built-in client filter.
  const toolbarStart = (
    <>
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search templates…"
          aria-label="Search templates"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 ps-9"
        />
      </div>
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-9 w-[140px]" aria-label="Template type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {TEMPLATE_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {TEMPLATE_TYPE_DISPLAY_NAMES[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-9 w-[150px]" aria-label="Status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending_review">Pending review</SelectItem>
          <SelectItem value="deprecated">Deprecated</SelectItem>
          <SelectItem value="revoked">Revoked</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  let body: React.ReactNode
  if (error) {
    body = <ErrorState title="scanner templates" error={error} onRetry={handleRefresh} />
  } else if (isLoading && !anyFilter) {
    body = <TableSkeleton rows={4} />
  } else if (!isLoading && templates.length === 0 && !anyFilter) {
    body = (
      <EmptyState
        icon={FileCode2}
        title="No scanner templates"
        description="Upload custom templates for Nuclei, Semgrep, or Gitleaks scanners."
        action={
          <Can permission={Permission.ScannerTemplatesWrite}>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Upload template
            </Button>
          </Can>
        }
      />
    )
  } else {
    // While a filter change is in flight the toolbar stays mounted (the search
    // box keeps focus); only the rows wait.
    body = (
      <DataTable
        columns={columns}
        data={templates}
        getRowId={(t) => t.id}
        showSearch={false}
        toolbarStart={toolbarStart}
        toolbarEnd={<RefreshButton onClick={handleRefresh} loading={isLoading} />}
        emptyMessage={isLoading ? 'Loading templates…' : 'No templates match these filters'}
      />
    )
  }

  return (
    <>
      <PageHeader
        title="Scanner templates"
        description="Custom Nuclei, Semgrep and Gitleaks templates — uploaded here or synced from template sources, validated and versioned."
      >
        <Can permission={Permission.ScannerTemplatesWrite}>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Upload template
          </Button>
        </Can>
      </PageHeader>

      {metrics.length > 0 && <MetricStrip className="mt-5" items={metrics} />}

      <div className="mt-5">{body}</div>

      {/* Dialogs */}
      <AddScannerTemplateDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleRefresh}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete scanner template"
        desc={
          <>
            Are you sure you want to delete <strong>{selectedTemplate?.name}</strong>? This action
            cannot be undone.
          </>
        }
        confirmText="Delete"
        destructive
        isLoading={isDeleting}
        handleConfirm={handleDeleteConfirm}
      />

      {/* Deprecate Confirmation */}
      <AlertDialog open={deprecateDialogOpen} onOpenChange={setDeprecateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deprecate scanner template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deprecate <strong>{selectedTemplate?.name}</strong>?
              Deprecated templates cannot be used in new scans.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeprecating}>Cancel</AlertDialogCancel>
            <Button variant="secondary" onClick={handleDeprecateConfirm} disabled={isDeprecating}>
              {isDeprecating && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Deprecate
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
