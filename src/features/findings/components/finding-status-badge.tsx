"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FindingStatus } from "../types";
import { FINDING_STATUS_CONFIG } from "../types";

interface FindingStatusBadgeProps {
  status: FindingStatus;
  className?: string;
  variant?: "default" | "outline";
}

export function FindingStatusBadge({
  status,
  className,
  variant = "default",
}: FindingStatusBadgeProps) {
  const config = FINDING_STATUS_CONFIG[status];

  if (variant === "outline") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1.5", className)}
      >
        <span className={cn("h-2 w-2 rounded-full", config.bgColor)} />
        {config.label}
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        "border-0",
        config.bgColor,
        config.textColor,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
