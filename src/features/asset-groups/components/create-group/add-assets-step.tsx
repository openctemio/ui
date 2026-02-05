/**
 * Add Assets Step
 *
 * Combined step for adding assets to the group:
 * - Select existing ungrouped assets
 * - Create new assets (simplified)
 *
 * Uses tabs for clear context switching
 */

"use client";

import * as React from "react";
import {
  Search,
  Check,
  X,
  FolderOpen,
  Plus,
  Trash2,
  ListChecks,
  PlusCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Asset, AssetType } from "@/features/assets/types";
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from "@/features/assets/types";
import { useActiveAssetTypes } from "@/features/asset-types/api/use-asset-type-api";
import type { CreateGroupFormData, NewAssetFormData } from "./types";

interface AddAssetsStepProps {
  data: CreateGroupFormData;
  onChange: (data: Partial<CreateGroupFormData>) => void;
  ungroupedAssets: Asset[];
}

function generateId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function AddAssetsStep({
  data,
  onChange,
  ungroupedAssets,
}: AddAssetsStepProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<AssetType | "all">("all");
  const [newAssetType, setNewAssetType] = React.useState<AssetType>("domain");
  const [newAssetName, setNewAssetName] = React.useState("");

  // Fetch asset types from API
  const { assetTypes, isLoading: isLoadingTypes } = useActiveAssetTypes();

  // Get current asset type info from API data
  const currentAssetTypeInfo = React.useMemo(
    () => assetTypes.find((t) => t.code === newAssetType),
    [assetTypes, newAssetType]
  );

  // Get placeholder for current asset type
  const currentPlaceholder = currentAssetTypeInfo?.pattern_placeholder ||
    currentAssetTypeInfo?.pattern_example ||
    "Enter asset name";

  // Helper to get asset type name from API data
  const getAssetTypeName = React.useCallback(
    (typeCode: string) => {
      const typeInfo = assetTypes.find((t) => t.code === typeCode);
      return typeInfo?.name || ASSET_TYPE_LABELS[typeCode as AssetType] || typeCode;
    },
    [assetTypes]
  );

  // Validate input against pattern
  const validationResult = React.useMemo(() => {
    if (!newAssetName.trim()) {
      return { isValid: true, error: null }; // Empty is ok (not submitted yet)
    }

    const pattern = currentAssetTypeInfo?.pattern_regex;
    if (!pattern) {
      return { isValid: true, error: null }; // No pattern = always valid
    }

    try {
      const regex = new RegExp(pattern);
      const isValid = regex.test(newAssetName.trim());
      return {
        isValid,
        error: isValid ? null : `Invalid ${currentAssetTypeInfo?.name || 'asset'} format`,
      };
    } catch {
      return { isValid: true, error: null }; // Invalid regex = skip validation
    }
  }, [newAssetName, currentAssetTypeInfo]);


  // Filter assets
  const filteredAssets = React.useMemo(() => {
    let result = ungroupedAssets;
    if (typeFilter !== "all") {
      result = result.filter((asset) => asset.type === typeFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.description?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [ungroupedAssets, typeFilter, searchQuery]);

  // Toggle asset selection
  const toggleAsset = (assetId: string) => {
    const isSelected = data.selectedAssetIds.includes(assetId);
    onChange({
      selectedAssetIds: isSelected
        ? data.selectedAssetIds.filter((id) => id !== assetId)
        : [...data.selectedAssetIds, assetId],
    });
  };

  // Select all filtered assets
  const selectAll = () => {
    const filteredIds = filteredAssets.map((a) => a.id);
    const newSelection = new Set([...data.selectedAssetIds, ...filteredIds]);
    onChange({ selectedAssetIds: Array.from(newSelection) });
  };

  // Deselect all
  const deselectAll = () => {
    onChange({ selectedAssetIds: [] });
  };

  // Add new asset
  const addNewAsset = () => {
    if (!newAssetName.trim() || !validationResult.isValid) return;
    const newAsset: NewAssetFormData = {
      id: generateId(),
      type: newAssetType,
      name: newAssetName.trim(),
      description: "",
      tags: [],
    };
    onChange({ newAssets: [...data.newAssets, newAsset] });
    setNewAssetName("");
  };

  // Delete new asset
  const deleteNewAsset = (id: string) => {
    onChange({
      newAssets: data.newAssets.filter((asset) => asset.id !== id),
    });
  };

  // Handle Enter key for quick add
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewAsset();
    }
  };

  // Total assets count
  const totalCount = data.selectedAssetIds.length + data.newAssets.length;

  return (
    <div className="flex flex-col h-full p-6">
      {/* Summary header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium">Add Assets to Group</h3>
          <p className="text-xs text-muted-foreground">
            Select existing or create new assets
          </p>
        </div>
        <Badge variant={totalCount > 0 ? "default" : "secondary"}>
          {totalCount} asset{totalCount !== 1 ? "s" : ""} added
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="select" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="select" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Select Existing
            {data.selectedAssetIds.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {data.selectedAssetIds.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create New
            {data.newAssets.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {data.newAssets.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Select Existing Tab */}
        <TabsContent value="select" className="flex-1 flex flex-col mt-0 space-y-3">
          {/* Search and filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as AssetType | "all")}
              disabled={isLoadingTypes}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder={isLoadingTypes ? "Loading..." : "All types"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {assetTypes.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick actions */}
          {filteredAssets.length > 0 && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="h-7 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Select All
              </Button>
              {data.selectedAssetIds.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="h-7 text-xs text-muted-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Asset list */}
          <ScrollArea className="flex-1 min-h-[200px] max-h-[260px] rounded-lg border">
            {filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                <FolderOpen className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No ungrouped assets</p>
                <p className="text-xs">
                  {searchQuery || typeFilter !== "all"
                    ? "Try adjusting filters"
                    : "Switch to Create New tab"}
                </p>
              </div>
            ) : (
              <div className="p-1.5 space-y-1">
                {filteredAssets.map((asset) => {
                  const isSelected = data.selectedAssetIds.includes(asset.id);
                  const colors = ASSET_TYPE_COLORS[asset.type] || {
                    bg: "bg-gray-500/15",
                    text: "text-gray-600",
                  };

                  return (
                    <div
                      key={asset.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleAsset(asset.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleAsset(asset.id);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full p-2.5 rounded-md text-left transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <div
                        className={cn(
                          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                          colors.bg
                        )}
                      >
                        <span className={cn("text-xs font-bold", colors.text)}>
                          {asset.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {asset.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAssetTypeName(asset.type)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Create New Tab */}
        <TabsContent value="create" className="flex-1 flex flex-col mt-0 space-y-3">
          {/* Quick add form */}
          <Card className="p-3">
            <div className="flex gap-2">
              <Select
                value={newAssetType}
                onValueChange={(v) => setNewAssetType(v as AssetType)}
                disabled={isLoadingTypes}
              >
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder={isLoadingTypes ? "Loading..." : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => (
                    <SelectItem key={type.code} value={type.code}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={currentPlaceholder}
                value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "flex-1 h-9",
                  validationResult.error && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <Button
                type="button"
                onClick={addNewAsset}
                disabled={!newAssetName.trim() || !validationResult.isValid || isLoadingTypes}
                size="sm"
                className="h-9 px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {validationResult.error ? (
              <p className="text-xs text-destructive mt-2">
                {validationResult.error}
                {currentAssetTypeInfo?.pattern_example && (
                  <span className="text-muted-foreground ml-1">
                    (e.g., {currentAssetTypeInfo.pattern_example})
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to quickly add multiple assets
              </p>
            )}
          </Card>

          {/* New assets list */}
          <ScrollArea className="flex-1 min-h-[180px] max-h-[240px]">
            {data.newAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground border rounded-lg border-dashed">
                <Plus className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No assets added yet</p>
                <p className="text-xs">Use the form above to add assets</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {data.newAssets.map((asset) => {
                  const colors = ASSET_TYPE_COLORS[asset.type] || {
                    bg: "bg-gray-500/15",
                    text: "text-gray-600",
                  };

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center gap-3 p-2.5 rounded-md border bg-card group"
                    >
                      <div
                        className={cn(
                          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                          colors.bg
                        )}
                      >
                        <span className={cn("text-xs font-bold", colors.text)}>
                          {asset.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {asset.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getAssetTypeName(asset.type)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        New
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNewAsset(asset.id)}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Type summary */}
          {data.newAssets.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {Object.entries(
                data.newAssets.reduce(
                  (acc, asset) => {
                    acc[asset.type] = (acc[asset.type] || 0) + 1;
                    return acc;
                  },
                  {} as Record<AssetType, number>
                )
              ).map(([type, count]) => {
                const colors = ASSET_TYPE_COLORS[type as AssetType] || {
                  bg: "bg-gray-500/15",
                  text: "text-gray-600",
                };
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className={cn("text-xs", colors.text)}
                  >
                    {getAssetTypeName(type)}: {count}
                  </Badge>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
