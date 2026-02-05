"use client";

/**
 * Relationship Table Component
 *
 * Displays a table of asset relationships with filtering and sorting
 */

import * as React from "react";
import {
  ArrowUpDown,
  ArrowRight,
  ArrowLeft,
  Filter,
  Search,
  Link2,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  AssetRelationship,
  RelationshipType,
  RelationshipDirection,
  ExtendedAssetType,
} from "../../types";
import {
  RELATIONSHIP_LABELS,
  EXTENDED_ASSET_TYPE_LABELS,
} from "../../types";

// ============================================
// Types
// ============================================

type SortField = "type" | "target" | "source" | "confidence" | "impactWeight" | "updatedAt";
type SortDirection = "asc" | "desc";

interface RelationshipTableProps {
  relationships: AssetRelationship[];
  /** Current asset ID to determine direction */
  currentAssetId?: string;
  onEdit?: (relationship: AssetRelationship) => void;
  onDelete?: (relationship: AssetRelationship) => void;
  onViewAsset?: (assetId: string) => void;
  onAddNew?: () => void;
  className?: string;
}

// ============================================
// Helper Components
// ============================================

const CONFIDENCE_COLORS = {
  high: "bg-green-500/20 text-green-600 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  low: "bg-red-500/20 text-red-600 border-red-500/30",
};

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

function ImpactBars({ weight }: { weight: number }) {
  const getColor = () => {
    if (weight >= 8) return "bg-red-500";
    if (weight >= 5) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-3 w-1.5 rounded-sm",
                  i < Math.ceil(weight / 2) ? getColor() : "bg-muted"
                )}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Impact: {weight}/10</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function AssetCell({
  name,
  type,
  onClick,
}: {
  name: string;
  type: ExtendedAssetType;
  onClick?: () => void;
}) {
  const colors = ASSET_TYPE_COLORS[type] || { bg: "bg-gray-500/20", text: "text-gray-500" };
  const typeLabel = EXTENDED_ASSET_TYPE_LABELS[type] || type;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 hover:underline text-left"
    >
      <div className={cn("h-7 w-7 rounded flex items-center justify-center shrink-0", colors.bg)}>
        <Link2 className={cn("h-3.5 w-3.5", colors.text)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate max-w-[150px]">{name}</p>
        <p className="text-xs text-muted-foreground">{typeLabel}</p>
      </div>
    </button>
  );
}

// Sort Button Component (moved outside to avoid React Compiler error)
function SortButton({
  field,
  children,
  onSort,
  currentField,
}: {
  field: SortField;
  children: React.ReactNode;
  onSort: (field: SortField) => void;
  currentField?: SortField;
}) {
  const isActive = currentField === field;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`-ml-3 h-8 data-[state=open]:bg-accent ${isActive ? "text-primary" : ""}`}
      onClick={() => onSort(field)}
    >
      {children}
      <ArrowUpDown className={`ml-2 h-4 w-4 ${isActive ? "text-primary" : ""}`} />
    </Button>
  );
}

// Helper function to determine direction
function getRelationshipDirection(
  rel: AssetRelationship,
  currentAssetId?: string
): RelationshipDirection {
  if (!currentAssetId) return "outgoing";
  return rel.sourceAssetId === currentAssetId ? "outgoing" : "incoming";
}

// ============================================
// Relationship Table Component
// ============================================

export function RelationshipTable({
  relationships,
  currentAssetId,
  onEdit,
  onDelete,
  onViewAsset,
  onAddNew,
  className,
}: RelationshipTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<RelationshipType | "all">("all");
  const [directionFilter, setDirectionFilter] = React.useState<RelationshipDirection | "all">("all");
  const [sortField, setSortField] = React.useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");

  // Get unique relationship types
  const relationshipTypes = React.useMemo(() => {
    const types = new Set(relationships.map((r) => r.type));
    return Array.from(types);
  }, [relationships]);

  // Filter and sort relationships
  const filteredRelationships = React.useMemo(() => {
    let result = [...relationships];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.sourceAssetName.toLowerCase().includes(query) ||
          r.targetAssetName.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.type.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((r) => r.type === typeFilter);
    }

    // Direction filter
    if (directionFilter !== "all" && currentAssetId) {
      result = result.filter(
        (r) => getRelationshipDirection(r, currentAssetId) === directionFilter
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "source":
          comparison = a.sourceAssetName.localeCompare(b.sourceAssetName);
          break;
        case "target":
          comparison = a.targetAssetName.localeCompare(b.targetAssetName);
          break;
        case "confidence": {
          const confOrder = { high: 3, medium: 2, low: 1 };
          comparison = confOrder[a.confidence] - confOrder[b.confidence];
          break;
        }
        case "impactWeight":
          comparison = a.impactWeight - b.impactWeight;
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [relationships, searchQuery, typeFilter, directionFilter, sortField, sortDirection, currentAssetId]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search relationships..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as RelationshipType | "all")}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {relationshipTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {RELATIONSHIP_LABELS[type]?.direct || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentAssetId && (
            <Select
              value={directionFilter}
              onValueChange={(v) => setDirectionFilter(v as RelationshipDirection | "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
              </SelectContent>
            </Select>
          )}

          {onAddNew && (
            <Button onClick={onAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {currentAssetId && (
                <TableHead className="w-[60px]">Dir</TableHead>
              )}
              <TableHead>
                <SortButton field="type" currentField={sortField} onSort={handleSort}>Type</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="source" currentField={sortField} onSort={handleSort}>Source</SortButton>
              </TableHead>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>
                <SortButton field="target" currentField={sortField} onSort={handleSort}>Target</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="confidence" currentField={sortField} onSort={handleSort}>Confidence</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="impactWeight" currentField={sortField} onSort={handleSort}>Impact</SortButton>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRelationships.length === 0 ? (
              <TableRow>
                <TableCell colSpan={currentAssetId ? 8 : 7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Link2 className="h-8 w-8" />
                    <p>No relationships found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredRelationships.map((relationship) => {
                const direction = getRelationshipDirection(relationship, currentAssetId);
                const labels = RELATIONSHIP_LABELS[relationship.type];

                return (
                  <TableRow key={relationship.id}>
                    {currentAssetId && (
                      <TableCell>
                        {direction === "outgoing" ? (
                          <ArrowRight className="h-4 w-4 text-blue-500" />
                        ) : (
                          <ArrowLeft className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {direction === "outgoing" ? labels.direct : labels.inverse}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AssetCell
                        name={relationship.sourceAssetName}
                        type={relationship.sourceAssetType}
                        onClick={() => onViewAsset?.(relationship.sourceAssetId)}
                      />
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <AssetCell
                        name={relationship.targetAssetName}
                        type={relationship.targetAssetType}
                        onClick={() => onViewAsset?.(relationship.targetAssetId)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", CONFIDENCE_COLORS[relationship.confidence])}
                      >
                        {relationship.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ImpactBars weight={relationship.impactWeight} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit?.(relationship)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onViewAsset?.(relationship.sourceAssetId)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Source
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onViewAsset?.(relationship.targetAssetId)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Target
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete?.(relationship)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredRelationships.length} of {relationships.length} relationships
        </span>
        {currentAssetId && (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
              {relationships.filter((r) => r.sourceAssetId === currentAssetId).length} outgoing
            </span>
            <span className="flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5 text-green-500" />
              {relationships.filter((r) => r.targetAssetId === currentAssetId).length} incoming
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
