'use client';

import { useMemo, useCallback } from 'react';
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
import { Switch } from '@/components/ui/switch';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Eye,
  Settings,
  Trash2,
  ArrowUpCircle,
  ExternalLink,
  Github,
  Power,
  PowerOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { Tool } from '@/lib/api/tool-types';
import type { ToolCategory } from '@/lib/api/tool-category-types';
import { INSTALL_METHOD_DISPLAY_NAMES } from '@/lib/api/tool-types';
import { getCategoryNameById, getCategoryDisplayNameById } from '@/lib/api/tool-category-hooks';
import { ToolCategoryIcon, getCategoryBadgeColor } from './tool-category-icon';

interface ToolTableProps {
  tools: Tool[];
  categories?: ToolCategory[]; // For looking up category name from category_id
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  globalFilter: string;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (selection: Record<string, boolean>) => void;
  onViewTool: (tool: Tool) => void;
  onEditTool?: (tool: Tool) => void;
  onDeleteTool?: (tool: Tool) => void;
  onActivateTool?: (tool: Tool) => void;
  onDeactivateTool?: (tool: Tool) => void;
  onCheckUpdate?: (tool: Tool) => void;
  /** When true, hides edit/delete/activate/deactivate actions (for platform tools) */
  readOnly?: boolean;
}

export function ToolTable({
  tools,
  categories,
  sorting,
  onSortingChange,
  globalFilter,
  rowSelection,
  onRowSelectionChange,
  onViewTool,
  onEditTool,
  onDeleteTool,
  onActivateTool,
  onDeactivateTool,
  onCheckUpdate,
  readOnly = false,
}: ToolTableProps) {
  // Helper functions to get category info - memoized to avoid unnecessary re-renders
  const getCategoryName = useCallback(
    (tool: Tool) => getCategoryNameById(categories, tool.category_id),
    [categories]
  );
  const getCategoryDisplayName = useCallback(
    (tool: Tool) => getCategoryDisplayNameById(categories, tool.category_id),
    [categories]
  );
  const columns: ColumnDef<Tool>[] = useMemo(
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
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'display_name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Tool
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const tool = row.original;
          return (
            <div className="flex items-center gap-3">
              {tool.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tool.logo_url}
                  alt={tool.display_name}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <ToolCategoryIcon category={getCategoryName(tool)} className="h-4 w-4" />
                </div>
              )}
              <div>
                <p className="font-medium">{tool.display_name}</p>
                <p className="text-xs text-muted-foreground">{tool.name}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'category_id',
        header: 'Category',
        cell: ({ row }) => {
          const categoryName = getCategoryName(row.original);
          const categoryDisplayName = getCategoryDisplayName(row.original);
          return (
            <Badge
              variant="outline"
              className={cn('text-xs', getCategoryBadgeColor(categoryName))}
            >
              <ToolCategoryIcon
                category={categoryName}
                className="mr-1 h-3 w-3"
              />
              {categoryDisplayName}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'install_method',
        header: 'Install',
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {INSTALL_METHOD_DISPLAY_NAMES[row.original.install_method]}
          </Badge>
        ),
      },
      {
        accessorKey: 'current_version',
        header: 'Version',
        cell: ({ row }) => {
          const tool = row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {tool.current_version || '-'}
              </span>
              {tool.has_update && tool.latest_version && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs"
                    >
                      <ArrowUpCircle className="mr-1 h-3 w-3" />
                      {tool.latest_version}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Update available</TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'is_builtin',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={row.original.is_builtin ? 'outline' : 'secondary'}>
            {row.original.is_builtin ? 'Built-in' : 'Custom'}
          </Badge>
        ),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => {
          const tool = row.original;
          // For read-only mode, show styled badge instead of switch
          if (readOnly || (!onActivateTool && !onDeactivateTool)) {
            return (
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-medium',
                  tool.is_active
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'mr-1.5 h-1.5 w-1.5 rounded-full',
                    tool.is_active ? 'bg-green-500' : 'bg-zinc-400'
                  )}
                />
                {tool.is_active ? 'Active' : 'Inactive'}
              </Badge>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <Switch
                checked={tool.is_active}
                onCheckedChange={() =>
                  tool.is_active ? onDeactivateTool?.(tool) : onActivateTool?.(tool)
                }
              />
              <span className="text-sm text-muted-foreground">
                {tool.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const tool = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewTool(tool)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {!readOnly && !tool.is_builtin && onEditTool && (
                  <DropdownMenuItem onClick={() => onEditTool(tool)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {tool.has_update && onCheckUpdate && (
                  <DropdownMenuItem onClick={() => onCheckUpdate(tool)}>
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Check Update
                  </DropdownMenuItem>
                )}
                {tool.github_url && (
                  <DropdownMenuItem asChild>
                    <a
                      href={tool.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="mr-2 h-4 w-4" />
                      GitHub
                    </a>
                  </DropdownMenuItem>
                )}
                {tool.docs_url && (
                  <DropdownMenuItem asChild>
                    <a
                      href={tool.docs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Documentation
                    </a>
                  </DropdownMenuItem>
                )}
                {/* Only show activate/deactivate for custom tools (not read-only) */}
                {!readOnly && (onActivateTool || onDeactivateTool) && (
                  <>
                    <DropdownMenuSeparator />
                    {tool.is_active ? (
                      onDeactivateTool && (
                        <DropdownMenuItem
                          onClick={() => onDeactivateTool(tool)}
                          className="text-amber-500"
                        >
                          <PowerOff className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      )
                    ) : (
                      onActivateTool && (
                        <DropdownMenuItem
                          onClick={() => onActivateTool(tool)}
                          className="text-green-500"
                        >
                          <Power className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )
                    )}
                  </>
                )}
                {!readOnly && !tool.is_builtin && onDeleteTool && (
                  <DropdownMenuItem
                    className="text-red-500"
                    onClick={() => onDeleteTool(tool)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onViewTool, onEditTool, onDeleteTool, onActivateTool, onDeactivateTool, onCheckUpdate, readOnly, getCategoryName, getCategoryDisplayName]
  );

  const table = useReactTable({
    data: tools,
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
    <TooltipProvider>
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
                    if (
                      (e.target as HTMLElement).closest('[role="checkbox"]') ||
                      (e.target as HTMLElement).closest('[role="menuitem"]') ||
                      (e.target as HTMLElement).closest('[data-radix-collection-item]') ||
                      (e.target as HTMLElement).closest('button') ||
                      (e.target as HTMLElement).closest('a')
                    ) {
                      return;
                    }
                    onViewTool(row.original);
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
                  No tools found.
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
    </TooltipProvider>
  );
}
