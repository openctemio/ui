"use client";

/**
 * Relationship Section Component
 *
 * A section component for displaying relationships in asset detail sheets
 */

import * as React from "react";
import {
  ArrowRight,
  ArrowLeft,
  Link2,
  Plus,
  ChevronRight,
  LayoutGrid,
  List,
  GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AssetRelationship, RelationshipDirection } from "../../types";
import { RELATIONSHIP_LABELS } from "../../types";
import { RelationshipCard, RelationshipListItem } from "./relationship-card";
import { RelationshipGraphView, MiniGraph } from "./relationship-graph";
import { buildRelationshipGraph } from "../../lib";

// ============================================
// Types
// ============================================

interface RelationshipSectionProps {
  /** All relationships for this asset */
  relationships: AssetRelationship[];
  /** Current asset ID */
  currentAssetId: string;
  /** Called when "Add" button is clicked */
  onAddClick?: () => void;
  /** Called when a relationship is clicked for editing */
  onEditClick?: (relationship: AssetRelationship) => void;
  /** Called when delete is clicked */
  onDeleteClick?: (relationship: AssetRelationship) => void;
  /** Called when an asset is clicked to navigate */
  onAssetClick?: (assetId: string) => void;
  /** Show graph view by default */
  defaultView?: "list" | "card" | "graph";
  /** Maximum height for scrollable area */
  maxHeight?: string;
  className?: string;
}

// ============================================
// View Modes
// ============================================

type ViewMode = "list" | "card" | "graph";

// ============================================
// Relationship Section Component
// ============================================

export function RelationshipSection({
  relationships,
  currentAssetId,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onAssetClick,
  defaultView = "list",
  maxHeight = "400px",
  className,
}: RelationshipSectionProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultView);
  const [activeTab, setActiveTab] = React.useState<"all" | "outgoing" | "incoming">("all");

  // Split relationships by direction
  const { outgoing, incoming } = React.useMemo(() => {
    const out: AssetRelationship[] = [];
    const inc: AssetRelationship[] = [];

    relationships.forEach((rel) => {
      if (rel.sourceAssetId === currentAssetId) {
        out.push(rel);
      } else {
        inc.push(rel);
      }
    });

    return { outgoing: out, incoming: inc };
  }, [relationships, currentAssetId]);

  // Filter based on active tab
  const filteredRelationships = React.useMemo(() => {
    switch (activeTab) {
      case "outgoing":
        return outgoing;
      case "incoming":
        return incoming;
      default:
        return relationships;
    }
  }, [activeTab, relationships, outgoing, incoming]);

  // Build graph data
  const graphData = React.useMemo(
    () => buildRelationshipGraph(currentAssetId),
    [currentAssetId]
  );

  // Get direction for a relationship
  const getDirection = (rel: AssetRelationship): RelationshipDirection => {
    return rel.sourceAssetId === currentAssetId ? "outgoing" : "incoming";
  };

  if (relationships.length === 0) {
    return (
      <div className={cn("rounded-xl border p-6 bg-card", className)}>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Link2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h4 className="text-sm font-medium mb-1">No Relationships</h4>
          <p className="text-xs text-muted-foreground mb-4">
            This asset has no relationships with other assets yet.
          </p>
          {onAddClick && (
            <Button size="sm" onClick={onAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              Add Relationship
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-medium">Relationships</h4>
          <Badge variant="secondary" className="text-xs">
            {relationships.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "graph" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("graph")}
            >
              <GitBranch className="h-4 w-4" />
            </Button>
          </div>
          {onAddClick && (
            <Button size="sm" variant="outline" onClick={onAddClick}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for direction filter */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="px-4 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">
              All ({relationships.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="text-xs">
              <ArrowRight className="mr-1 h-3 w-3" />
              Outgoing ({outgoing.length})
            </TabsTrigger>
            <TabsTrigger value="incoming" className="text-xs">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Incoming ({incoming.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="m-0">
          {viewMode === "graph" ? (
            <div className="p-4">
              <RelationshipGraphView
                graph={graphData}
                centralNodeId={currentAssetId}
                onNodeClick={onAssetClick}
              />
            </div>
          ) : (
            <ScrollArea style={{ maxHeight }} className="p-4">
              {viewMode === "list" ? (
                <div className="space-y-2">
                  {filteredRelationships.map((rel) => (
                    <RelationshipListItem
                      key={rel.id}
                      relationship={rel}
                      direction={getDirection(rel)}
                      currentAssetId={currentAssetId}
                      onClick={() => onEditClick?.(rel)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredRelationships.map((rel) => (
                    <RelationshipCard
                      key={rel.id}
                      relationship={rel}
                      direction={getDirection(rel)}
                      currentAssetId={currentAssetId}
                      onEdit={onEditClick}
                      onDelete={onDeleteClick}
                      onSourceClick={onAssetClick}
                      onTargetClick={onAssetClick}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick stats footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
        <span>
          {outgoing.length} outgoing, {incoming.length} incoming
        </span>
        <span>
          Avg. Impact:{" "}
          {(
            relationships.reduce((sum, r) => sum + r.impactWeight, 0) / relationships.length
          ).toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Compact Relationship Preview
// ============================================

interface RelationshipPreviewProps {
  relationships: AssetRelationship[];
  currentAssetId: string;
  onViewAll?: () => void;
  onAssetClick?: (assetId: string) => void;
  maxItems?: number;
  className?: string;
}

export function RelationshipPreview({
  relationships,
  currentAssetId,
  onViewAll,
  onAssetClick,
  maxItems = 3,
  className,
}: RelationshipPreviewProps) {
  const graphData = React.useMemo(
    () => buildRelationshipGraph(currentAssetId),
    [currentAssetId]
  );

  const displayRelationships = relationships.slice(0, maxItems);
  const remainingCount = relationships.length - maxItems;

  if (relationships.length === 0) {
    return (
      <div className={cn("rounded-lg border p-3 bg-card", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Link2 className="h-4 w-4" />
          <span className="text-sm">No relationships</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Relationships</span>
          <Badge variant="secondary" className="text-xs">
            {relationships.length}
          </Badge>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="h-7 text-xs">
            View All
            <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Mini graph */}
        <MiniGraph graph={graphData} centralNodeId={currentAssetId} />

        {/* Relationship list */}
        {displayRelationships.map((rel) => {
          const isOutgoing = rel.sourceAssetId === currentAssetId;
          const otherAsset = isOutgoing
            ? { name: rel.targetAssetName, type: rel.targetAssetType, id: rel.targetAssetId }
            : { name: rel.sourceAssetName, type: rel.sourceAssetType, id: rel.sourceAssetId };
          const label = RELATIONSHIP_LABELS[rel.type];

          return (
            <button
              key={rel.id}
              onClick={() => onAssetClick?.(otherAsset.id)}
              className="flex items-center gap-2 w-full p-2 rounded hover:bg-accent/50 transition-colors text-left"
            >
              {isOutgoing ? (
                <ArrowRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              ) : (
                <ArrowLeft className="h-3.5 w-3.5 text-green-500 shrink-0" />
              )}
              <span className="text-xs text-muted-foreground shrink-0">
                {isOutgoing ? label.direct : label.inverse}
              </span>
              <span className="text-sm font-medium truncate flex-1">{otherAsset.name}</span>
            </button>
          );
        })}

        {remainingCount > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{remainingCount} more relationships
          </p>
        )}
      </div>
    </div>
  );
}
