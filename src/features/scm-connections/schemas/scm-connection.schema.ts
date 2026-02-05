import { z } from "zod";

export const scmProviderSchema = z.enum([
  "github",
  "gitlab",
  "bitbucket",
  "azure_devops",
  "codecommit",
  "local",
]);

export const authTypeSchema = z.enum(["token", "oauth", "app"]);

export const createSCMConnectionSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  provider: scmProviderSchema,
  authType: authTypeSchema,
  baseUrl: z
    .string()
    .optional()
    .refine(
      (val) => !val || val === "" || z.string().url().safeParse(val).success,
      { message: "Must be a valid URL" }
    ),
  accessToken: z
    .string()
    .min(1, "Access token is required")
    .max(500, "Token is too long"),
  scmOrganization: z
    .string()
    .max(100, "Organization name must be less than 100 characters")
    .optional(),
});

export type CreateSCMConnectionFormData = z.infer<typeof createSCMConnectionSchema>;

export const SCM_PROVIDER_OPTIONS = [
  { value: "github", label: "GitHub", description: "Connect to GitHub.com or GitHub Enterprise" },
  { value: "gitlab", label: "GitLab", description: "Connect to GitLab.com or self-hosted GitLab" },
  { value: "bitbucket", label: "Bitbucket", description: "Connect to Bitbucket Cloud or Server" },
  { value: "azure_devops", label: "Azure DevOps", description: "Connect to Azure DevOps Services" },
] as const;

export const AUTH_TYPE_OPTIONS = [
  { value: "token", label: "Personal Access Token", description: "Use a PAT for authentication" },
  { value: "oauth", label: "OAuth", description: "Use OAuth for authentication (coming soon)" },
  { value: "app", label: "GitHub App", description: "Use a GitHub App for authentication (coming soon)" },
] as const;

export const DEFAULT_BASE_URLS: Record<string, string> = {
  github: "https://github.com",
  gitlab: "https://gitlab.com",
  bitbucket: "https://bitbucket.org",
  azure_devops: "https://dev.azure.com",
  codecommit: "",
  local: "",
};
