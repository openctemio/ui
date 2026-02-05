/**
 * Tool Schema
 *
 * Zod validation schemas for Tool Registry
 */

import { z } from 'zod';
import {
  TOOL_CATEGORIES,
  INSTALL_METHODS,
  type ToolCategory,
  type InstallMethod,
} from '@/lib/api/tool-types';

// ============================================
// CONSTANTS
// ============================================

export const CATEGORY_OPTIONS: { value: ToolCategory; label: string; description: string }[] = [
  { value: 'sast', label: 'SAST', description: 'Static Application Security Testing' },
  { value: 'sca', label: 'SCA', description: 'Software Composition Analysis' },
  { value: 'dast', label: 'DAST', description: 'Dynamic Application Security Testing' },
  { value: 'secrets', label: 'Secrets', description: 'Secret Detection' },
  { value: 'iac', label: 'IaC', description: 'Infrastructure as Code' },
  { value: 'container', label: 'Container', description: 'Container Security' },
  { value: 'recon', label: 'Recon', description: 'Reconnaissance' },
  { value: 'osint', label: 'OSINT', description: 'Open Source Intelligence' },
];

export const INSTALL_METHOD_OPTIONS: { value: InstallMethod; label: string }[] = [
  { value: 'go', label: 'Go Install' },
  { value: 'pip', label: 'Pip Install' },
  { value: 'npm', label: 'NPM Install' },
  { value: 'docker', label: 'Docker Pull' },
  { value: 'binary', label: 'Binary Download' },
];

// ============================================
// SCHEMAS
// ============================================

/**
 * Create tool form schema
 */
export const createToolSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Name must be lowercase alphanumeric with dashes'),
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  category: z.enum(TOOL_CATEGORIES, {
    message: 'Please select a category',
  }),
  install_method: z.enum(INSTALL_METHODS, {
    message: 'Please select an install method',
  }),
  install_cmd: z.string().max(500, 'Install command must be 500 characters or less').optional(),
  update_cmd: z.string().max(500, 'Update command must be 500 characters or less').optional(),
  version_cmd: z.string().max(500, 'Version command must be 500 characters or less').optional(),
  version_regex: z
    .string()
    .max(200, 'Version regex must be 200 characters or less')
    .optional(),
  docs_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  github_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  logo_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  capabilities: z.array(z.string()).optional(),
  supported_targets: z.array(z.string()).optional(),
  output_formats: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateToolFormData = z.infer<typeof createToolSchema>;

/**
 * Update tool form schema
 */
export const updateToolSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be 100 characters or less')
    .optional(),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  install_cmd: z.string().max(500, 'Install command must be 500 characters or less').optional(),
  update_cmd: z.string().max(500, 'Update command must be 500 characters or less').optional(),
  version_cmd: z.string().max(500, 'Version command must be 500 characters or less').optional(),
  version_regex: z
    .string()
    .max(200, 'Version regex must be 200 characters or less')
    .optional(),
  docs_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  github_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  logo_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  capabilities: z.array(z.string()).optional(),
  supported_targets: z.array(z.string()).optional(),
  output_formats: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateToolFormData = z.infer<typeof updateToolSchema>;

/**
 * Tenant tool config form schema
 */
export const tenantToolConfigSchema = z.object({
  is_enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type TenantToolConfigFormData = z.infer<typeof tenantToolConfigSchema>;
