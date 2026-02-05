"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  ChevronRight,
  ExternalLink,
  FileWarning,
  Info,
  KeyRound,
  Settings2,
  Shield,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { AssetFinding } from "../types/asset.types";
import { getAssetFindings } from "../lib/mock-data";

interface AssetFindingsProps {
  assetId: string;
  assetName?: string;
  className?: string;
}

const severityConfig: Record<
  AssetFinding["severity"],
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  critical: {
    label: "Critical",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: AlertCircle,
  },
  high: {
    label: "High",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: AlertTriangle,
  },
  low: {
    label: "Low",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: Info,
  },
  info: {
    label: "Info",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: Info,
  },
};

const typeConfig: Record<
  AssetFinding["type"],
  { label: string; icon: React.ElementType }
> = {
  vulnerability: { label: "Vulnerability", icon: Bug },
  misconfiguration: { label: "Misconfiguration", icon: Settings2 },
  exposure: { label: "Exposure", icon: ExternalLink },
  secret: { label: "Secret", icon: KeyRound },
  compliance: { label: "Compliance", icon: Shield },
};

const statusConfig: Record<
  AssetFinding["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  open: { label: "Open", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "default" },
  resolved: { label: "Resolved", variant: "secondary" },
  accepted: { label: "Accepted", variant: "outline" },
  false_positive: { label: "False Positive", variant: "outline" },
};

export function AssetFindings({ assetId, className }: AssetFindingsProps) {
  const [findings, setFindings] = React.useState<AssetFinding[]>([]);

  React.useEffect(() => {
    const data = getAssetFindings(assetId);
    setFindings(data);
  }, [assetId]);

  const severityCounts = React.useMemo(() => {
    return {
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
      info: findings.filter((f) => f.severity === "info").length,
    };
  }, [findings]);

  if (findings.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <Shield className="h-12 w-12 text-green-500 mb-3" />
        <h3 className="font-medium">No Findings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          This asset has no security findings.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Severity Summary */}
      <div className="flex flex-wrap gap-2">
        {severityCounts.critical > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            {severityCounts.critical} Critical
          </div>
        )}
        {severityCounts.high > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {severityCounts.high} High
          </div>
        )}
        {severityCounts.medium > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {severityCounts.medium} Medium
          </div>
        )}
        {severityCounts.low > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            <Info className="h-3.5 w-3.5" />
            {severityCounts.low} Low
          </div>
        )}
      </div>

      <Separator />

      {/* Findings List */}
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {findings.map((finding) => {
            const severity = severityConfig[finding.severity];
            const type = typeConfig[finding.type];
            const status = statusConfig[finding.status];
            const SeverityIcon = severity.icon;
            const TypeIcon = type.icon;

            return (
              <div
                key={finding.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg", severity.bgColor)}>
                    <SeverityIcon className={cn("h-4 w-4", severity.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{finding.title}</h4>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {finding.description}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TypeIcon className="h-3 w-3" />
                        <span>{type.label}</span>
                      </div>
                      {finding.cveId && (
                        <span className="font-mono text-red-600">{finding.cveId}</span>
                      )}
                      {finding.cvssScore && (
                        <span className="font-medium">CVSS: {finding.cvssScore}</span>
                      )}
                      {finding.rule && (
                        <span className="font-mono">{finding.rule}</span>
                      )}
                      <span>
                        First seen: {new Date(finding.firstSeen).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Remediation Preview */}
                    {finding.remediation && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                        <span className="font-medium">Remediation: </span>
                        <span className="text-muted-foreground">{finding.remediation}</span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <Link href={`/findings/${finding.id}`}>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* View All Link */}
      <div className="pt-2 border-t">
        <Link href={`/findings?assetId=${assetId}`}>
          <Button variant="outline" className="w-full">
            <FileWarning className="mr-2 h-4 w-4" />
            View All Findings ({findings.length})
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
