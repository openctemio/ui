/**
 * Create Tenant Schema
 *
 * Zod validation schema for creating a new tenant/team
 */

import { z } from 'zod'

/**
 * Regex for slug validation:
 * - Only lowercase letters, numbers, and hyphens
 * - Must start with a letter
 * - Cannot end with a hyphen
 */
const slugRegex = /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/

export const createTenantSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(100, 'Team name must be at most 100 characters')
    .trim(),
  slug: z
    .string()
    .min(3, 'URL slug must be at least 3 characters')
    .max(50, 'URL slug must be at most 50 characters')
    .regex(slugRegex, 'URL slug must contain only lowercase letters, numbers, and hyphens')
    .refine((val) => !val.includes('--'), {
      message: 'URL slug cannot contain consecutive hyphens',
    }),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>

/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')         // Replace spaces with hyphens
    .replace(/-+/g, '-')          // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '')      // Trim hyphens from start/end
    .slice(0, 50)                 // Max length
}
