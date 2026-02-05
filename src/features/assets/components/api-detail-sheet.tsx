/**
 * API Detail Sheet
 *
 * Reusable sheet component for viewing API asset details
 * Supports custom tabs for endpoints and other API-specific content
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
import type { Api } from "../types/asset.types";

// ============================================
// Types
// ============================================

interface ApiDetailSheetProps {
  /** The API to display (null when sheet is closed) */
  api: Api | null;

  /** Whether the sheet is open */
  open: boolean;

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;

  /** Icon component to display in header */
  icon: React.ElementType;

  /** Icon color class (e.g., "text-cyan-500") */
  iconColor: string;

  /** Gradient start color class (e.g., "from-cyan-500/20") */
  gradientFrom: string;

  /** Gradient via color class (optional, e.g., "via-cyan-500/10") */
  gradientVia?: string;

  /** Callback when Edit button is clicked */
  onEdit: () => void;

  /** Additional quick action buttons (rendered after Edit button) */
  quickActions?: React.ReactNode;

  /** Custom stats section content */
  statsContent?: React.ReactNode;

  /** Custom overview section content */
  overviewContent?: React.ReactNode;

  /** Subtitle shown below name */
  subtitle?: string;

  /** Status badge component/element to display in header */
  statusBadge?: React.ReactNode;

  /** Custom tabs to add after Overview (before Findings) */
  extraTabs?: Array<{
    value: string;
    label: string;
    content: React.ReactNode;
  }>;
}

// ============================================
// Component
// ============================================

export function ApiDetailSheet({
  api,
  open,
  onOpenChange,
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientVia = "via-transparent",
  onEdit,
  quickActions,
  statsContent,
  overviewContent,
  subtitle,
  statusBadge,
  extraTabs,
}: ApiDetailSheetProps) {
  if (!api) return null;

  // Calculate icon background color from text color
  const iconBgColor = iconColor.replace("text-", "bg-").replace(/(\d+)$/, "$1/20");

  // Calculate total number of tabs: Overview + extraTabs + Findings
  const tabCount = 2 + (extraTabs?.length || 0);
  const tabGridClass =
    tabCount === 2 ? "grid-cols-2" :
    tabCount === 3 ? "grid-cols-3" :
    tabCount === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto p-0">
        <VisuallyHidden>
          <SheetTitle>API Details</SheetTitle>
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
              <h2 className="text-xl font-bold truncate">{api.name}</h2>
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

        {/* Tabs */}
        <Tabs defaultValue="overview" className="px-6 pb-6">
          <TabsList className={cn("grid w-full mb-4", tabGridClass)}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {extraTabs?.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="findings">Findings ({api.findingCount})</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {statsContent}
            {overviewContent}
          </TabsContent>

          {/* Extra Tabs */}
          {extraTabs?.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              {tab.content}
            </TabsContent>
          ))}

          {/* Findings Tab */}
          <TabsContent value="findings" className="mt-0">
            <AssetFindings assetId={api.id} assetName={api.name} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
