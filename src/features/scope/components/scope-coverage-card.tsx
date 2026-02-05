"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Ban, HelpCircle, TrendingUp } from "lucide-react";
import type { ScopeCoverage } from "../types";

interface ScopeCoverageCardProps {
  coverage: ScopeCoverage;
  title?: string;
  showBreakdown?: boolean;
}

/**
 * ScopeCoverageCard - Displays scope coverage statistics
 */
export function ScopeCoverageCard({
  coverage,
  title = "Scope Coverage",
  showBreakdown = true,
}: ScopeCoverageCardProps) {
  const {
    totalAssets,
    inScopeAssets,
    excludedAssets,
    uncoveredAssets,
    coveragePercent,
    byType,
  } = coverage;

  // Color based on coverage percentage
  const getCoverageColor = (percent: number) => {
    if (percent >= 80) return "text-green-500";
    if (percent >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              {title}
            </CardTitle>
            <CardDescription>
              {inScopeAssets} of {totalAssets} assets in scope
            </CardDescription>
          </div>
          <div className={`text-3xl font-bold ${getCoverageColor(coveragePercent)}`}>
            {coveragePercent}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress
            value={coveragePercent}
            className="h-2"
            // Note: Custom color would need CSS customization
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-green-500/10 p-2">
            <div className="flex items-center justify-center gap-1 text-green-500">
              <Target className="h-3 w-3" />
              <span className="text-lg font-semibold">{inScopeAssets}</span>
            </div>
            <p className="text-xs text-muted-foreground">In Scope</p>
          </div>
          <div className="rounded-lg bg-orange-500/10 p-2">
            <div className="flex items-center justify-center gap-1 text-orange-500">
              <Ban className="h-3 w-3" />
              <span className="text-lg font-semibold">{excludedAssets}</span>
            </div>
            <p className="text-xs text-muted-foreground">Excluded</p>
          </div>
          <div className="rounded-lg bg-gray-500/10 p-2">
            <div className="flex items-center justify-center gap-1 text-gray-500">
              <HelpCircle className="h-3 w-3" />
              <span className="text-lg font-semibold">{uncoveredAssets}</span>
            </div>
            <p className="text-xs text-muted-foreground">Uncovered</p>
          </div>
        </div>

        {/* Type breakdown */}
        {showBreakdown && Object.keys(byType).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">By Asset Type</p>
            <div className="space-y-1">
              {Object.entries(byType).map(([type, stats]) => {
                const typePercent =
                  stats.total > 0
                    ? Math.round((stats.inScope / stats.total) * 100)
                    : 0;
                return (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <span className="w-24 truncate capitalize text-muted-foreground">
                      {type.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-1.5 rounded-full ${getProgressColor(typePercent)}`}
                          style={{ width: `${typePercent}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-muted-foreground">
                      {stats.inScope}/{stats.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ScopeCoverageInline - Compact inline coverage display
 */
export function ScopeCoverageInline({
  inScope,
  total,
  excluded = 0,
}: {
  inScope: number;
  total: number;
  excluded?: number;
}) {
  const percent = total > 0 ? Math.round((inScope / total) * 100) : 0;

  const getColor = (p: number) => {
    if (p >= 80) return "text-green-500";
    if (p >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`font-medium ${getColor(percent)}`}>{percent}%</span>
      <span className="text-muted-foreground">
        ({inScope}/{total} in scope
        {excluded > 0 && `, ${excluded} excluded`})
      </span>
    </div>
  );
}
