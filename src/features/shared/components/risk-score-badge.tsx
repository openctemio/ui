"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getRiskLevel } from "../types";

interface RiskScoreBadgeProps {
  score: number;
  showScore?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RiskScoreBadge({
  score,
  showScore = true,
  size = "md",
  className,
}: RiskScoreBadgeProps) {
  const { label, color, textColor } = getRiskLevel(score);

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-2.5 py-1",
  };

  return (
    <Badge className={cn(color, textColor, sizeClasses[size], className)}>
      {showScore ? `${score} - ${label}` : label}
    </Badge>
  );
}

interface RiskScoreMeterProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
}

/**
 * Risk Score Meter - Visual representation of risk score (0-100)
 * Shows a progress bar with color coding based on risk level
 */
export function RiskScoreMeter({
  score,
  size = "md",
  showLabel = true,
  showTooltip = true,
  className,
}: RiskScoreMeterProps) {
  const { label, color } = getRiskLevel(score);

  // Map color classes to progress bar colors
  const progressColor = color.replace("bg-", "");

  const sizeConfig = {
    sm: { height: "h-1.5", text: "text-xs", width: "w-16" },
    md: { height: "h-2", text: "text-sm", width: "w-20" },
    lg: { height: "h-2.5", text: "text-base", width: "w-24" },
  };

  const { height, text, width } = sizeConfig[size];

  const meter = (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative rounded-full bg-muted overflow-hidden", height, width)}>
        <div
          className={cn("absolute left-0 top-0 h-full rounded-full transition-all", `bg-${progressColor}`)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn("font-medium tabular-nums", text)}>
          {score}
        </span>
      )}
    </div>
  );

  if (!showTooltip) return meter;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{meter}</TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium">Risk Score: {score}/100</p>
          <p className="text-xs text-muted-foreground">Level: {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RiskScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Risk Score Gauge - Circular visual representation of risk score
 * Great for dashboard cards and summary views
 */
export function RiskScoreGauge({
  score,
  size = "md",
  showLabel = true,
  className,
}: RiskScoreGaugeProps) {
  const { label, color } = getRiskLevel(score);

  const sizeConfig = {
    sm: { diameter: 40, strokeWidth: 4, fontSize: "text-xs" },
    md: { diameter: 60, strokeWidth: 5, fontSize: "text-sm" },
    lg: { diameter: 80, strokeWidth: 6, fontSize: "text-base" },
  };

  const { diameter, strokeWidth, fontSize } = sizeConfig[size];
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  // Extract color name for stroke
  const strokeColor = color.replace("bg-", "stroke-");

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn("transition-all duration-500", strokeColor)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tabular-nums", fontSize)}>{score}</span>
        {showLabel && size !== "sm" && (
          <span className="text-[8px] text-muted-foreground uppercase">{label}</span>
        )}
      </div>
    </div>
  );
}
