"use client";

/**
 * Add Relationship Dialog Component
 *
 * Dialog for creating new relationships between assets
 */

import * as React from "react";
import { Search, Link2, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type {
  RelationshipType,
  ExtendedAssetType,
  CreateRelationshipInput,
  RelationshipConfidence,
} from "../../types";
import {
  RELATIONSHIP_LABELS,
  EXTENDED_ASSET_TYPE_LABELS,
  getValidRelationshipTypes,
  getValidTargetTypes,
  isValidRelationship,
} from "../../types";

// ============================================
// Types
// ============================================

export interface AssetOption {
  id: string;
  name: string;
  type: ExtendedAssetType;
  description?: string;
}

interface AddRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current asset (source of the relationship) */
  sourceAsset: AssetOption;
  /** Available assets to select as target */
  availableAssets: AssetOption[];
  /** Called when relationship is created */
  onSubmit: (input: CreateRelationshipInput) => void;
  /** Loading state */
  isLoading?: boolean;
}

// ============================================
// Asset Type Colors
// ============================================

const ASSET_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  domain: { bg: "bg-blue-500/20", text: "text-blue-500" },
  website: { bg: "bg-green-500/20", text: "text-green-500" },
  service: { bg: "bg-purple-500/20", text: "text-purple-500" },
  project: { bg: "bg-orange-500/20", text: "text-orange-500" },
  repository: { bg: "bg-orange-500/20", text: "text-orange-500" }, // @deprecated
  cloud: { bg: "bg-cyan-500/20", text: "text-cyan-500" },
  credential: { bg: "bg-red-500/20", text: "text-red-500" },
  host: { bg: "bg-slate-500/20", text: "text-slate-500" },
  container: { bg: "bg-indigo-500/20", text: "text-indigo-500" },
  database: { bg: "bg-yellow-500/20", text: "text-yellow-500" },
  mobile: { bg: "bg-pink-500/20", text: "text-pink-500" },
  api: { bg: "bg-emerald-500/20", text: "text-emerald-500" },
  k8s_cluster: { bg: "bg-blue-600/20", text: "text-blue-600" },
  k8s_workload: { bg: "bg-blue-400/20", text: "text-blue-400" },
  container_image: { bg: "bg-violet-500/20", text: "text-violet-500" },
  api_collection: { bg: "bg-teal-500/20", text: "text-teal-500" },
  api_endpoint: { bg: "bg-teal-400/20", text: "text-teal-400" },
  network: { bg: "bg-gray-500/20", text: "text-gray-500" },
  load_balancer: { bg: "bg-amber-500/20", text: "text-amber-500" },
  identity_provider: { bg: "bg-rose-500/20", text: "text-rose-500" },
};

// ============================================
// Asset Selector Item
// ============================================

