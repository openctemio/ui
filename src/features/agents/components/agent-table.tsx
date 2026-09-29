'use client'

import type * as React from 'react'
import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Eye,
  Settings,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Power,
  PowerOff,
} from 'lucide-react'
import { Permission } from '@/lib/permissions'
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  type RowAction,
} from '@/features/shared'

import type { Agent } from '@/lib/api/agent-types'
import { AgentTypeIcon, AGENT_TYPE_LABELS } from './agent-type-icon'

interface AgentTableProps {
  agents: Agent[]
  onViewAgent: (agent: Agent) => void
  onEditAgent: (agent: Agent) => void
  onActivateAgent: (agent: Agent) => void
  onDeactivateAgent: (agent: Agent) => void
  onDeleteAgent: (agent: Agent) => void
  onRegenerateKey: (agent: Agent) => void
  /** Selected rows, for the page's bulk-action bar. */
  onSelectionChange?: (agents: Agent[]) => void
  /** Bump to clear the selection (e.g. after a bulk delete). */
  resetSelectionKey?: number
  toolbarStart?: React.ReactNode
  toolbarEnd?: React.ReactNode
  emptyMessage?: string
}

/**
 * Admin status first (disabled / revoked), then heartbeat health. Only an
 * error is coloured; online carries a check icon, everything else is muted.
 */
function AgentStatusBadge({ agent }: { agent: Agent }) {
  if (agent.status === 'disabled' || agent.status === 'revoked') {
    return (
      <Badge variant="secondary" className="gap-1">
        <XCircle className="h-3.5 w-3.5" />
        {agent.status === 'disabled' ? 'Disabled' : 'Revoked'}
      </Badge>
    )
  }
  if (agent.health === 'error') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3.5 w-3.5" />
        Error
      </Badge>
    )
  }
  if (agent.health === 'online') {
    return (
      <Badge variant="outline" className="gap-1">
        <CheckCircle className="h-3.5 w-3.5" />
        Online
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="h-3.5 w-3.5" />
      Offline
    </Badge>
  )
}

function UsageCell({ percent }: { percent: number }) {
  return (
    <div className="flex w-24 items-center gap-2">
      <span className="w-8 text-xs tabular-nums">{percent.toFixed(0)}%</span>
      <Progress value={percent} className="h-1.5 flex-1" />
    </div>
  )
}

export function AgentTable({
  agents,
  onViewAgent,
  onEditAgent,
  onActivateAgent,
  onDeactivateAgent,
  onDeleteAgent,
  onRegenerateKey,
  onSelectionChange,
  resetSelectionKey,
  toolbarStart,
  toolbarEnd,
  emptyMessage = 'No agents match these filters',
}: AgentTableProps) {
  const columns = useMemo<ColumnDef<Agent>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'name',
        accessorFn: (a) =>
          `${a.name} ${a.description ?? ''} ${a.hostname ?? ''} ${a.ip_address ?? ''}`,
        sortingFn: (a, b) => a.original.name.localeCompare(b.original.name),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Agent" />,
        cell: ({ row }) => {
          const agent = row.original
          const host = agent.ip_address || agent.hostname
          return (
            <div className="flex min-w-0 items-center gap-3">
              <AgentTypeIcon type={agent.type} className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate font-medium">{agent.name}</p>
                {host ? (
                  <p className="truncate font-mono text-xs text-muted-foreground">{host}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">No host info</p>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: 'type',
        // Older agents can carry a type the UI has no label for; show it raw.
        accessorFn: (a) => AGENT_TYPE_LABELS[a.type] ?? a.type ?? '—',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
      },
      {
        id: 'status',
        accessorFn: (a) => (a.status === 'active' ? a.health : a.status),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <AgentStatusBadge agent={row.original} />,
      },
      {
        id: 'activeJobs',
        accessorFn: (a) => a.active_jobs || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Active jobs" />,
        cell: ({ getValue }) => <span className="text-sm tabular-nums">{getValue<number>()}</span>,
      },
      {
        id: 'cpuUsage',
        accessorFn: (a) => a.cpu_percent || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="CPU" />,
        cell: ({ getValue }) => <UsageCell percent={getValue<number>()} />,
      },
      {
        id: 'memoryUsage',
        accessorFn: (a) => a.memory_percent || 0,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Memory" />,
        cell: ({ getValue }) => <UsageCell percent={getValue<number>()} />,
      },
      {
        id: 'version',
        accessorFn: (a) => a.version ?? '',
        enableSorting: false,
        header: 'Version',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.version ? `v${row.original.version}` : '—'}
          </span>
        ),
      },
      {
        id: 'region',
        accessorFn: (a) => a.region || a.labels?.region || a.labels?.env || 'local',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Region" />,
        cell: ({ getValue }) => <span className="text-sm">{getValue<string>()}</span>,
      },
      {
        id: 'actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const agent = row.original
          const actions: RowAction[] = [
            { label: 'View details', icon: Eye, onClick: () => onViewAgent(agent) },
            {
              label: 'Edit',
              icon: Settings,
              onClick: () => onEditAgent(agent),
              permission: Permission.AgentsWrite,
            },
            {
              label: 'Regenerate API key',
              icon: KeyRound,
              onClick: () => onRegenerateKey(agent),
              permission: Permission.AgentsWrite,
            },
          ]
          if (agent.status === 'disabled' || agent.status === 'revoked') {
            actions.push({
              label: 'Activate',
              icon: Power,
              onClick: () => onActivateAgent(agent),
              separatorBefore: true,
              permission: Permission.AgentsWrite,
            })
          } else if (agent.status === 'active') {
            actions.push({
              label: 'Deactivate',
              icon: PowerOff,
              onClick: () => onDeactivateAgent(agent),
              separatorBefore: true,
              permission: Permission.AgentsWrite,
            })
          }
          actions.push({
            label: 'Delete',
            icon: Trash2,
            onClick: () => onDeleteAgent(agent),
            destructive: true,
            separatorBefore: true,
            permission: Permission.AgentsDelete,
          })
          return <DataTableRowActions actions={actions} />
        },
      },
    ],
    [onViewAgent, onEditAgent, onActivateAgent, onDeactivateAgent, onDeleteAgent, onRegenerateKey]
  )

  return (
    <DataTable
      columns={columns}
      data={agents}
      getRowId={(a) => a.id}
      showSearch={false}
      onRowClick={onViewAgent}
      onSelectionChange={onSelectionChange}
      resetSelectionKey={resetSelectionKey}
      showSelectionCount={false}
      toolbarStart={toolbarStart}
      toolbarEnd={toolbarEnd}
      emptyMessage={emptyMessage}
    />
  )
}
