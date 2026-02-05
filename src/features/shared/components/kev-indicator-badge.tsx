"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AlertOctagon, Calendar, Clock, Skull, ShieldAlert } from "lucide-react";
import { formatDistanceToNow, parseISO, isPast, differenceInDays } from "date-fns";

interface KEVData {
  date_added?: string;
  due_date?: string;
  ransomware_use?: string;
  notes?: string;
  is_past_due?: boolean;
}

interface KEVIndicatorBadgeProps {
  inKEV: boolean;
  kevData?: KEVData | null;
  size?: "sm" | "md" | "lg";
  showDueDate?: boolean;
  className?: string;
}

/**
 * KEV Indicator Badge - Shows if a CVE is in CISA's Known Exploited Vulnerabilities catalog
 * This is a critical indicator that should be highly visible
 */
export function KEVIndicatorBadge({
  inKEV,
  kevData,
  size = "md",
  showDueDate = true,
  className,
}: KEVIndicatorBadgeProps) {
  if (!inKEV) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-2.5 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  const isPastDue = kevData?.is_past_due || (kevData?.due_date && isPast(parseISO(kevData.due_date)));
  const hasRansomware = kevData?.ransomware_use && kevData.ransomware_use.toLowerCase() !== "unknown";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              isPastDue
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-red-500 text-white hover:bg-red-600",
              sizeClasses[size],
              "gap-1 font-semibold",
              className
            )}
          >
            <AlertOctagon className={iconSizes[size]} />
            KEV
            {hasRansomware && <Skull className={cn(iconSizes[size], "ml-0.5")} />}
            {isPastDue && showDueDate && (
              <span className="ml-1 text-red-200">OVERDUE</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-red-500">
              <AlertOctagon className="h-4 w-4" />
              CISA Known Exploited Vulnerability
            </div>

            <p className="text-xs text-muted-foreground">
              This vulnerability is being actively exploited in the wild and requires immediate attention.
            </p>

            {kevData?.date_added && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  Added: {formatDistanceToNow(parseISO(kevData.date_added), { addSuffix: true })}
                </span>
              </div>
            )}

            {kevData?.due_date && (
              <div className={cn(
                "flex items-center gap-2 text-sm",
                isPastDue && "text-red-500 font-medium"
              )}>
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Due: {formatDistanceToNow(parseISO(kevData.due_date), { addSuffix: true })}
                  {isPastDue && " (OVERDUE)"}
                </span>
              </div>
            )}

            {hasRansomware && (
              <div className="flex items-center gap-2 text-sm text-orange-500">
                <Skull className="h-3.5 w-3.5" />
                <span>Known ransomware use: {kevData?.ransomware_use}</span>
              </div>
            )}

            {kevData?.notes && (
              <p className="text-xs border-t pt-2 mt-2 text-muted-foreground">
                {kevData.notes}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface KEVStatusProps {
  inKEV: boolean;
  kevData?: KEVData | null;
  className?: string;
}

/**
 * KEV Status - Expanded status display for detail views
 */
export function KEVStatus({ inKEV, kevData, className }: KEVStatusProps) {
  if (!inKEV) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <ShieldAlert className="h-4 w-4" />
        <span className="text-sm">Not in KEV catalog</span>
      </div>
    );
  }

  const isPastDue = kevData?.is_past_due || (kevData?.due_date && isPast(parseISO(kevData.due_date)));
  const daysUntilDue = kevData?.due_date
    ? differenceInDays(parseISO(kevData.due_date), new Date())
    : null;
  const hasRansomware = kevData?.ransomware_use && kevData.ransomware_use.toLowerCase() !== "unknown";

  return (
    <div className={cn("space-y-3 p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30", className)}>
      <div className="flex items-center gap-2">
        <AlertOctagon className="h-5 w-5 text-red-500" />
        <span className="font-semibold text-red-700 dark:text-red-400">
          CISA Known Exploited Vulnerability
        </span>
      </div>

      <div className="grid gap-2 text-sm">
        {kevData?.date_added && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Added to KEV:</span>
            <span>{new Date(kevData.date_added).toLocaleDateString()}</span>
          </div>
        )}

        {kevData?.due_date && (
          <div className={cn(
            "flex items-center justify-between",
            isPastDue && "text-red-600 dark:text-red-400 font-medium"
          )}>
            <span className={isPastDue ? "" : "text-muted-foreground"}>
              Remediation Due:
            </span>
            <span>
              {new Date(kevData.due_date).toLocaleDateString()}
              {daysUntilDue !== null && (
                <span className="ml-1">
                  ({isPastDue
                    ? `${Math.abs(daysUntilDue)} days overdue`
                    : `${daysUntilDue} days left`})
                </span>
              )}
            </span>
          </div>
        )}

        {hasRansomware && (
          <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
            <span className="flex items-center gap-1">
              <Skull className="h-3.5 w-3.5" />
              Ransomware Use:
            </span>
            <span>{kevData?.ransomware_use}</span>
          </div>
        )}
      </div>

      {kevData?.notes && (
        <p className="text-xs text-muted-foreground border-t pt-2">
          {kevData.notes}
        </p>
      )}
    </div>
  );
}

interface KEVCompactIndicatorProps {
  inKEV: boolean;
  isPastDue?: boolean;
  className?: string;
}

/**
 * KEV Compact Indicator - Minimal indicator for tables and lists
 */
export function KEVCompactIndicator({ inKEV, isPastDue, className }: KEVCompactIndicatorProps) {
  if (!inKEV) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center justify-center rounded p-1",
              isPastDue
                ? "bg-red-600 text-white"
                : "bg-red-500 text-white",
              className
            )}
          >
            <AlertOctagon className="h-3.5 w-3.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            CISA KEV {isPastDue && "(Overdue)"}
          </p>
          <p className="text-xs text-muted-foreground">
            Known Exploited Vulnerability - Requires immediate action
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
