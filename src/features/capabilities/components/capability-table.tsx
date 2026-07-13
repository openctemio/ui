'use client'

import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2, Globe, Sparkles, Wrench, Bot, Eye } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DynamicIcon } from '@/components/dynamic-icon'
import { DataTable, DataTableColumnHeader, DataTableRowActions } from '@/features/shared'

import type { Capability, CapabilityUsageStatsBatchResponse } from '@/lib/api/capability-types'

interface CapabilityTableProps {
  capabilities: Capability[]
  usageStats?: CapabilityUsageStatsBatchResponse
  onEdit?: (capability: Capability) => void
  onDelete?: (capability: Capability) => void
  onViewDetails?: (capability: Capability) => void
  readOnly?: boolean
}

// Get color class from color name
function getColorClass(color: string) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    orange: 'bg-orange-500/10 text-orange-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    lime: 'bg-lime-500/10 text-lime-500',
    teal: 'bg-teal-500/10 text-teal-500',
    indigo: 'bg-indigo-500/10 text-indigo-500',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-500',
    amber: 'bg-amber-500/10 text-amber-500',
    violet: 'bg-violet-500/10 text-violet-500',
    sky: 'bg-sky-500/10 text-sky-500',
    slate: 'bg-slate-500/10 text-slate-500',
    gray: 'bg-gray-500/10 text-gray-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
  }
  return colorMap[color] || 'bg-primary/10 text-primary'
}

// Usage badges (tool + agent counts) with tooltips — unchanged from the original.
function UsageCell({ stats }: { stats?: CapabilityUsageStatsBatchResponse[string] }) {
  if (!stats) return <span className="text-muted-foreground">-</span>
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={stats.tool_count > 0 ? 'default' : 'outline'}
            className="gap-1 cursor-help"
          >
            <Wrench className="h-3 w-3" />
            {stats.tool_count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {stats.tool_count === 0
              ? 'No tools using this capability'
              : `${stats.tool_count} tool${stats.tool_count > 1 ? 's' : ''}`}
          </p>
          {stats.tool_names && stats.tool_names.length > 0 && (
            <ul className="mt-1 text-xs text-muted-foreground">
              {stats.tool_names.slice(0, 5).map((name) => (
                <li key={name}>• {name}</li>
              ))}
              {stats.tool_names.length > 5 && <li>• +{stats.tool_names.length - 5} more</li>}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={stats.agent_count > 0 ? 'default' : 'outline'}
            className="gap-1 cursor-help"
          >
            <Bot className="h-3 w-3" />
            {stats.agent_count}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {stats.agent_count === 0
              ? 'No agents with this capability'
              : `${stats.agent_count} agent${stats.agent_count > 1 ? 's' : ''}`}
          </p>
          {stats.agent_names && stats.agent_names.length > 0 && (
            <ul className="mt-1 text-xs text-muted-foreground">
              {stats.agent_names.slice(0, 5).map((name) => (
                <li key={name}>• {name}</li>
              ))}
              {stats.agent_names.length > 5 && <li>• +{stats.agent_names.length - 5} more</li>}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export function CapabilityTable({
  capabilities,
  usageStats,
  onEdit,
  onDelete,
  onViewDetails,
  readOnly = false,
}: CapabilityTableProps) {
  const showActions = Boolean(onViewDetails || (!readOnly && (onEdit || onDelete)))

  const columns = useMemo<ColumnDef<Capability>[]>(() => {
    const cols: ColumnDef<Capability>[] = [
      {
        accessorKey: 'display_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const c = row.original
          return (
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getColorClass(c.color)}`}
              >
                <DynamicIcon name={c.icon} className="h-4 w-4" />
              </div>
              <span className="font-medium">{c.display_name}</span>
            </div>
          )
        },
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
        cell: ({ row }) => (
          <code className="text-xs text-muted-foreground">{row.original.name}</code>
        ),
      },
      {
        accessorKey: 'category',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
        cell: ({ row }) =>
          row.original.category ? (
            <Badge variant="outline" className="capitalize">
              {row.original.category}
            </Badge>
          ) : null,
      },
      {
        accessorKey: 'is_builtin',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge variant="secondary" className="gap-1">
            {row.original.is_builtin ? (
              <>
                <Globe className="h-3 w-3" />
                Platform
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                Custom
              </>
            )}
          </Badge>
        ),
      },
      {
        id: 'usage',
        header: 'Usage',
        enableSorting: false,
        cell: ({ row }) => <UsageCell stats={usageStats?.[row.original.id]} />,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-[300px] text-sm text-muted-foreground">
            {row.original.description || '-'}
          </span>
        ),
      },
    ]

    if (showActions) {
      cols.push({
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const c = row.original
          const actions = [
            ...(onViewDetails
              ? [{ label: 'View details', icon: Eye, onClick: () => onViewDetails(c) }]
              : []),
            ...(!readOnly && onEdit
              ? [{ label: 'Edit', icon: Pencil, onClick: () => onEdit(c) }]
              : []),
            ...(!readOnly && onDelete
              ? [
                  {
                    label: 'Delete',
                    icon: Trash2,
                    onClick: () => onDelete(c),
                    destructive: true,
                    separatorBefore: true,
                  },
                ]
              : []),
          ]
          return <DataTableRowActions actions={actions} />
        },
      })
    }

    return cols
  }, [usageStats, showActions, onViewDetails, onEdit, onDelete, readOnly])

  // Parent (capabilities-section) owns search + tab/category filters, so the
  // table's own search is disabled; DataTable adds sortable headers + pagination.
  return (
    <DataTable
      columns={columns}
      data={capabilities}
      showSearch={false}
      showColumnToggle={false}
      emptyMessage="No capabilities"
      emptyDescription="No capabilities match the current filters."
    />
  )
}
