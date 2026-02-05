import { z } from "zod";

export const criticalitySchema = z.enum(["critical", "high", "medium", "low"]);
export const assetScopeSchema = z.enum(["internal", "external", "partner"]);
export const exposureLevelSchema = z.enum(["public", "restricted", "private", "isolated", "unknown"]);

export const createRepositorySchema = z.object({
  // Required fields
  url: z
    .string()
    .min(1, "URL is required")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          // Accept common git hosting patterns
          return (
            parsed.pathname.split("/").filter(Boolean).length >= 2 ||
            url.endsWith(".git")
          );
        } catch {
          return false;
        }
      },
      { message: "Must be a valid repository URL (e.g., https://github.com/owner/repo)" }
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters"),
  // Classification
  criticality: criticalitySchema,
  scope: assetScopeSchema,
  exposure: exposureLevelSchema.optional(),
  // Optional fields
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  // Scan settings
  scanEnabled: z.boolean(),
  syncMetadata: z.boolean(),
  // SCM connection (optional - for import)
  scmConnectionId: z.string().optional(),
});

export type CreateRepositoryFormData = z.infer<typeof createRepositorySchema>;

export const CRITICALITY_OPTIONS = [
  { value: "critical", label: "Critical", description: "Business-critical, requires immediate attention" },
  { value: "high", label: "High", description: "Important, requires priority handling" },
  { value: "medium", label: "Medium", description: "Standard priority" },
  { value: "low", label: "Low", description: "Lower priority" },
] as const;

export const SCOPE_OPTIONS = [
  { value: "internal", label: "Internal", description: "Used internally by the organization" },
  { value: "external", label: "External", description: "Customer or public facing" },
  { value: "partner", label: "Partner", description: "Shared with partners or third parties" },
] as const;

/**
 * Extract repository name from URL
 */
export function extractRepoNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    // Remove .git suffix if present
    const repoName = pathParts[pathParts.length - 1]?.replace(/\.git$/, "");
    return repoName || "";
  } catch {
    return "";
  }
}

/**
 * Extract full name (owner/repo) from URL
 */
export function extractFullNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1]?.replace(/\.git$/, "");
      return `${owner}/${repo}`;
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Detect SCM provider from URL
 */
export function detectProviderFromUrl(url: string): "github" | "gitlab" | "bitbucket" | "azure_devops" | "local" {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("github")) return "github";
    if (host.includes("gitlab")) return "gitlab";
    if (host.includes("bitbucket")) return "bitbucket";
    if (host.includes("dev.azure") || host.includes("visualstudio")) return "azure_devops";

    return "local";
  } catch {
    return "local";
  }
}
