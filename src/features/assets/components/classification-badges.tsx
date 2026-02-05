/**
 * Classification Badges
 *
 * Visual badges for Asset Scope and Exposure Level classification
 */

"use client";

import * as React from "react";
import {
  Globe,
  Building2,
  Cloud,
  Users,
  Store,
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
  Shield,
  AlertCircle,
  AlertTriangle,
  CircleDot,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AssetScope, ExposureLevel, Criticality } from "../types";
import {
  ASSET_SCOPE_LABELS,
  ASSET_SCOPE_DESCRIPTIONS,
  ASSET_SCOPE_COLORS,
  EXPOSURE_LEVEL_LABELS,
  EXPOSURE_LEVEL_DESCRIPTIONS,
  EXPOSURE_LEVEL_COLORS,
  CRITICALITY_LABELS,
  CRITICALITY_DESCRIPTIONS,
  CRITICALITY_COLORS,
} from "../types";

// Scope icons
const SCOPE_ICONS: Record<AssetScope, React.ElementType> = {
  internal: Building2,
  external: Globe,
  cloud: Cloud,
  partner: Users,
  vendor: Store,
  shadow: HelpCircle,
};

// Exposure icons
const EXPOSURE_ICONS: Record<ExposureLevel, React.ElementType> = {
  public: Eye,
  restricted: Lock,
  private: EyeOff,
  isolated: Shield,
  unknown: AlertCircle,
};

// Criticality icons
const CRITICALITY_ICONS: Record<Criticality, React.ElementType> = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: CircleDot,
  low: Minus,
};

interface AssetScopeBadgeProps {
  scope: AssetScope;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function AssetScopeBadge({
  scope,
  showIcon = true,
  showTooltip = true,
  size = "md",
  className,
}: AssetScopeBadgeProps) {
  const colors = ASSET_SCOPE_COLORS[scope];
  const Icon = SCOPE_ICONS[scope];
  const label = ASSET_SCOPE_LABELS[scope];
  const description = ASSET_SCOPE_DESCRIPTIONS[scope];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "text-xs px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ExposureBadgeProps {
  exposure: ExposureLevel;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ExposureBadge({
  exposure,
  showIcon = true,
  showTooltip = true,
  size = "md",
  className,
}: ExposureBadgeProps) {
  const colors = EXPOSURE_LEVEL_COLORS[exposure];
  const Icon = EXPOSURE_ICONS[exposure];
  const label = EXPOSURE_LEVEL_LABELS[exposure];
  const description = EXPOSURE_LEVEL_DESCRIPTIONS[exposure];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "text-xs px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CriticalityBadgeProps {
  criticality: Criticality;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function CriticalityBadge({
  criticality,
  showIcon = true,
  showTooltip = true,
  size = "md",
  className,
}: CriticalityBadgeProps) {
  const colors = CRITICALITY_COLORS[criticality];
  const Icon = CRITICALITY_ICONS[criticality];
  const label = CRITICALITY_LABELS[criticality];
  const description = CRITICALITY_DESCRIPTIONS[criticality];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "text-xs px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />}
      {label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ClassificationBadgesProps {
  scope: AssetScope;
  exposure: ExposureLevel;
  criticality?: Criticality;
  showIcons?: boolean;
  showTooltips?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Combined component showing scope, exposure, and optionally criticality badges
 */
export function ClassificationBadges({
  scope,
  exposure,
  criticality,
  showIcons = true,
  showTooltips = true,
  size = "md",
  className,
}: ClassificationBadgesProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {criticality && (
        <CriticalityBadge
          criticality={criticality}
          showIcon={showIcons}
          showTooltip={showTooltips}
          size={size}
        />
      )}
      <AssetScopeBadge
        scope={scope}
        showIcon={showIcons}
        showTooltip={showTooltips}
        size={size}
      />
      <ExposureBadge
        exposure={exposure}
        showIcon={showIcons}
        showTooltip={showTooltips}
        size={size}
      />
    </div>
  );
}
