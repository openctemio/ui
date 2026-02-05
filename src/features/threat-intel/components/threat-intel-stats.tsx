"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Skull,
  Shield,
  ShieldCheck,
  Clock,
} from "lucide-react";
import type { EPSSStats, KEVStats } from "@/lib/api/threatintel-types";

interface EPSSStatsCardsProps {
  stats: EPSSStats;
  isLoading?: boolean;
  className?: string;
}

/**
 * EPSS Stats Cards - Overview of EPSS scoring statistics
 */
export function EPSSStatsCards({
  stats,
  isLoading,
  className,
}: EPSSStatsCardsProps) {
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
      title: "Total CVEs Tracked",
      value: (stats.total_scores ?? 0).toLocaleString(),
      icon: Activity,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Critical Risk",
      value: (stats.critical_risk_count ?? 0).toLocaleString(),
      subtitle: "EPSS > 30%",
      icon: AlertOctagon,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "High Risk",
      value: (stats.high_risk_count ?? 0).toLocaleString(),
      subtitle: "EPSS > 10%",
      icon: AlertTriangle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "High Risk Rate",
      value: stats.total_scores > 0
        ? `${((stats.high_risk_count / stats.total_scores) * 100).toFixed(2)}%`
        : "N/A",
      icon: TrendingUp,
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

interface KEVStatsCardsProps {
  stats: KEVStats;
  isLoading?: boolean;
  className?: string;
}

/**
 * KEV Stats Cards - Overview of CISA KEV statistics
 */
export function KEVStatsCards({
  stats,
  isLoading,
  className,
}: KEVStatsCardsProps) {
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
      title: "Total KEV Entries",
      value: (stats.total_entries ?? 0).toLocaleString(),
      icon: Shield,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Past Due",
      value: (stats.past_due_count ?? 0).toLocaleString(),
      subtitle: "Requires immediate action",
      icon: AlertOctagon,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Added Last 30 Days",
      value: (stats.recently_added_last_30_days ?? 0).toLocaleString(),
      icon: Calendar,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Ransomware Related",
      value: (stats.ransomware_related_count ?? 0).toLocaleString(),
      icon: Skull,
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

interface ThreatIntelOverviewProps {
  epssStats: EPSSStats;
  kevStats: KEVStats;
  lastSyncAt?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Threat Intel Overview - Combined stats display
 */
export function ThreatIntelOverview({
  epssStats,
  kevStats,
  lastSyncAt,
  isLoading,
  className,
}: ThreatIntelOverviewProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with last sync info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Threat Intelligence Overview</h3>
          <p className="text-sm text-muted-foreground">
            EPSS and CISA KEV data for vulnerability prioritization
          </p>
        </div>
        {lastSyncAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last synced: {new Date(lastSyncAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* EPSS Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            EPSS - Exploit Prediction Scoring System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EPSSStatsCards stats={epssStats} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* KEV Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-red-500" />
            CISA KEV - Known Exploited Vulnerabilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KEVStatsCards stats={kevStats} isLoading={isLoading} />
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EPSS Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <EPSSRiskDistribution stats={epssStats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">KEV Remediation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <KEVRemediationStatus stats={kevStats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EPSSRiskDistribution({ stats }: { stats: EPSSStats }) {
  if (!stats) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-1">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-2 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const total = stats.total_scores || 1;
  const lowRisk = total - (stats.high_risk_count ?? 0);
  const distribution = [
    {
      label: "Critical (>30%)",
      count: stats.critical_risk_count ?? 0,
      color: "bg-red-500",
      textColor: "text-red-600",
    },
    {
      label: "High (>10%)",
      count: stats.high_risk_count ?? 0,
      color: "bg-orange-500",
      textColor: "text-orange-600",
    },
    {
      label: "Low (<10%)",
      count: Math.max(0, lowRisk),
      color: "bg-green-500",
      textColor: "text-green-600",
    },
  ];

  return (
    <div className="space-y-3">
      {distribution.map(({ label, count, color, textColor }) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className={textColor}>{label}</span>
              <span className="font-medium">{count.toLocaleString()} ({percentage}%)</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", color)}
                style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KEVRemediationStatus({ stats }: { stats: KEVStats }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center animate-pulse">
            <div className="mx-auto mb-2 h-10 w-10 bg-muted rounded-full" />
            <div className="h-6 w-12 mx-auto bg-muted rounded" />
            <div className="h-3 w-16 mx-auto mt-1 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const total = stats.total_entries || 1;
  const overdue = stats.past_due_count ?? 0;
  const recentlyAdded = stats.recently_added_last_30_days ?? 0;
  const onTrack = total - overdue;

  const statuses = [
    {
      label: "Past Due",
      count: overdue,
      icon: AlertOctagon,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: "New (30 Days)",
      count: recentlyAdded,
      icon: Calendar,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      label: "On Track",
      count: Math.max(0, onTrack),
      icon: ShieldCheck,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {statuses.map(({ label, count, icon: Icon, color, bgColor }) => (
        <div key={label} className="text-center">
          <div className={cn("mx-auto mb-2 p-2 rounded-full w-fit", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          <p className="text-2xl font-bold">{count.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
