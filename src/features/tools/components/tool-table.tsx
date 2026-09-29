'use client'

import type * as React from 'react'
import { useMemo, useCallback } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Eye,
  Settings,
  Trash2,
  ArrowUpCircle,
  ExternalLink,
  Github,
  Power,
  PowerOff,
} from 'lucide-react'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  type RowAction,
} from '@/features/shared'

import type { Tool } from '@/lib/api/tool-types'
import type { ToolCategory } from '@/lib/api/tool-category-types'
import { INSTALL_METHOD_DISPLAY_NAMES } from '@/lib/api/tool-types'
import { getCategoryNameById, getCategoryDisplayNameById } from '@/lib/api/tool-category-hooks'
import { ToolCategoryIcon } from './tool-category-icon'

interface ToolTableProps {
  tools: Tool[]
  categories?: ToolCategory[] // For looking up category name from category_id
  onViewTool: (tool: Tool) => void
  onEditTool?: (tool: Tool) => void
  onDeleteTool?: (tool: Tool) => void
  onActivateTool?: (tool: Tool) => void
  onDeactivateTool?: (tool: Tool) => void
  onCheckUpdate?: (tool: Tool) => void
  /** When true, hides edit/delete/activate/deactivate actions (for platform tools) */
  readOnly?: boolean
  /** Passed through to the DataTable toolbar (search, filters, view toggle). */
  toolbarStart?: React.ReactNode
  toolbarEnd?: React.ReactNode
  emptyMessage?: string
}

const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

export function ToolTable({
  tools,
  categories,
  onViewTool,
  onEditTool,
  onDeleteTool,
  onActivateTool,
  onDeactivateTool,
  onCheckUpdate,
  readOnly = false,
  toolbarStart,
  toolbarEnd,
  emptyMessage = 'No tools match these filters',
}: ToolTableProps) {
  const getCategoryName = useCallback(
    (tool: Tool) => getCategoryNameById(categories, tool.category_id),
    [categories]
  )
  const getCategoryDisplayName = useCallback(
    (tool: Tool) => getCategoryDisplayNameById(categories, tool.category_id),
    [categories]
  )

  const canToggle = !readOnly && Boolean(onActivateTool || onDeactivateTool)

  const columns = useMemo<ColumnDef<Tool>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (t) => `${t.display_name} ${t.name} ${t.description ?? ''}`,
        sortingFn: (a, b) => a.original.display_name.localeCompare(b.original.display_name),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Tool" />,
        cell: ({ row }) => {
          const tool = row.original
          return (
            <div className="flex min-w-0 items-center gap-3">
              {tool.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tool.logo_url}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md object-contain"
                />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                  <ToolCategoryIcon
                    category={getCategoryName(tool)}
                    className="h-4 w-4 text-muted-foreground"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium">{tool.display_name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{tool.name}</p>
              </div>
            </div>
          )
        },
      },
      {
        id: 'category',
        accessorFn: (t) => getCategoryDisplayName(t),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="gap-1">
            <ToolCategoryIcon category={getCategoryName(row.original)} className="h-3 w-3" />
            {getCategoryDisplayName(row.original)}
          </Badge>
        ),
      },
      {
        id: 'install',
        accessorFn: (t) => INSTALL_METHOD_DISPLAY_NAMES[t.install_method],
        header: ({ column }) => <DataTableColumnHeader column={column} title="Install" />,
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        id: 'version',
        accessorFn: (t) => t.current_version ?? '',
        enableSorting: false,
        header: 'Version',
        cell: ({ row }) => {
          const tool = row.original
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{tool.current_version || '–'}</span>
              {tool.has_update && tool.latest_version && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1 font-mono">
                      <ArrowUpCircle className="h-3 w-3" />
                      {tool.latest_version}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Update available</TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        },
      },
      {
        id: 'type',
        accessorFn: (t) => (t.is_builtin ? 'Built-in' : 'Custom'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'status',
        accessorFn: (t) => (t.is_active ? 'Active' : 'Inactive'),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const tool = row.original
          if (!canToggle) {
            return (
              <Badge variant={tool.is_active ? 'outline' : 'secondary'}>
                {tool.is_active ? 'Active' : 'Inactive'}
              </Badge>
            )
          }
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={tool.is_active}
                aria-label={tool.is_active ? 'Deactivate tool' : 'Activate tool'}
                onCheckedChange={() =>
                  tool.is_active ? onDeactivateTool?.(tool) : onActivateTool?.(tool)
                }
              />
              <span className="text-sm text-muted-foreground">
                {tool.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          )
        },
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const tool = row.original
          const actions: RowAction[] = [
            { label: 'View details', icon: Eye, onClick: () => onViewTool(tool) },
          ]
          if (!readOnly && !tool.is_builtin && onEditTool) {
            actions.push({ label: 'Edit', icon: Settings, onClick: () => onEditTool(tool) })
          }
          if (tool.has_update && onCheckUpdate) {
            actions.push({
              label: 'Check update',
              icon: ArrowUpCircle,
              onClick: () => onCheckUpdate(tool),
            })
          }
          if (tool.github_url) {
            const url = tool.github_url
            actions.push({ label: 'GitHub', icon: Github, onClick: () => openExternal(url) })
          }
          if (tool.docs_url) {
            const url = tool.docs_url
            actions.push({
              label: 'Documentation',
              icon: ExternalLink,
              onClick: () => openExternal(url),
            })
          }
          if (canToggle) {
            if (tool.is_active && onDeactivateTool) {
              actions.push({
                label: 'Deactivate',
                icon: PowerOff,
                onClick: () => onDeactivateTool(tool),
                separatorBefore: true,
              })
            } else if (!tool.is_active && onActivateTool) {
              actions.push({
                label: 'Activate',
                icon: Power,
                onClick: () => onActivateTool(tool),
                separatorBefore: true,
              })
            }
          }
          if (!readOnly && !tool.is_builtin && onDeleteTool) {
            actions.push({
              label: 'Delete',
              icon: Trash2,
              onClick: () => onDeleteTool(tool),
              destructive: true,
              separatorBefore: !canToggle,
            })
          }
          return <DataTableRowActions actions={actions} />
        },
      },
    ],
    [
      onViewTool,
      onEditTool,
      onDeleteTool,
      onActivateTool,
      onDeactivateTool,
      onCheckUpdate,
      readOnly,
      canToggle,
      getCategoryName,
      getCategoryDisplayName,
    ]
  )

  return (
    <DataTable
      columns={columns}
      data={tools}
      getRowId={(t) => t.id}
      showSearch={false}
      onRowClick={onViewTool}
      toolbarStart={toolbarStart}
      toolbarEnd={toolbarEnd}
      emptyMessage={emptyMessage}
    />
  )
}
