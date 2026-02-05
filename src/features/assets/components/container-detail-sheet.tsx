/**
 * Container Detail Sheet
 *
 * Reusable sheet component for viewing Kubernetes/Container asset details
 * Supports K8sCluster, K8sWorkload, and ContainerImage types
 */

"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { AssetFindings } from "./asset-findings";
import type { K8sCluster, K8sWorkload, ContainerImage } from "../types/asset.types";

// ============================================
// Types
// ============================================

type ContainerAsset = K8sCluster | K8sWorkload | ContainerImage;

interface ContainerDetailSheetProps<T extends ContainerAsset> {
  /** The asset to display (null when sheet is closed) */
  asset: T | null;

  /** Whether the sheet is open */
  open: boolean;

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;

  /** Icon component to display in header */
  icon: React.ElementType;

  /** Icon color class (e.g., "text-teal-500") */
  iconColor: string;

  /** Gradient start color class (e.g., "from-teal-500/20") */
  gradientFrom: string;

  /** Gradient via color class (optional, e.g., "via-teal-500/10") */
  gradientVia?: string;

  /** Callback when Edit button is clicked */
  onEdit: () => void;

  /** Additional quick action buttons (rendered after Edit button) */
  quickActions?: React.ReactNode;

  /** Custom overview section content */
  overviewContent?: React.ReactNode;

  /** Subtitle shown below name */
  subtitle?: string;

  /** Asset type label for display (e.g., "Cluster", "Workload", "Image") */
  assetTypeName: string;

  /** Status badge component/element to display in header */
  statusBadge?: React.ReactNode;

  /** Whether to show Findings tab (default: true) */
  showFindingsTab?: boolean;

  /** Finding count for tab label */
  findingCount?: number;
}

// ============================================
// Component
// ============================================

export function ContainerDetailSheet<T extends ContainerAsset>({
  asset,
  open,
  onOpenChange,
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientVia = "via-transparent",
  onEdit,
  quickActions,
  overviewContent,
  subtitle,
  assetTypeName,
  statusBadge,
  showFindingsTab = true,
  findingCount = 0,
}: ContainerDetailSheetProps<T>) {
  if (!asset) return null;

  // Calculate icon background color from text color
  const iconBgColor = iconColor.replace("text-", "bg-").replace(/(\d+)$/, "$1/20");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
        <VisuallyHidden>
          <SheetTitle>{assetTypeName} Details</SheetTitle>
        </VisuallyHidden>

        {/* Header */}
        <div
          className={cn(
            "px-6 pt-6 pb-4 bg-gradient-to-br to-transparent",
            gradientFrom,
            gradientVia
          )}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                iconBgColor
              )}
            >
              <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{asset.name}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {statusBadge}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            {quickActions}
          </div>
        </div>

        {/* Content */}
        {showFindingsTab ? (
          <Tabs defaultValue="overview" className="px-6 pb-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="findings">Findings ({findingCount})</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              {overviewContent}
            </TabsContent>

            {/* Findings Tab */}
            <TabsContent value="findings" className="mt-0">
              <AssetFindings assetId={asset.id} assetName={asset.name} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            {overviewContent}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
