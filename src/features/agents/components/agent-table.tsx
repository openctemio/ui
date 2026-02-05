'use client';

import { useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  Settings,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Power,
  PowerOff,
  Globe,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Can, Permission } from '@/lib/permissions';

import type { Agent } from '@/lib/api/agent-types';
import { AgentTypeIcon, AGENT_TYPE_LABELS, AGENT_TYPE_COLORS } from './agent-type-icon';

interface AgentTableProps {
  agents: Agent[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  globalFilter: string;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (selection: Record<string, boolean>) => void;
  onViewAgent: (agent: Agent) => void;
  onEditAgent: (agent: Agent) => void;
  onActivateAgent: (agent: Agent) => void;
  onDeactivateAgent: (agent: Agent) => void;
  onDeleteAgent: (agent: Agent) => void;
  onRegenerateKey: (agent: Agent) => void;
}

// Check if agent is online using the health field from backend
function _isAgentOnline(agent: Agent): boolean {
  if (agent.status !== 'active') return false;
  return agent.health === 'online';
}

export function AgentTable({
  agents,
  sorting,
  onSortingChange,
  globalFilter,
  rowSelection,
  onRowSelectionChange,
  onViewAgent,
  onEditAgent,
  onActivateAgent,
  onDeactivateAgent,
  onDeleteAgent,
  onRegenerateKey,
}: AgentTableProps) {
  const columns: ColumnDef<Agent>[] = useMemo(() => {
    const baseColumns: ColumnDef<Agent>[] = [
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
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Agent
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const agent = row.original;
          return (
            <div className="flex items-center gap-3">
              <AgentTypeIcon type={agent.type} className="h-5 w-5" />
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-xs text-muted-foreground">
                  {agent.ip_address || agent.hostname || 'No host info'}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const agent = row.original;
          return (
            <Badge variant="outline" className={AGENT_TYPE_COLORS[agent.type]}>
              {AGENT_TYPE_LABELS[agent.type]}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const agent = row.original;

          // Check admin status first
          if (agent.status === 'disabled') {
            return (
              <Badge className="bg-gray-500 text-white gap-1">
                <XCircle className="h-3.5 w-3.5" />
                Disabled
              </Badge>
            );
          }

          if (agent.status === 'revoked') {
            return (
              <Badge className="bg-gray-600 text-white gap-1">
                <XCircle className="h-3.5 w-3.5" />
                Revoked
              </Badge>
            );
          }

          // For active agents, show health status
          if (agent.health === 'error') {
            return (
              <Badge className="bg-red-500 text-white gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Error
              </Badge>
            );
          }

          if (agent.health === 'online') {
            return (
              <Badge className="bg-green-500 text-white gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Online
              </Badge>
            );
          }

          // offline or unknown
          return (
            <Badge className="bg-gray-400 text-white gap-1">
              <XCircle className="h-3.5 w-3.5" />
              Offline
            </Badge>
          );
        },
      },
    ];

    // Add remaining columns
    baseColumns.push(
      {
        id: 'activeJobs',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Active Jobs
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const agent = row.original;
          const activeJobs = agent.active_jobs || 0;
          return (
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Zap
                className={cn(
                  'h-4 w-4',
                  activeJobs > 0
                    ? 'text-amber-500 fill-amber-500/20'
                    : 'text-gray-400'
                )}
              />
              {activeJobs}
            </span>
          );
        },
      },
      {
        id: 'cpuUsage',
        header: 'CPU',
        cell: ({ row }) => {
          const agent = row.original;
          const cpuPercent = agent.cpu_percent || 0;
          return (
            <div className="flex items-center gap-2 w-24">
              <span className="text-xs w-8">{cpuPercent.toFixed(0)}%</span>
              <Progress value={cpuPercent} className="h-1.5 flex-1" />
            </div>
          );
        },
      },
      {
        id: 'memoryUsage',
        header: 'Memory',
        cell: ({ row }) => {
          const agent = row.original;
          const memoryPercent = agent.memory_percent || 0;
          return (
            <div className="flex items-center gap-2 w-24">
              <span className="text-xs w-8">{memoryPercent.toFixed(0)}%</span>
              <Progress value={memoryPercent} className="h-1.5 flex-1" />
            </div>
          );
        },
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.version ? `v${row.original.version}` : '—'}
          </span>
        ),
      },
      {
        id: 'region',
        header: 'Region',
        cell: ({ row }) => {
          const agent = row.original;
          const region = agent.region || agent.labels?.region || agent.labels?.env || 'local';
          return (
            <span className="flex items-center gap-1 text-sm">
              <Globe className="h-3 w-3 text-muted-foreground" />
              {region}
            </span>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const agent = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewAgent(agent)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <Can permission={Permission.AgentsWrite}>
                  <DropdownMenuItem onClick={() => onEditAgent(agent)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRegenerateKey(agent)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Regenerate API Key
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {agent.status === 'disabled' || agent.status === 'revoked' ? (
                    <DropdownMenuItem
                      onClick={() => onActivateAgent(agent)}
                      className="text-green-500"
                    >
                      <Power className="mr-2 h-4 w-4" />
                      Activate
                    </DropdownMenuItem>
                  ) : agent.status === 'active' ? (
                    <DropdownMenuItem
                      onClick={() => onDeactivateAgent(agent)}
                      className="text-amber-500"
                    >
                      <PowerOff className="mr-2 h-4 w-4" />
                      Deactivate
                    </DropdownMenuItem>
                  ) : null}
                </Can>
                <Can permission={Permission.AgentsDelete}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500"
                    onClick={() => onDeleteAgent(agent)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </Can>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }
    );

    return baseColumns;
  }, [onViewAgent, onEditAgent, onActivateAgent, onDeactivateAgent, onDeleteAgent, onRegenerateKey]);

  const table = useReactTable({
    data: agents,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      onSortingChange(newSorting);
    },
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      onRowSelectionChange(newSelection);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer"
                  onClick={(e) => {
                    // Don't trigger row click for checkboxes, buttons, menu items, or links
                    if (
                      (e.target as HTMLElement).closest('[role="checkbox"]') ||
                      (e.target as HTMLElement).closest('[role="menuitem"]') ||
                      (e.target as HTMLElement).closest('[data-radix-collection-item]') ||
                      (e.target as HTMLElement).closest('button') ||
                      (e.target as HTMLElement).closest('a')
                    ) {
                      return;
                    }
                    onViewAgent(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No agents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
