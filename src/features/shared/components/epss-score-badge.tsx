"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TrendingUp, AlertTriangle, Shield, ShieldCheck } from "lucide-react";

/**
 * Get EPSS risk level based on score (0-1 scale)
 * Based on FIRST.org EPSS recommendations:
 * - Critical: > 0.7 (top 30% most exploitable)
 * - High: > 0.4 (significant exploitation probability)
 * - Medium: > 0.1 (moderate risk)
 * - Low: <= 0.1 (lower priority)
 */
function getEPSSLevel(score: number): {
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  description: string;
} {
  if (score > 0.7) {
    return {
      label: "Critical",
      color: "bg-red-500",
      textColor: "text-white",
      bgColor: "bg-red-500/10",
      description: "Very high exploitation probability. Prioritize immediately.",
    };
  }
  if (score > 0.4) {
    return {
      label: "High",
      color: "bg-orange-500",
      textColor: "text-white",
      bgColor: "bg-orange-500/10",
      description: "High exploitation probability. Address soon.",
    };
  }
  if (score > 0.1) {
    return {
      label: "Medium",
      color: "bg-yellow-500",
      textColor: "text-black",
      bgColor: "bg-yellow-500/10",
      description: "Moderate exploitation probability.",
    };
  }
  return {
    label: "Low",
    color: "bg-green-500",
    textColor: "text-white",
    bgColor: "bg-green-500/10",
    description: "Lower exploitation probability.",
  };
}

interface EPSSScoreBadgeProps {
  score: number | null | undefined;
  percentile?: number | null;
  showPercentile?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * EPSS Score Badge - Displays Exploit Prediction Scoring System score
 * Score is 0-1 representing probability of exploitation in the next 30 days
 */
export function EPSSScoreBadge({
  score,
  percentile,
  showPercentile = false,
  size = "md",
  className,
}: EPSSScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <Badge variant="outline" className={cn("text-muted-foreground", className)}>
        No EPSS
      </Badge>
    );
  }

  const { color, textColor, description } = getEPSSLevel(score);
  const displayScore = (score * 100).toFixed(1);

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-2.5 py-1",
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge className={cn(color, textColor, sizeClasses[size], className)}>
            <TrendingUp className="mr-1 h-3 w-3" />
            {displayScore}%
            {showPercentile && percentile !== null && percentile !== undefined && (
              <span className="ml-1 opacity-80">({percentile.toFixed(0)}th)</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">EPSS Score: {displayScore}%</p>
            {percentile !== null && percentile !== undefined && (
              <p className="text-sm">Percentile: {percentile.toFixed(1)}%</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground">
              Probability of exploitation in the next 30 days
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface EPSSScoreMeterProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * EPSS Score Meter - Visual progress bar for EPSS score
 */
export function EPSSScoreMeter({
  score,
  size = "md",
  showLabel = true,
  className,
}: EPSSScoreMeterProps) {
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const { color } = getEPSSLevel(score);
  const percentage = score * 100;

  const sizeConfig = {
    sm: { height: "h-1.5", text: "text-xs", width: "w-16" },
    md: { height: "h-2", text: "text-sm", width: "w-20" },
    lg: { height: "h-2.5", text: "text-base", width: "w-24" },
  };

  const { height, text, width } = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative rounded-full bg-muted overflow-hidden", height, width)}>
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("font-medium tabular-nums", text)}>
          {percentage.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

interface EPSSIndicatorProps {
  score: number | null | undefined;
  compact?: boolean;
  className?: string;
}

/**
 * EPSS Indicator - Compact icon-based indicator for EPSS risk level
 */
export function EPSSIndicator({ score, compact = false, className }: EPSSIndicatorProps) {
  if (score === null || score === undefined) {
    return null;
  }

  const { label, bgColor } = getEPSSLevel(score);
  const Icon = score > 0.7 ? AlertTriangle : score > 0.4 ? TrendingUp : score > 0.1 ? Shield : ShieldCheck;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div className={cn("p-1 rounded", bgColor, className)}>
              <Icon className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>EPSS: {(score * 100).toFixed(1)}% ({label})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 px-2 py-1 rounded text-sm", bgColor, className)}>
      <Icon className="h-4 w-4" />
      <span>{(score * 100).toFixed(1)}%</span>
    </div>
  );
}
