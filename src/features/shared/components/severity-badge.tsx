"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity } from "../types";
import { SEVERITY_CONFIG } from "../types";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <Badge
      className={cn(config.color, config.textColor, "font-medium", className)}
    >
      {config.label}
    </Badge>
  );
}
