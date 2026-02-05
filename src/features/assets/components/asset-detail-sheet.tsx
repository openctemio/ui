/**
 * Asset Detail Sheet
 *
 * Reusable sheet component for viewing asset details
 * Supports customization via render props for type-specific content
 */

"use client";

import * as React from "react";
import { Pencil, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/features/shared";
import { AssetFindings } from "./asset-findings";
import {
  TimelineSection,
  TechnicalDetailsSection,
  DangerZoneSection,
  TagsSection,
} from "./sheet-sections";
import { RelationshipSection, RelationshipPreview } from "./relationships";
import { ClassificationBadges } from "./classification-badges";
import type { Asset } from "../types/asset.types";
import type { AssetRelationship } from "../types/relationship.types";

// ============================================
// Types
// ============================================

interface AssetDetailSheetProps<T extends Asset> {
  /** The asset to display (null when sheet is closed) */
  asset: T | null;

  /** Whether the sheet is open */
  open: boolean;

  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;

  /** Icon component to display in header */
  icon: React.ElementType;

  /** Icon color class (e.g., "text-blue-500") */
  iconColor: string;

  /** Gradient start color class (e.g., "from-blue-500/20") */
  gradientFrom: string;

  /** Gradient via color class (optional, e.g., "via-blue-500/10") */
  gradientVia?: string;

  /** Callback when Edit button is clicked */
  onEdit: () => void;

  /** Callback when Delete is clicked from danger zone */
  onDelete: () => void;

  /** Whether user can edit the asset (for permission gating, default: true) */
  canEdit?: boolean;

  /** Whether user can delete the asset (for permission gating, default: true) */
  canDelete?: boolean;

  /** Additional quick action buttons (rendered after Edit button) */
  quickActions?: React.ReactNode;

  /** Custom stats section content */
  statsContent?: React.ReactNode;

  /** Custom overview section content (rendered after stats) */
  overviewContent?: React.ReactNode;

  /** Optional subtitle (shown below name, defaults to groupName) */
  subtitle?: string;

  /** Asset type label for display (e.g., "Domain", "Website") */
  assetTypeName: string;

  /** Whether to show the Details tab (default: true) */
  showDetailsTab?: boolean;

  /** Whether to show the Findings tab (default: true) */
  showFindingsTab?: boolean;

  /** Custom tabs to insert between Overview and Findings */
  extraTabs?: Array<{
    value: string;
    label: string;
    content: React.ReactNode;
  }>;

  // ============================================
  // Relationship Props
  // ============================================

  /** Relationships for this asset (optional - if provided, shows Relationships tab) */
  relationships?: AssetRelationship[];

  /** Callback when Add Relationship is clicked */
  onAddRelationship?: () => void;

  /** Callback when a relationship is edited */
  onEditRelationship?: (relationship: AssetRelationship) => void;

  /** Callback when a relationship is deleted */
  onDeleteRelationship?: (relationship: AssetRelationship) => void;

  /** Callback when navigating to a related asset */
  onNavigateToAsset?: (assetId: string) => void;

  /** Whether to show relationship preview in overview tab (default: true if relationships provided) */
  showRelationshipPreview?: boolean;
}

// ============================================
// Component
// ============================================

export function AssetDetailSheet<T extends Asset>({
  asset,
  open,
  onOpenChange,
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientVia = "via-transparent",
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  quickActions,
  statsContent,
  overviewContent,
  subtitle,
  assetTypeName,
  showDetailsTab = true,
  showFindingsTab = true,
  extraTabs,
  // Relationship props
  relationships,
  onAddRelationship,
  onEditRelationship,
  onDeleteRelationship,
  onNavigateToAsset,
  showRelationshipPreview,
}: AssetDetailSheetProps<T>) {
  const [activeTab, setActiveTab] = React.useState("overview");

  if (!asset) return null;

  // Calculate icon background color from text color
  const iconBgColor = iconColor.replace("text-", "bg-").replace(/(\d+)$/, "$1/20");

  // Determine if we should show relationships
  const hasRelationships = relationships && relationships.length > 0;
  const shouldShowRelationshipTab = relationships !== undefined;
  const shouldShowRelationshipPreview = showRelationshipPreview ?? hasRelationships;

  // Calculate total number of tabs
  const tabCount = 1 + (showFindingsTab ? 1 : 0) + (showDetailsTab ? 1 : 0) + (extraTabs?.length || 0) + (shouldShowRelationshipTab ? 1 : 0);
  const tabGridClass =
    tabCount === 2 ? "grid-cols-2" :
    tabCount === 3 ? "grid-cols-3" :
    tabCount === 4 ? "grid-cols-4" :
    tabCount === 5 ? "grid-cols-5" : "grid-cols-3";

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
              <p className="text-sm text-muted-foreground truncate">
                {subtitle || asset.groupName}
              </p>
            </div>
            <StatusBadge status={asset.status} />
          </div>

          {/* Classification Badges */}
          <div className="flex items-center gap-2 mb-2">
            <ClassificationBadges
              scope={asset.scope}
              exposure={asset.exposure}
              criticality={asset.criticality}
              size="md"
              showTooltips
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {quickActions}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 pb-6">
          <TabsList className={cn("grid w-full mb-4", tabGridClass)}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {extraTabs?.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
            {shouldShowRelationshipTab && (
              <TabsTrigger value="relationships" className="gap-1">
                <Link2 className="h-3.5 w-3.5" />
                Relations
              </TabsTrigger>
            )}
            {showFindingsTab && (
              <TabsTrigger value="findings">Findings</TabsTrigger>
            )}
            {showDetailsTab && (
              <TabsTrigger value="details">Details</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {statsContent}
            {overviewContent}

            {/* Relationship Preview in Overview */}
            {shouldShowRelationshipPreview && relationships && (
              <RelationshipPreview
                relationships={relationships}
                currentAssetId={asset.id}
                onViewAll={() => setActiveTab("relationships")}
                onAssetClick={onNavigateToAsset}
                maxItems={3}
              />
            )}

            <TagsSection tags={asset.tags} />
          </TabsContent>

          {/* Extra Tabs */}
          {extraTabs?.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              {tab.content}
            </TabsContent>
          ))}

          {/* Relationships Tab */}
          {shouldShowRelationshipTab && (
            <TabsContent value="relationships" className="mt-0">
              <RelationshipSection
                relationships={relationships || []}
                currentAssetId={asset.id}
                onAddClick={onAddRelationship}
                onEditClick={onEditRelationship}
                onDeleteClick={onDeleteRelationship}
                onAssetClick={onNavigateToAsset}
                maxHeight="500px"
              />
            </TabsContent>
          )}

          {/* Findings Tab */}
          {showFindingsTab && (
            <TabsContent value="findings" className="mt-0">
              <AssetFindings assetId={asset.id} assetName={asset.name} />
            </TabsContent>
          )}

          {/* Details Tab */}
          {showDetailsTab && (
            <TabsContent value="details" className="space-y-4 mt-0">
              <TimelineSection
                firstSeen={asset.firstSeen}
                lastSeen={asset.lastSeen}
              />
              <TechnicalDetailsSection
                id={asset.id}
                type={asset.type}
                groupId={asset.groupId}
              />
              {canDelete && (
                <DangerZoneSection
                  onDelete={onDelete}
                  assetTypeName={assetTypeName}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
