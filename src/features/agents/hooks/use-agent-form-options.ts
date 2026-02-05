"use client";

import { useMemo } from "react";
import { useTools } from "@/lib/api/tool-hooks";
import { useAllToolCategories, getCategoryNameById } from "@/lib/api/tool-category-hooks";
import { useAllCapabilities } from "@/lib/api/capability-hooks";
import type { Tool } from "@/lib/api/tool-types";
import type { ToolListFilters } from "@/lib/api/tool-types";
import type { Capability } from "@/lib/api/capability-types";

// Static filter to prevent new object reference on every render
const ACTIVE_TOOLS_FILTER: ToolListFilters = { is_active: true, per_page: 100 };

// ============================================
// TYPES
// ============================================

export interface FormOption {
  value: string;
  label: string;
  description?: string;
}

export interface ToolOption extends FormOption {
  category: string;
  capabilities: string[];
  logoUrl?: string;
}

export interface CapabilityOption extends FormOption {
  toolCount: number;
}

export interface UseAgentFormOptionsReturn {
  /** Tool options derived from active tools in database */
  toolOptions: ToolOption[];
  /** Capability options derived from tools' capabilities */
  capabilityOptions: CapabilityOption[];
  /** Raw tools data from API */
  tools: Tool[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Get tools that have specific capabilities */
  getToolsByCapabilities: (capabilities: string[]) => ToolOption[];
  /** Get capabilities for specific tools */
  getCapabilitiesForTools: (toolNames: string[]) => string[];
}

// ============================================
// HELPERS
// ============================================

/**
 * Build a lookup map from capability name to Capability object.
 * This is used to get display_name and description from the capabilities registry.
 */
function buildCapabilityLookup(capabilities: Capability[] | undefined): Map<string, Capability> {
  const lookup = new Map<string, Capability>();
  if (!capabilities) return lookup;
  for (const cap of capabilities) {
    lookup.set(cap.name, cap);
  }
  return lookup;
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to get dynamic tool and capability options for agent forms.
 *
 * Features:
 * - Fetches active tools from database
 * - Derives unique capabilities from tools
 * - Provides helper functions for filtering
 * - Handles loading and error states
 *
 * @example
 * ```tsx
 * const { toolOptions, capabilityOptions, isLoading } = useAgentFormOptions();
 *
 * // Filter tools by selected capabilities
 * const filteredTools = getToolsByCapabilities(selectedCapabilities);
 * ```
 */
// Static SWR config to prevent new object reference on every render
const SWR_CONFIG = {
  revalidateOnFocus: false,
  dedupingInterval: 30000, // Cache for 30 seconds
};

export function useAgentFormOptions(): UseAgentFormOptionsReturn {
  // Fetch only active tools - use static filter and config objects
  const { data, isLoading, error } = useTools(ACTIVE_TOOLS_FILTER, SWR_CONFIG);

  // Fetch tool categories
  const { data: categoriesData } = useAllToolCategories();

  // Fetch capabilities from registry (platform + tenant custom)
  const { data: capabilitiesData } = useAllCapabilities(SWR_CONFIG);

  // Build capability lookup map for efficient access
  const capabilityLookup = useMemo(
    () => buildCapabilityLookup(capabilitiesData?.items),
    [capabilitiesData?.items]
  );

  // Memoize tools to prevent unnecessary re-renders
  const tools = useMemo(() => data?.items ?? [], [data?.items]);

  // Derive tool options from API data
  const toolOptions = useMemo<ToolOption[]>(() => {
    return tools.map((tool) => {
      const categoryName = getCategoryNameById(categoriesData?.items, tool.category_id);
      return {
        value: tool.name,
        label: tool.display_name,
        description: tool.description || `${categoryName.toUpperCase()} tool`,
        category: categoryName,
        capabilities: tool.capabilities || [],
        logoUrl: tool.logo_url,
      };
    });
  }, [tools, categoriesData]);

  // Derive unique capabilities from all tools, using registry metadata
  const capabilityOptions = useMemo<CapabilityOption[]>(() => {
    // Count tools per capability
    const capabilityCount = new Map<string, number>();

    for (const tool of tools) {
      for (const cap of tool.capabilities || []) {
        capabilityCount.set(cap, (capabilityCount.get(cap) || 0) + 1);
      }
    }

    // Convert to options array using capability registry for metadata
    const options: CapabilityOption[] = [];

    for (const [capabilityName, count] of capabilityCount) {
      // Look up capability in registry for display_name and description
      const registryCapability = capabilityLookup.get(capabilityName);

      const label = registryCapability?.display_name || capabilityName.toUpperCase();
      const description = registryCapability?.description || `${capabilityName} capability`;

      options.push({
        value: capabilityName,
        label,
        description,
        toolCount: count,
      });
    }

    // Sort by tool count (most popular first), then alphabetically
    return options.sort((a, b) => {
      if (b.toolCount !== a.toolCount) {
        return b.toolCount - a.toolCount;
      }
      return a.label.localeCompare(b.label);
    });
  }, [tools, capabilityLookup]);

  // Helper: Get tools that have ANY of the specified capabilities
  const getToolsByCapabilities = useMemo(() => {
    return (capabilities: string[]): ToolOption[] => {
      if (!capabilities.length) return toolOptions;

      return toolOptions.filter((tool) =>
        capabilities.some((cap) => tool.capabilities.includes(cap))
      );
    };
  }, [toolOptions]);

  // Helper: Get all capabilities for the specified tools
  const getCapabilitiesForTools = useMemo(() => {
    return (toolNames: string[]): string[] => {
      const capabilities = new Set<string>();

      for (const toolName of toolNames) {
        const tool = toolOptions.find((t) => t.value === toolName);
        if (tool) {
          for (const cap of tool.capabilities) {
            capabilities.add(cap);
          }
        }
      }

      return Array.from(capabilities);
    };
  }, [toolOptions]);

  return {
    toolOptions,
    capabilityOptions,
    tools,
    isLoading,
    error: error || null,
    getToolsByCapabilities,
    getCapabilitiesForTools,
  };
}
