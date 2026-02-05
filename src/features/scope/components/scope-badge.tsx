"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Target, Ban, HelpCircle } from "lucide-react";
import type { ScopeMatchResult } from "../types";

interface ScopeBadgeProps {
  match: ScopeMatchResult;
  showDetails?: boolean;
}

/**
 * ScopeBadge - Displays scope status for an asset
 * Shows whether an asset is in scope, excluded, or not covered
 */
export function ScopeBadge({ match, showDetails = true }: ScopeBadgeProps) {
  const { matchedTargets, matchedExclusions, inScope } = match;

  // Determine status
  const isExcluded = matchedExclusions.length > 0;
  const isCovered = matchedTargets.length > 0;

  // Badge content based on status
  const getBadgeContent = () => {
    if (isExcluded) {
      return {
        variant: "outline" as const,
        className: "border-orange-500/50 bg-orange-500/10 text-orange-500",
        icon: <Ban className="mr-1 h-3 w-3" />,
        label: "Excluded",
        tooltip: `Excluded by: ${matchedExclusions.map((e) => e.pattern).join(", ")}`,
        reason: matchedExclusions[0]?.reason,
      };
    }

    if (inScope) {
      return {
        variant: "outline" as const,
        className: "border-green-500/50 bg-green-500/10 text-green-500",
        icon: <Target className="mr-1 h-3 w-3" />,
        label: "In Scope",
        tooltip: `Matched by: ${matchedTargets.map((t) => t.pattern).join(", ")}`,
      };
    }

    if (isCovered && !inScope) {
      // Matched by target but also excluded
      return {
        variant: "outline" as const,
        className: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
        icon: <Target className="mr-1 h-3 w-3" />,
        label: "Partial",
        tooltip: "Matched by scope but also has exclusions",
      };
    }

    return {
      variant: "outline" as const,
      className: "border-gray-500/50 bg-gray-500/10 text-gray-500",
      icon: <HelpCircle className="mr-1 h-3 w-3" />,
      label: "Uncovered",
      tooltip: "Not matched by any scope rules",
    };
  };

  const content = getBadgeContent();

  if (!showDetails) {
    return (
      <Badge variant={content.variant} className={content.className}>
        {content.icon}
        {content.label}
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={content.variant} className={`cursor-help ${content.className}`}>
            {content.icon}
            {content.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{content.tooltip}</p>
            {content.reason && (
              <p className="text-muted-foreground text-xs">
                Reason: {content.reason}
              </p>
            )}
            {matchedTargets.length > 0 && !isExcluded && (
              <div className="text-xs">
                <span className="text-muted-foreground">Match type: </span>
                {matchedTargets[0].matchType}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * ScopeBadgeSimple - Simplified scope status indicator
 */
export function ScopeBadgeSimple({
  inScope,
  excluded,
}: {
  inScope: boolean;
  excluded?: boolean;
}) {
  if (excluded) {
    return (
      <Badge
        variant="outline"
        className="border-orange-500/50 bg-orange-500/10 text-orange-500"
      >
        <Ban className="mr-1 h-3 w-3" />
        Excluded
      </Badge>
    );
  }

  if (inScope) {
    return (
      <Badge
        variant="outline"
        className="border-green-500/50 bg-green-500/10 text-green-500"
      >
        <Target className="mr-1 h-3 w-3" />
        In Scope
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-gray-500/50 bg-gray-500/10 text-gray-500"
    >
      <HelpCircle className="mr-1 h-3 w-3" />
      Uncovered
    </Badge>
  );
}
