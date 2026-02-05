/**
 * Add Assets Dialog (Enhanced)
 *
 * Dialog for managing assets in a group:
 * - Select Existing: View all assets, add new ones, remove existing ones
 * - Create New: Create new assets on the fly
 */

"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Trash2,
  ListChecks,
  PlusCircle,
  Package,
  Loader2,
  Server,
  Globe,
  Database,
  Cloud,
  GitBranch,
  FolderPlus,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Asset, AssetType } from "@/features/assets/types";
import { ASSET_TYPE_LABELS, ASSET_TYPE_COLORS } from "@/features/assets/types";
import { useActiveAssetTypes } from "@/features/asset-types/api/use-asset-type-api";
import { useAssets } from "@/features/assets/hooks/use-assets";

/**
 * Minimal asset interface that works with both Asset and GroupAsset types
 */
interface GroupAssetMinimal {
  id: string;
  name: string;
  type: string;
  riskScore?: number;
}

interface AddAssetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  /** Assets already in the group (accepts both Asset and GroupAsset types) */
  groupAssets?: GroupAssetMinimal[];
  /** Called when user confirms adding assets */
  onSubmit: (data: AddAssetsSubmitData) => Promise<void>;
  /** Called when user wants to remove an asset from group */
  onRemove?: (assetId: string) => Promise<void>;
  isSubmitting?: boolean;
  isRemoving?: boolean;
}

export interface AddAssetsSubmitData {
  existingAssetIds: string[];
  newAssets: NewAssetData[];
}

export interface NewAssetData {
  type: string;
  name: string;
}

function generateId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const assetTypeIcons: Record<string, React.ReactNode> = {
  domain: <Globe className="h-4 w-4" />,
  website: <Globe className="h-4 w-4" />,
  api: <Server className="h-4 w-4" />,
  host: <Server className="h-4 w-4" />,
  cloud: <Cloud className="h-4 w-4" />,
  cloud_account: <Cloud className="h-4 w-4" />,
  cloud_resource: <Cloud className="h-4 w-4" />,
  project: <GitBranch className="h-4 w-4" />,
  repository: <GitBranch className="h-4 w-4" />,
  database: <Database className="h-4 w-4" />,
};

const PAGE_SIZE = 20;

