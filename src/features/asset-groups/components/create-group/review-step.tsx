/**
 * Review Step
 *
 * Final step to review all group settings before creation
 */

"use client";

import * as React from "react";
import {
  FolderOpen,
  Server,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Asset, AssetType } from "@/features/assets/types";
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from "@/features/assets/types";
import type { CreateGroupFormData } from "./types";

interface ReviewStepProps {
  data: CreateGroupFormData;
  ungroupedAssets: Asset[];
}

const ENVIRONMENT_LABELS = {
  production: "Production",
  staging: "Staging",
  development: "Development",
  testing: "Testing",
};

const CRITICALITY_CONFIG = {
  critical: { label: "Critical", color: "bg-red-500" },
  high: { label: "High", color: "bg-orange-500" },
  medium: { label: "Medium", color: "bg-yellow-500" },
  low: { label: "Low", color: "bg-blue-500" },
};

export function ReviewStep({ data, ungroupedAssets }: ReviewStepProps) {
  // Get selected assets details
  const selectedAssets = React.useMemo(
    () => ungroupedAssets.filter((a) => data.selectedAssetIds.includes(a.id)),
    [ungroupedAssets, data.selectedAssetIds]
  );

  // Calculate totals
  const totalAssets = selectedAssets.length + data.newAssets.length;

  // Group assets by type for summary
  const assetsByType = React.useMemo(() => {
    const counts: Partial<Record<AssetType, { existing: number; new: number }>> = {};

    selectedAssets.forEach((asset) => {
      if (!counts[asset.type]) {
        counts[asset.type] = { existing: 0, new: 0 };
      }
      counts[asset.type]!.existing++;
    });

    data.newAssets.forEach((asset) => {
      if (!counts[asset.type]) {
        counts[asset.type] = { existing: 0, new: 0 };
      }
      counts[asset.type]!.new++;
    });

    return Object.entries(counts).filter(
      ([, value]) => value && (value.existing > 0 || value.new > 0)
    );
  }, [selectedAssets, data.newAssets]);

  // Validation warnings
  const warnings: string[] = [];
  if (!data.name.trim()) {
    warnings.push("Group name is required");
  }
  data.newAssets.forEach((asset, index) => {
    if (!asset.name.trim()) {
      warnings.push(`New asset ${index + 1} is missing a name`);
    }
  });

  const critConfig = CRITICALITY_CONFIG[data.criticality];

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Review and Create</h3>
          <p className="text-xs text-muted-foreground">
            Review your group settings before creating
          </p>
        </div>
        {warnings.length === 0 ? (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready to create
          </Badge>
        ) : (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {warnings.length} issue(s)
          </Badge>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Please fix these issues:</span>
          </div>
          <ul className="text-sm text-destructive/80 space-y-1 ml-6 list-disc">
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-[280px] max-h-[350px]">
        <div className="space-y-6">
          {/* Group Info */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">{data.name || "Unnamed Group"}</h4>
                <p className="text-sm text-muted-foreground">
                  {data.description || "No description"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Environment</p>
                <Badge variant="outline">
                  {ENVIRONMENT_LABELS[data.environment]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Criticality</p>
                <Badge className={cn(critConfig.color, "text-white")}>
                  {critConfig.label}
                </Badge>
              </div>
            </div>

            {/* Business Context */}
            {(data.businessUnit || data.owner || data.tags.length > 0) && (
              <div className="border-t pt-3 mt-3 space-y-2">
                {data.businessUnit && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Business Unit:</span>
                    <span className="font-medium">{data.businessUnit}</span>
                  </div>
                )}
                {data.owner && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Owner:</span>
                    <span className="font-medium">{data.owner}</span>
                    {data.ownerEmail && (
                      <span className="text-muted-foreground">({data.ownerEmail})</span>
                    )}
                  </div>
                )}
                {data.tags.length > 0 && (
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Tags className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Tags:</span>
                    {data.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Assets Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Assets Summary</h4>
              <Badge variant="secondary">
                <Server className="h-3 w-3 mr-1" />
                {totalAssets} total
              </Badge>
            </div>

            {totalAssets === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
                <p className="text-sm">No assets will be added to this group</p>
                <p className="text-xs">You can add assets later</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Existing assets */}
                {selectedAssets.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Existing Assets</p>
                      <Badge variant="outline">{selectedAssets.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedAssets.slice(0, 8).map((asset) => {
                        const colors = ASSET_TYPE_COLORS[asset.type];
                        return (
                          <Badge
                            key={asset.id}
                            variant="secondary"
                            className={cn("gap-1", colors.bg)}
                          >
                            <span className={cn("text-xs", colors.text)}>
                              {asset.type.charAt(0).toUpperCase()}
                            </span>
                            {asset.name}
                          </Badge>
                        );
                      })}
                      {selectedAssets.length > 8 && (
                        <Badge variant="outline">
                          +{selectedAssets.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* New assets */}
                {data.newAssets.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        New Assets
                      </p>
                      <Badge variant="outline">{data.newAssets.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {data.newAssets.slice(0, 8).map((asset) => {
                        const colors = ASSET_TYPE_COLORS[asset.type];
                        return (
                          <Badge
                            key={asset.id}
                            variant="secondary"
                            className={cn("gap-1", colors.bg)}
                          >
                            <span className={cn("text-xs", colors.text)}>
                              {asset.type.charAt(0).toUpperCase()}
                            </span>
                            {asset.name || "Unnamed"}
                          </Badge>
                        );
                      })}
                      {data.newAssets.length > 8 && (
                        <Badge variant="outline">
                          +{data.newAssets.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* By type breakdown */}
                {assetsByType.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Breakdown by type:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {assetsByType.map(([type, counts]) => {
                        const colors = ASSET_TYPE_COLORS[type as AssetType];
                        const total = counts.existing + counts.new;
                        return (
                          <div
                            key={type}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "h-6 w-6 rounded flex items-center justify-center",
                                  colors.bg
                                )}
                              >
                                <span
                                  className={cn("text-xs font-bold", colors.text)}
                                >
                                  {type.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span>{ASSET_TYPE_LABELS[type as AssetType]}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {total}
                              {counts.new > 0 && (
                                <span className="text-xs ml-1 text-green-500">
                                  (+{counts.new})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
