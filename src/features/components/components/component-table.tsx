"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Package,
  ShieldAlert,
  GitBranch,
  Clock,
} from "lucide-react";
import { RiskScoreBadge } from "@/features/shared";
import { EcosystemBadge } from "./ecosystem-badge";
import { VulnerabilityCountBadge } from "./severity-badge";
import { LicenseRiskBadge } from "./license-badge";
import type { Component } from "../types";

interface ComponentTableProps {
  data: Component[];
  onViewDetails?: (component: Component) => void;
}

export function ComponentTable({ data, onViewDetails }: ComponentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  // Memoize handler
  const handleViewDetails = useCallback((component: Component) => {
    onViewDetails?.(component);
  }, [onViewDetails]);

  // Memoize columns to prevent infinite re-renders
  const columns: ColumnDef<Component>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
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
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Component
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const component = row.original;
        return (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{component.name}</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {component.version}
                </Badge>
                {!component.isDirect && (
                  <Tooltip>
                    <TooltipTrigger>
                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Transitive dependency (depth: {component.depth})</p>
                      {component.dependencyPath && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {component.dependencyPath.join(" > ")}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                {component.description || component.purl}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "ecosystem",
      header: "Ecosystem",
      cell: ({ row }) => <EcosystemBadge ecosystem={row.original.ecosystem} size="sm" />,
    },
    {
      accessorKey: "sourceCount",
      header: "Sources",
      cell: ({ row }) => {
        const count = row.original.sourceCount;
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Found in {count} asset(s)</p>
              <ul className="text-xs mt-1">
                {row.original.sources.slice(0, 3).map((s) => (
                  <li key={s.id} className="text-muted-foreground">
                    {s.assetName}
                  </li>
                ))}
                {row.original.sources.length > 3 && (
                  <li className="text-muted-foreground">
                    +{row.original.sources.length - 3} more
                  </li>
                )}
              </ul>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "vulnerabilityCount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Vulnerabilities
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <VulnerabilityCountBadge counts={row.original.vulnerabilityCount} />
      ),
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.vulnerabilityCount;
        const b = rowB.original.vulnerabilityCount;
        const scoreA = a.critical * 1000 + a.high * 100 + a.medium * 10 + a.low;
        const scoreB = b.critical * 1000 + b.high * 100 + b.medium * 10 + b.low;
        return scoreA - scoreB;
      },
    },
    {
      accessorKey: "licenseRisk",
      header: "License",
      cell: ({ row }) => (
        <LicenseRiskBadge
          risk={row.original.licenseRisk}
          licenseId={row.original.licenseId}
        />
      ),
    },
    {
      accessorKey: "isOutdated",
      header: "Version",
      cell: ({ row }) => {
        const component = row.original;
        if (!component.isOutdated) {
          return (
            <Badge variant="outline" className="bg-green-500/15 text-green-600 border-green-500/30 text-xs">
              Latest
            </Badge>
          );
        }
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs gap-1"
              >
                <Clock className="h-3 w-3" />
                Outdated
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current: {component.version}</p>
              <p>Latest: {component.latestVersion}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "riskScore",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Risk
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <RiskScoreBadge score={row.original.riskScore} size="sm" />,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const component = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetails(component)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {component.vulnerabilities.length > 0 && (
                <DropdownMenuItem onClick={() => handleViewDetails(component)}>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  View Vulnerabilities
                </DropdownMenuItem>
              )}
              {component.homepage && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => window.open(component.homepage, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Homepage
                  </DropdownMenuItem>
                </>
              )}
              {component.repositoryUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(component.repositoryUrl, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Repository
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [handleViewDetails]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).closest('[role="checkbox"]') ||
                      (e.target as HTMLElement).closest("button")
                    ) {
                      return;
                    }
                    onViewDetails?.(row.original);
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
                  No components found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected
        </p>
        <div className="flex items-center gap-2">
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
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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
