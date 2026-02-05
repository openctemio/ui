"use client";

import { useState, useMemo, memo } from "react";
import { Search, AlertCircle, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ToolOption {
  value: string;
  label: string;
  description?: string;
  category: string;
}

interface ToolSelectionProps {
  tools: ToolOption[];
  selectedTools: string[];
  onSelectionChange: (tools: string[]) => void;
  isLoading?: boolean;
  error?: Error | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  recon: "Reconnaissance",
  sast: "Static Analysis (SAST)",
  dast: "Dynamic Analysis (DAST)",
  sca: "Software Composition",
  secrets: "Secret Detection",
  container: "Container Security",
  iac: "Infrastructure as Code",
  other: "Other Tools",
};

// Memoized tool card to prevent unnecessary re-renders
const ToolCard = memo(function ToolCard({
  tool,
  isSelected,
  onToggle,
}: {
  tool: ToolOption;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-all",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      )}
    >
      <Checkbox
        checked={isSelected}
        className="mt-0.5 pointer-events-none"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{tool.label}</div>
        {tool.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {tool.description}
          </p>
        )}
      </div>
    </div>
  );
});

// Memoized category section
const CategorySection = memo(function CategorySection({
  category,
  tools,
  selectedTools,
  onToggle,
}: {
  category: string;
  tools: ToolOption[];
  selectedTools: string[];
  onToggle: (toolName: string) => void;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {CATEGORY_LABELS[category] || category}
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <ToolCard
            key={tool.value}
            tool={tool}
            isSelected={selectedTools.includes(tool.value)}
            onToggle={() => onToggle(tool.value)}
          />
        ))}
      </div>
    </div>
  );
});

export const ToolSelection = memo(function ToolSelection({
  tools,
  selectedTools,
  onSelectionChange,
  isLoading = false,
  error = null,
}: ToolSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Group tools by category - only recalculate when tools change
  const toolsByCategory = useMemo(() => {
    const grouped: Record<string, ToolOption[]> = {};
    tools.forEach((tool) => {
      const category = tool.category || "other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(tool);
    });
    return grouped;
  }, [tools]);

  // Filter by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return toolsByCategory;

    const search = searchQuery.toLowerCase();
    const filtered: Record<string, ToolOption[]> = {};

    Object.entries(toolsByCategory).forEach(([category, categoryTools]) => {
      const matchingTools = categoryTools.filter(
        (tool) =>
          tool.label.toLowerCase().includes(search) ||
          tool.description?.toLowerCase().includes(search) ||
          tool.category.toLowerCase().includes(search)
      );
      if (matchingTools.length > 0) {
        filtered[category] = matchingTools;
      }
    });

    return filtered;
  }, [toolsByCategory, searchQuery]);

  // Toggle tool selection
  const handleToggle = (toolName: string) => {
    const isSelected = selectedTools.includes(toolName);
    const newSelection = isSelected
      ? selectedTools.filter((t) => t !== toolName)
      : [...selectedTools, toolName];
    onSelectionChange(newSelection);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive p-3 border border-destructive/30 rounded-md">
        <AlertCircle className="h-4 w-4" />
        Failed to load tools. Please try again.
      </div>
    );
  }

  const categoryEntries = Object.entries(filteredCategories);

  return (
    <div className="space-y-4 flex flex-col h-full">
      {/* Selected count */}
      {selectedTools.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 flex-shrink-0">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="text-sm">
            <strong>{selectedTools.length}</strong> tool{selectedTools.length !== 1 ? "s" : ""} selected
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tools list */}
      {categoryEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? (
            <>No tools found matching &ldquo;{searchQuery}&rdquo;</>
          ) : (
            <>No tools available</>
          )}
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-2 max-h-[calc(85vh-320px)]">
          {categoryEntries.map(([category, categoryTools]) => (
            <CategorySection
              key={category}
              category={category}
              tools={categoryTools}
              selectedTools={selectedTools}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export type { ToolOption };
