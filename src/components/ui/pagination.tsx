"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
  showPageSizeSelector = true,
  className,
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const canPreviousPage = currentPage > 1;
  const canNextPage = currentPage < totalPages;

  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className || ""}`}>
      {/* Row count info */}
      <div className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium">{startItem}</span>
        {" - "}
        <span className="font-medium">{endItem}</span>
        {" of "}
        <span className="font-medium">{totalItems}</span>
        {" results"}
      </div>

      {/* Pagination controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Page size selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                onPageSizeChange(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={!canPreviousPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page indicator */}
          <span className="flex items-center gap-1 text-sm px-2">
            <span className="text-muted-foreground">Page</span>
            <span className="font-medium">{currentPage}</span>
            <span className="text-muted-foreground">of</span>
            <span className="font-medium">{totalPages || 1}</span>
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
