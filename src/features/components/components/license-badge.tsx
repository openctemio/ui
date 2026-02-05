"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LicenseRisk, LicenseCategory } from "../types";
import { LICENSE_RISK_COLORS, LICENSE_CATEGORY_LABELS } from "../types";
import { AlertTriangle, CheckCircle, HelpCircle, XCircle } from "lucide-react";

interface LicenseRiskBadgeProps {
  risk: LicenseRisk;
  licenseId?: string | null;
  className?: string;
  showTooltip?: boolean;
}

export function LicenseRiskBadge({
  risk,
  licenseId,
  className,
  showTooltip = true,
}: LicenseRiskBadgeProps) {
  const colors = LICENSE_RISK_COLORS[risk];

  const getRiskIcon = () => {
    switch (risk) {
      case "critical":
        return <XCircle className="h-3 w-3" />;
      case "high":
        return <AlertTriangle className="h-3 w-3" />;
      case "medium":
        return <AlertTriangle className="h-3 w-3" />;
      case "none":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <HelpCircle className="h-3 w-3" />;
    }
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(colors.bg, colors.text, colors.border, "gap-1", className)}
    >
      {getRiskIcon()}
      {licenseId || "Unknown"}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  const getRiskDescription = () => {
    switch (risk) {
      case "critical":
        return "This license has critical compliance risks (e.g., AGPL requires source disclosure)";
      case "high":
        return "This license has high compliance risks (e.g., GPL copyleft requirements)";
      case "medium":
        return "This license has moderate compliance considerations";
      case "low":
        return "This license has minor compliance considerations";
      case "none":
        return "This license is permissive with no compliance risks";
      default:
        return "License information is unknown or unclear";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{licenseId || "Unknown License"}</p>
          <p className="text-xs text-muted-foreground mt-1">{getRiskDescription()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface LicenseCategoryBadgeProps {
  category: LicenseCategory;
  className?: string;
}

export function LicenseCategoryBadge({ category, className }: LicenseCategoryBadgeProps) {
  const categoryColors: Record<LicenseCategory, string> = {
    permissive: "bg-green-500/15 text-green-600 border-green-500/30",
    copyleft: "bg-red-500/15 text-red-600 border-red-500/30",
    "weak-copyleft": "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    proprietary: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    "public-domain": "bg-blue-500/15 text-blue-600 border-blue-500/30",
    unknown: "bg-slate-500/15 text-slate-600 border-slate-500/30",
  };

  return (
    <Badge variant="outline" className={cn(categoryColors[category], className)}>
      {LICENSE_CATEGORY_LABELS[category]}
    </Badge>
  );
}