function AssetSelectorItem({
  asset,
  selected,
  onClick,
  disabled,
}: {
  asset: AssetOption;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const colors = ASSET_TYPE_COLORS[asset.type] || { bg: "bg-gray-500/20", text: "text-gray-500" };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-accent/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", colors.bg)}>
        <Link2 className={cn("h-4 w-4", colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{asset.name}</p>
        <p className="text-xs text-muted-foreground">
          {EXTENDED_ASSET_TYPE_LABELS[asset.type] || asset.type}
        </p>
      </div>
      {selected && (
        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
          <svg
            className="h-3 w-3 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

// ============================================
// Add Relationship Dialog Component
// ============================================

export function AddRelationshipDialog({
  open,
  onOpenChange,
  sourceAsset,
  availableAssets,
  onSubmit,
  isLoading = false,
}: AddRelationshipDialogProps) {
  // Form state
  const [relationshipType, setRelationshipType] = React.useState<RelationshipType | "">("");
  const [targetAssetId, setTargetAssetId] = React.useState<string>("");
  const [description, setDescription] = React.useState("");
  const [confidence, setConfidence] = React.useState<RelationshipConfidence>("medium");
  const [impactWeight, setImpactWeight] = React.useState(5);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Get valid relationship types for source asset
  const validRelationshipTypes = React.useMemo(
    () => getValidRelationshipTypes(sourceAsset.type),
    [sourceAsset.type]
  );

  // Get valid target types based on selected relationship
  const validTargetTypes = React.useMemo(() => {
    if (!relationshipType) return [];
    return getValidTargetTypes(relationshipType as RelationshipType, sourceAsset.type);
  }, [relationshipType, sourceAsset.type]);

  // Filter available assets based on valid target types and search
  const filteredAssets = React.useMemo(() => {
    let result = availableAssets;

    // Filter by valid target types if relationship is selected
    if (validTargetTypes.length > 0) {
      result = result.filter((asset) => validTargetTypes.includes(asset.type));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.type.toLowerCase().includes(query)
      );
    }

    // Exclude source asset
    result = result.filter((asset) => asset.id !== sourceAsset.id);

    return result;
  }, [availableAssets, validTargetTypes, searchQuery, sourceAsset.id]);

  // Selected target asset
  const selectedTarget = React.useMemo(
    () => availableAssets.find((a) => a.id === targetAssetId),
    [availableAssets, targetAssetId]
  );

  // Validation
  const isValid = React.useMemo(() => {
    if (!relationshipType || !targetAssetId) return false;
    if (!selectedTarget) return false;
    return isValidRelationship(
      relationshipType as RelationshipType,
      sourceAsset.type,
      selectedTarget.type
    );
  }, [relationshipType, targetAssetId, selectedTarget, sourceAsset.type]);

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setRelationshipType("");
      setTargetAssetId("");
      setDescription("");
      setConfidence("medium");
      setImpactWeight(5);
      setSearchQuery("");
    }
  }, [open]);

  // Handle submit
  const handleSubmit = () => {
    if (!isValid || !relationshipType) return;

    onSubmit({
      type: relationshipType as RelationshipType,
      sourceAssetId: sourceAsset.id,
      targetAssetId,
      description: description || undefined,
      confidence,
      discoveryMethod: "manual",
      impactWeight,
    });
  };

  const sourceColors = ASSET_TYPE_COLORS[sourceAsset.type] || {
    bg: "bg-gray-500/20",
    text: "text-gray-500",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogDescription>
            Create a new relationship from {sourceAsset.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source Asset Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", sourceColors.bg)}>
              <Link2 className={cn("h-5 w-5", sourceColors.text)} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{sourceAsset.name}</p>
              <p className="text-xs text-muted-foreground">
                {EXTENDED_ASSET_TYPE_LABELS[sourceAsset.type]} (Source)
              </p>
            </div>
          </div>

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label>Relationship Type</Label>
            <Select
              value={relationshipType}
              onValueChange={(v) => {
                setRelationshipType(v as RelationshipType);
                setTargetAssetId(""); // Reset target when type changes
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent>
                {validRelationshipTypes.map((type) => {
                  const labels = RELATIONSHIP_LABELS[type];
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex flex-col">
                        <span>{labels.direct}</span>
                        <span className="text-xs text-muted-foreground">
                          {labels.description}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Visual Preview */}
          {relationshipType && (
            <div className="flex items-center justify-center gap-3 py-2">
              <Badge variant="secondary">{sourceAsset.name}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">
                {RELATIONSHIP_LABELS[relationshipType as RelationshipType]?.direct}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">
                {selectedTarget?.name || "Select target..."}
              </Badge>
            </div>
          )}

          {/* Target Asset Selector */}
          <div className="space-y-2">
            <Label>Target Asset</Label>
            {!relationshipType ? (
              <div className="flex items-center gap-2 p-4 rounded-lg border border-dashed text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Select a relationship type first</span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="h-[200px] rounded-lg border p-2">
                  {filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Link2 className="h-8 w-8 mb-2" />
                      <p className="text-sm">No compatible assets found</p>
                      {validTargetTypes.length > 0 && (
                        <p className="text-xs mt-1">
                          Looking for: {validTargetTypes.map((t) => EXTENDED_ASSET_TYPE_LABELS[t]).join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredAssets.map((asset) => (
                        <AssetSelectorItem
                          key={asset.id}
                          asset={asset}
                          selected={asset.id === targetAssetId}
                          onClick={() => setTargetAssetId(asset.id)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </>
            )}
          </div>

          {/* Additional Options */}
          {targetAssetId && (
            <>
              {/* Description */}
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  placeholder="Describe this relationship..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Confidence & Impact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Confidence</Label>
                  <Select
                    value={confidence}
                    onValueChange={(v) => setConfidence(v as RelationshipConfidence)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Impact Weight: {impactWeight}</Label>
                  <Slider
                    value={[impactWeight]}
                    onValueChange={([v]) => setImpactWeight(v)}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? "Creating..." : "Create Relationship"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
