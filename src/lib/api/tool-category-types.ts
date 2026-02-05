/**
 * Tool Category API Types
 *
 * TypeScript types for Tool Category Management
 * Supports both platform (builtin) and tenant custom categories
 */

/**
 * Tool Category entity
 */
export interface ToolCategory {
  id: string;
  tenant_id?: string; // null for platform categories, UUID for custom categories
  name: string;
  display_name: string;
  description?: string;
  icon: string;
  color: string;
  is_builtin: boolean;
  sort_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create tool category request (for tenant custom categories)
 */
export interface CreateToolCategoryRequest {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
}

/**
 * Update tool category request
 */
export interface UpdateToolCategoryRequest {
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
}

/**
 * Tool category list response
 */
export interface ToolCategoryListResponse {
  items: ToolCategory[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Tool category list filters
 */
export interface ToolCategoryListFilters {
  is_builtin?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Tool category all list response (for dropdowns, no pagination)
 */
export interface ToolCategoryAllResponse {
  items: ToolCategory[];
}

// Default icons for categories
export const CATEGORY_ICONS: Record<string, string> = {
  sast: 'code',
  sca: 'package',
  dast: 'globe',
  secrets: 'key',
  iac: 'server',
  container: 'box',
  recon: 'search',
  osint: 'eye',
};

// Default colors for categories
export const CATEGORY_COLORS: Record<string, string> = {
  sast: 'blue',
  sca: 'purple',
  dast: 'orange',
  secrets: 'red',
  iac: 'green',
  container: 'cyan',
  recon: 'yellow',
  osint: 'pink',
};
