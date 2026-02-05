"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Status } from "../types";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const STATUS_CONFIG: Record<
  Status,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  active: { label: "Active", variant: "default" },
  inactive: { label: "Inactive", variant: "secondary" },
  archived: { label: "Archived", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