export function AddAssetsDialog({
  open,
  onOpenChange,
  groupName,
  groupAssets,
  onSubmit,
  onRemove,
  isSubmitting = false,
  isRemoving = false,
}: AddAssetsDialogProps) {
  // Selection state
  const [selectedAssetIds, setSelectedAssetIds] = React.useState<string[]>([]);
  const [newAssets, setNewAssets] = React.useState<
    Array<{ id: string; type: string; name: string }>
  >([]);
  const [newAssetType, setNewAssetType] = React.useState<string>("domain");
  const [newAssetName, setNewAssetName] = React.useState("");
  const [removingAssetId, setRemovingAssetId] = React.useState<string | null>(null);

  // Search state
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [allLoadedAssets, setAllLoadedAssets] = React.useState<Asset[]>([]);

  // Ref for intersection observer
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  // Ensure groupAssets is always an array
  const safeGroupAssets = React.useMemo(
    () => groupAssets || [],
    [groupAssets]
  );

  // Get group asset IDs for filtering
  const groupAssetIds = React.useMemo(
    () => new Set(safeGroupAssets.map((a) => a.id)),
    [safeGroupAssets]
  );

  // Fetch assets
  const { assets, isLoading, total, totalPages } = useAssets(
    open
      ? {
          search: searchQuery || undefined,
          page,
          pageSize: PAGE_SIZE,
        }
      : { page: 1, pageSize: 1 }
  );

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        setSearchQuery(searchInput);
        setPage(1);
        setAllLoadedAssets([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchQuery]);

  // Accumulate assets when data changes
  React.useEffect(() => {
    if (!open || isLoading || !assets) return;

    if (page === 1) {
      setAllLoadedAssets(assets);
    } else {
      setAllLoadedAssets((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newItems = assets.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newItems];
      });
    }
  }, [open, assets, isLoading, page]);

  // Intersection observer for infinite scroll
  React.useEffect(() => {
    if (!open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoading && page < totalPages) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [open, isLoading, page, totalPages]);

  // Fetch asset types from API
  const { assetTypes, isLoading: isLoadingTypes } = useActiveAssetTypes();

  // Get current asset type info
  const currentAssetTypeInfo = React.useMemo(
    () => assetTypes.find((t) => t.code === newAssetType),
    [assetTypes, newAssetType]
  );

  // Get placeholder for current asset type
  const currentPlaceholder =
    currentAssetTypeInfo?.pattern_placeholder ||
    currentAssetTypeInfo?.pattern_example ||
    "Enter asset name";

  // Validation
  const validationResult = React.useMemo(() => {
    if (!newAssetName.trim()) {
      return { isValid: true, error: null };
    }

    const pattern = currentAssetTypeInfo?.pattern_regex;
    if (!pattern) {
      return { isValid: true, error: null };
    }

    try {
      const regex = new RegExp(pattern);
      const isValid = regex.test(newAssetName.trim());
      return {
        isValid,
        error: isValid
          ? null
          : `Invalid ${currentAssetTypeInfo?.name || "asset"} format`,
      };
    } catch {
      return { isValid: true, error: null };
    }
  }, [newAssetName, currentAssetTypeInfo]);

  // Helper to get asset type name
  const getAssetTypeName = React.useCallback(
    (typeCode: string) => {
      const typeInfo = assetTypes.find((t) => t.code === typeCode);
      return (
        typeInfo?.name || ASSET_TYPE_LABELS[typeCode as AssetType] || typeCode
      );
    },
    [assetTypes]
  );

  // Filter assets: available (not in group)
  const availableAssets = React.useMemo(() => {
    return allLoadedAssets.filter((a) => !groupAssetIds.has(a.id));
  }, [allLoadedAssets, groupAssetIds]);

  // Filter group assets by search
  const filteredGroupAssets = React.useMemo(() => {
    if (!searchInput.trim()) return safeGroupAssets;
    const query = searchInput.toLowerCase();
    return safeGroupAssets.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.type.toLowerCase().includes(query)
    );
  }, [safeGroupAssets, searchInput]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedAssetIds([]);
      setNewAssets([]);
      setNewAssetName("");
      setSearchInput("");
      setSearchQuery("");
      setPage(1);
      setAllLoadedAssets([]);
      setRemovingAssetId(null);
    }
  }, [open]);

  // Toggle asset selection
  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  // Handle remove asset
  const handleRemoveAsset = async (assetId: string) => {
    if (!onRemove) return;
    setRemovingAssetId(assetId);
    try {
      await onRemove(assetId);
    } finally {
      setRemovingAssetId(null);
    }
  };

  // Add new asset
  const addNewAsset = () => {
    if (!newAssetName.trim() || !validationResult.isValid) return;
    setNewAssets((prev) => [
      ...prev,
      {
        id: generateId(),
        type: newAssetType,
        name: newAssetName.trim(),
      },
    ]);
    setNewAssetName("");
  };

  // Delete new asset
  const deleteNewAsset = (id: string) => {
    setNewAssets((prev) => prev.filter((a) => a.id !== id));
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewAsset();
    }
  };

  // Submit
  const handleSubmit = async () => {
    await onSubmit({
      existingAssetIds: selectedAssetIds,
      newAssets: newAssets.map((a) => ({ type: a.type, name: a.name })),
    });
  };

  const totalToAdd = selectedAssetIds.length + newAssets.length;
  const hasMore = page < totalPages;
  const showLoading = isLoading && allLoadedAssets.length === 0;
  const isBusy = isSubmitting || isRemoving;

  // Render asset row (supports both Asset and GroupAssetMinimal)
  const renderAssetRow = (
    asset: Asset | GroupAssetMinimal,
    mode: "available" | "in-group"
  ) => {
    const colors = ASSET_TYPE_COLORS[asset.type as AssetType] || {
      bg: "bg-gray-500/15",
      text: "text-gray-600",
    };
    const isSelected = selectedAssetIds.includes(asset.id);
    const isBeingRemoved = removingAssetId === asset.id;

    if (mode === "in-group") {
      return (
        <div
          key={asset.id}
          className={cn(
            "flex items-center gap-3 w-full p-3 rounded-lg bg-primary/5 border border-primary/20",
            isBeingRemoved && "opacity-50"
          )}
        >
          <div
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
              colors.bg
            )}
          >
            {assetTypeIcons[asset.type] || <Server className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{asset.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {getAssetTypeName(asset.type)}
              </span>
              {asset.riskScore !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Risk: {asset.riskScore}
                </span>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            In Group
          </Badge>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveAsset(asset.id)}
              disabled={isBusy}
            >
              {isBeingRemoved ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      );
    }

    // Available asset row
    return (
      <div
        key={asset.id}
        role="button"
        tabIndex={isBusy ? -1 : 0}
        onClick={() => !isBusy && toggleAsset(asset.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!isBusy) toggleAsset(asset.id);
          }
        }}
        className={cn(
          "flex items-center gap-3 w-full p-3 rounded-lg text-left transition-all cursor-pointer select-none",
          isSelected
            ? "bg-primary/10 ring-1 ring-primary/30"
            : "hover:bg-muted/50",
          isBusy && "opacity-50 cursor-not-allowed"
        )}
      >
        <Checkbox
          checked={isSelected}
          tabIndex={-1}
          className="pointer-events-none"
        />
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            colors.bg
          )}
        >
          {assetTypeIcons[asset.type] || <Server className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{asset.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {getAssetTypeName(asset.type)}
            </span>
            <span className="text-xs text-muted-foreground">
              Risk: {asset.riskScore}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b px-6 py-4 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <FolderPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  Manage Group Assets
                </DialogTitle>
                <DialogDescription className="text-sm">
                  &quot;{groupName}&quot; - {safeGroupAssets.length} in group, {total} total
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs defaultValue="select" className="h-full flex flex-col">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="select" className="gap-2">
                  <ListChecks className="h-4 w-4" />
                  Select Existing
                  {selectedAssetIds.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      +{selectedAssetIds.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="create" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create New
                  {newAssets.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {newAssets.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Select Existing Tab */}
            <TabsContent
              value="select"
              className="flex-1 flex flex-col mt-0 px-6 pb-4 space-y-3 min-h-0 data-[state=inactive]:hidden"
            >
              {/* Search */}
              <div className="relative pt-3 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 mt-1.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                  disabled={isBusy}
                />
              </div>

              {/* Asset list */}
              <div className="h-[340px] rounded-lg border overflow-auto">
                <div className="p-2 space-y-1">
                  {showLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Loading assets...
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* In Group Section */}
                      {filteredGroupAssets.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            In Group ({filteredGroupAssets.length})
                          </div>
                          <div className="space-y-1">
                            {filteredGroupAssets.map((asset) =>
                              renderAssetRow(asset, "in-group")
                            )}
                          </div>
                        </div>
                      )}

                      {/* Available Section */}
                      {availableAssets.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            <Plus className="h-3.5 w-3.5" />
                            Available ({availableAssets.length})
                          </div>
                          <div className="space-y-1">
                            {availableAssets.map((asset) =>
                              renderAssetRow(asset, "available")
                            )}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {filteredGroupAssets.length === 0 &&
                        availableAssets.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Package className="h-10 w-10 mb-3 opacity-50" />
                            <p className="text-sm font-medium">
                              {searchInput ? "No assets found" : "No assets available"}
                            </p>
                            <p className="text-xs mt-1">
                              {searchInput
                                ? "Try a different search term"
                                : "Create new assets using the Create New tab"}
                            </p>
                          </div>
                        )}

                      {/* Load more sentinel */}
                      <div ref={loadMoreRef} className="py-2">
                        {isLoading && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">
                              Loading more...
                            </span>
                          </div>
                        )}
                        {!hasMore && (availableAssets.length > 0 || filteredGroupAssets.length > 0) && (
                          <p className="text-center text-xs text-muted-foreground py-2">
                            All assets loaded
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Create New Tab */}
            <TabsContent
              value="create"
              className="flex-1 flex flex-col mt-0 px-6 pb-4 space-y-3 min-h-0 data-[state=inactive]:hidden"
            >
              {/* Quick add form */}
              <Card className="p-3 mt-3 shrink-0">
                <div className="flex gap-2">
                  <Select
                    value={newAssetType}
                    onValueChange={setNewAssetType}
                    disabled={isLoadingTypes || isBusy}
                  >
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue
                        placeholder={isLoadingTypes ? "Loading..." : "Select type"}
                      />
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
                    disabled={isBusy}
                    className={cn(
                      "flex-1 h-9",
                      validationResult.error &&
                        "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <Button
                    type="button"
                    onClick={addNewAsset}
                    disabled={
                      !newAssetName.trim() ||
                      !validationResult.isValid ||
                      isLoadingTypes ||
                      isBusy
                    }
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
              <div className="h-[280px] overflow-auto">
                {newAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed">
                    <Plus className="h-10 w-10 mb-3 opacity-50" />
                    <p className="text-sm font-medium">No assets added yet</p>
                    <p className="text-xs mt-1">
                      Use the form above to add assets
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {newAssets.map((asset) => {
                      const colors = ASSET_TYPE_COLORS[asset.type as AssetType] || {
                        bg: "bg-gray-500/15",
                        text: "text-gray-600",
                      };

                      return (
                        <div
                          key={asset.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card group"
                        >
                          <div
                            className={cn(
                              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                              colors.bg
                            )}
                          >
                            {assetTypeIcons[asset.type] || (
                              <Server className="h-4 w-4" />
                            )}
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
                            disabled={isBusy}
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Type summary */}
              {newAssets.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t shrink-0">
                  {Object.entries(
                    newAssets.reduce(
                      (acc, asset) => {
                        acc[asset.type] = (acc[asset.type] || 0) + 1;
                        return acc;
                      },
                      {} as Record<string, number>
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

        {/* Footer */}
        <DialogFooter className="border-t bg-muted/30 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between w-full">
            <div>
              {totalToAdd > 0 && (
                <Badge variant="secondary">
                  {totalToAdd} asset{totalToAdd !== 1 ? "s" : ""} to add
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isBusy}
              >
                {totalToAdd === 0 ? "Close" : "Cancel"}
              </Button>
              {totalToAdd > 0 && (
                <Button
                  onClick={handleSubmit}
                  disabled={isBusy}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${totalToAdd} Asset${totalToAdd !== 1 ? "s" : ""}`
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
