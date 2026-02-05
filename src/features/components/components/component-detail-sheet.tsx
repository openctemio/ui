/**
 * Component Detail Sheet
 *
 * Beautiful sheet component for viewing software component details
 * Following the design patterns from AssetDetailSheet
 */

"use client";

import * as React from "react";
import {
  Package,
  ExternalLink,
  GitBranch,
  Clock,
  Shield,
  Scale,
  AlertTriangle,
  CheckCircle,
  Copy,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EcosystemBadge } from "./ecosystem-badge";
import { SeverityBadge } from "./severity-badge";
import { LicenseRiskBadge, LicenseCategoryBadge } from "./license-badge";
import { RiskScoreBadge } from "@/features/shared";
import type { Component } from "../types";

// ============================================
// Types
// ============================================

interface ComponentDetailSheetProps {
  /** The component to display (null when sheet is closed) */
  component: Component | null;

  /** Whether the sheet is open */
  open: boolean;

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
}

// ============================================
// Helper Components
// ============================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn("text-lg font-bold", color)}>{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

// ============================================
// Component
// ============================================

export function ComponentDetailSheet({
  component,
  open,
  onOpenChange,
}: ComponentDetailSheetProps) {
  const [activeTab, setActiveTab] = React.useState("overview");

  // Reset tab when component changes
  React.useEffect(() => {
    if (component) {
      setActiveTab("overview");
    }
  }, [component]);

  if (!component) return null;

  const hasVulnerabilities = component.vulnerabilities.length > 0;
  const totalVulns =
    component.vulnerabilityCount.critical +
    component.vulnerabilityCount.high +
    component.vulnerabilityCount.medium +
    component.vulnerabilityCount.low;

  const handleCopyPurl = () => {
    navigator.clipboard.writeText(component.purl);
    toast.success("PURL copied to clipboard");
  };

  // Determine gradient color based on risk
  const gradientFrom =
    component.riskScore >= 70
      ? "from-red-500/20"
      : component.riskScore >= 40
        ? "from-orange-500/20"
        : "from-blue-500/20";

  const gradientVia =
    component.riskScore >= 70
      ? "via-red-500/10"
      : component.riskScore >= 40
        ? "via-orange-500/10"
        : "via-blue-500/10";

  const iconColor =
    component.riskScore >= 70
      ? "text-red-500"
      : component.riskScore >= 40
        ? "text-orange-500"
        : "text-blue-500";

  const iconBgColor =
    component.riskScore >= 70
      ? "bg-red-500/20"
      : component.riskScore >= 40
        ? "bg-orange-500/20"
        : "bg-blue-500/20";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
        <VisuallyHidden>
          <SheetTitle>Component Details</SheetTitle>
        </VisuallyHidden>

        {/* Header with gradient */}
        <div
          className={cn(
            "px-6 pt-6 pb-4 bg-gradient-to-br to-transparent",
            gradientFrom,
            gradientVia
          )}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                iconBgColor
              )}
            >
              <Package className={cn("h-6 w-6", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{component.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">
                  v{component.version}
                </Badge>
                <EcosystemBadge ecosystem={component.ecosystem} />
                {component.isDirect ? (
                  <Badge variant="secondary" className="text-xs">Direct</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1">
                    <GitBranch className="h-3 w-3" />
                    Transitive
                  </Badge>
                )}
              </div>
            </div>
            <RiskScoreBadge score={component.riskScore} />
          </div>

          {/* PURL with copy button */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
            <code className="text-xs text-muted-foreground flex-1 truncate font-mono">
              {component.purl}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={handleCopyPurl}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            {component.homepage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(component.homepage, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Homepage
              </Button>
            )}
            {component.repositoryUrl && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => window.open(component.repositoryUrl, "_blank")}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Repository
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pb-6">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vulnerabilities" className="gap-1">
              Vulns
              {hasVulnerabilities && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs ml-1">
                  {totalVulns}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sources" className="gap-1">
              Sources
              <Badge variant="secondary" className="h-5 px-1.5 text-xs ml-1">
                {component.sourceCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={Shield}
                label="Risk Score"
                value={`${component.riskScore}/100`}
                color={
                  component.riskScore >= 70
                    ? "text-red-500"
                    : component.riskScore >= 40
                      ? "text-orange-500"
                      : "text-green-500"
                }
                description={
                  component.riskScore >= 70
                    ? "Critical risk"
                    : component.riskScore >= 40
                      ? "Medium risk"
                      : "Low risk"
                }
              />
              <StatCard
                icon={AlertTriangle}
                label="Vulnerabilities"
                value={totalVulns}
                color={
                  totalVulns > 0 ? "text-red-500" : "text-green-500"
                }
                description={
                  component.vulnerabilityCount.critical > 0
                    ? `${component.vulnerabilityCount.critical} critical`
                    : totalVulns > 0
                      ? "No critical"
                      : "No issues"
                }
              />
            </div>

            {/* Description */}
            {component.description && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    {component.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* License Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  License Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="License">
                  <span className="font-mono text-sm">{component.licenseId || "Unknown"}</span>
                </InfoRow>
                <Separator />
                <InfoRow label="Category">
                  <LicenseCategoryBadge category={component.licenseCategory} />
                </InfoRow>
                <Separator />
                <InfoRow label="Risk Level">
                  <LicenseRiskBadge risk={component.licenseRisk} showTooltip={false} />
                </InfoRow>
              </CardContent>
            </Card>

            {/* Package Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Package Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Type">
                  <span className="capitalize text-sm">{component.type}</span>
                </InfoRow>
                <Separator />
                <InfoRow label="Ecosystem">
                  <EcosystemBadge ecosystem={component.ecosystem} />
                </InfoRow>
                <Separator />
                <InfoRow label="Dependency">
                  {component.isDirect ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      Direct
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <GitBranch className="h-3 w-3" />
                      Transitive (depth: {component.depth})
                    </Badge>
                  )}
                </InfoRow>
                {component.isOutdated && component.latestVersion && (
                  <>
                    <Separator />
                    <InfoRow label="Update Available">
                      <Badge className="bg-yellow-500 text-white gap-1">
                        <Clock className="h-3 w-3" />
                        {component.latestVersion}
                      </Badge>
                    </InfoRow>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="First Seen">
                  <span className="text-sm">
                    {new Date(component.firstSeen).toLocaleDateString()}
                  </span>
                </InfoRow>
                <Separator />
                <InfoRow label="Last Seen">
                  <span className="text-sm">
                    {new Date(component.lastSeen).toLocaleDateString()}
                  </span>
                </InfoRow>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vulnerabilities Tab */}
          <TabsContent value="vulnerabilities" className="mt-0">
            {hasVulnerabilities ? (
              <div className="space-y-4">
                {/* Vulnerability Summary */}
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        { label: "Critical", count: component.vulnerabilityCount.critical, color: "text-red-600 bg-red-500" },
                        { label: "High", count: component.vulnerabilityCount.high, color: "text-orange-600 bg-orange-500" },
                        { label: "Medium", count: component.vulnerabilityCount.medium, color: "text-yellow-600 bg-yellow-500" },
                        { label: "Low", count: component.vulnerabilityCount.low, color: "text-blue-600 bg-blue-500" },
                      ].map((item) => (
                        <div key={item.label}>
                          <div
                            className={cn(
                              "text-2xl font-bold",
                              item.count > 0 ? item.color.split(" ")[0] : "text-muted-foreground"
                            )}
                          >
                            {item.count}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Vulnerability List */}
                <div className="space-y-3">
                  {component.vulnerabilities.map((vuln) => (
                    <Card
                      key={vuln.id}
                      className={cn(
                        "overflow-hidden",
                        vuln.inCisaKev && "border-red-500/50"
                      )}
                    >
                      {/* Severity indicator bar */}
                      <div
                        className={cn(
                          "h-1",
                          vuln.severity === "critical" && "bg-red-500",
                          vuln.severity === "high" && "bg-orange-500",
                          vuln.severity === "medium" && "bg-yellow-500",
                          vuln.severity === "low" && "bg-blue-500"
                        )}
                      />
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                              {vuln.cveId}
                            </Badge>
                            <SeverityBadge severity={vuln.severity} />
                            {vuln.inCisaKev && (
                              <Badge className="bg-red-600 text-white text-xs">
                                CISA KEV
                              </Badge>
                            )}
                          </div>
                          {vuln.cvssScore && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              CVSS {vuln.cvssScore}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mb-2">{vuln.title}</p>
                        <div className="flex items-center justify-between">
                          {vuln.epssScore && (
                            <div className="text-xs text-muted-foreground">
                              EPSS: {(vuln.epssScore * 100).toFixed(1)}%
                            </div>
                          )}
                          {vuln.fixAvailable && vuln.fixedVersion && (
                            <Badge className="bg-green-500 text-white text-xs gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Fix: {vuln.fixedVersion}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-medium">No Vulnerabilities</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    This component has no known security vulnerabilities.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sources Tab */}
          <TabsContent value="sources" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Found in {component.sourceCount} location(s)
                  </CardTitle>
                  <CardDescription>
                    Assets where this component was discovered
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="space-y-2">
                {component.sources.map((source) => (
                  <Card key={source.id} className="overflow-hidden">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">
                              {source.assetName}
                            </span>
                          </div>
                          <code className="text-xs text-muted-foreground font-mono block truncate">
                            {source.filePath}
                          </code>
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize shrink-0">
                          {source.type}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Discovered: {new Date(source.discoveredAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {component.sources.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Sources Found</h3>
                    <p className="text-muted-foreground text-sm">
                      Source information is not available.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
