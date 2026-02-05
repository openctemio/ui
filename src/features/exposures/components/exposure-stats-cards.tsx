"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldX,
  Clock,
  TrendingUp,
  Activity,
  AlertOctagon,
} from "lucide-react";
import type { ExposureStats, ExposureSeverity, ExposureState } from "@/lib/api/exposure-types";

interface ExposureStatsCardsProps {
  stats: ExposureStats;
  isLoading?: boolean;
  className?: string;
}

/**
 * Exposure Stats Cards - Overview statistics for exposure events
 */
export function ExposureStatsCards({
  stats,
  isLoading,
  className,
}: ExposureStatsCardsProps) {
  // Handle loading or missing data
  if (isLoading || !stats) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Exposures",
      value: stats.total ?? 0,
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active",
      value: stats.active_count ?? 0,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Resolved",
      value: stats.resolved_count ?? 0,
      icon: ShieldCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "MTTR",
      value: stats.mttr_hours ? `${stats.mttr_hours.toFixed(1)}h` : "N/A",
      subtitle: "Mean Time To Resolve",
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-2xl font-bold">{card.value}</p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
              <div className={cn("p-3 rounded-full", card.bgColor)}>
                <card.icon className={cn("h-5 w-5", card.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ExposureSeverityBreakdownProps {
  bySeverity: Record<ExposureSeverity, number>;
  className?: string;
}

/**
 * Exposure Severity Breakdown - Shows count by severity level
 */
export function ExposureSeverityBreakdown({
  bySeverity,
  className,
}: ExposureSeverityBreakdownProps) {
  const severityConfig: Array<{
    key: ExposureSeverity;
    label: string;
    color: string;
    bgColor: string;
    icon: typeof AlertOctagon;
  }> = [
    { key: "critical", label: "Critical", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", icon: AlertOctagon },
    { key: "high", label: "High", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", icon: AlertTriangle },
    { key: "medium", label: "Medium", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30", icon: Shield },
    { key: "low", label: "Low", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: ShieldCheck },
    { key: "info", label: "Info", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30", icon: Activity },
  ];

  const safeBySeverity = bySeverity || {};
  const total = Object.values(safeBySeverity).reduce((a, b) => a + b, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">By Severity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {severityConfig.map(({ key, label, color, bgColor, icon: Icon }) => {
            const count = safeBySeverity[key] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1 rounded", bgColor)}>
                      <Icon className={cn("h-3 w-3", color)} />
                    </div>
                    <span className={color}>{label}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", bgColor.replace("/10", "").replace("/30", ""))}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExposureStateBreakdownProps {
  byState: Record<ExposureState, number>;
  className?: string;
}

/**
 * Exposure State Breakdown - Shows count by state
 */
export function ExposureStateBreakdown({
  byState,
  className,
}: ExposureStateBreakdownProps) {
  const stateConfig: Array<{
    key: ExposureState;
    label: string;
    color: string;
    bgColor: string;
    icon: typeof Shield;
  }> = [
    { key: "active", label: "Active", color: "text-red-600", bgColor: "bg-red-500", icon: AlertTriangle },
    { key: "resolved", label: "Resolved", color: "text-green-600", bgColor: "bg-green-500", icon: ShieldCheck },
    { key: "accepted", label: "Accepted", color: "text-yellow-600", bgColor: "bg-yellow-500", icon: Shield },
    { key: "false_positive", label: "False Positive", color: "text-gray-600", bgColor: "bg-gray-500", icon: ShieldX },
  ];

  const safeByState = byState || {};
  const total = Object.values(safeByState).reduce((a, b) => a + b, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">By State</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {stateConfig.map(({ key, label, color, bgColor, icon: Icon }) => {
            const count = safeByState[key] || 0;
            const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : 0;

            return (
              <div key={key} className="flex-1 text-center">
                <div className={cn("mx-auto mb-2 p-2 rounded-full w-fit", `${bgColor}/10`)}>
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExposureTrendIndicatorProps {
  current: number;
  previous: number;
  label: string;
  className?: string;
}

/**
 * Exposure Trend Indicator - Shows trend compared to previous period
 */
export function ExposureTrendIndicator({
  current,
  previous,
  label,
  className,
}: ExposureTrendIndicatorProps) {
  const diff = current - previous;
  const percentChange = previous > 0 ? ((diff / previous) * 100).toFixed(1) : 0;
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div
        className={cn(
          "flex items-center gap-1 text-sm font-medium",
          isIncrease && "text-red-500",
          isDecrease && "text-green-500",
          !isIncrease && !isDecrease && "text-muted-foreground"
        )}
      >
        {isIncrease && <TrendingUp className="h-4 w-4" />}
        {isDecrease && <TrendingUp className="h-4 w-4 rotate-180" />}
        <span>
          {isIncrease ? "+" : ""}
          {diff} ({percentChange}%)
        </span>
      </div>
    </div>
  );
}
