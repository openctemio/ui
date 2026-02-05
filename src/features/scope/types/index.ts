/**
 * Scope Feature - Shared Types
 *
 * These types are shared between Scope Config and Assets Inventory
 * to ensure consistency and enable linking between scope rules and discovered assets.
 */

/**
 * Extended target types that align with Asset types
 */
export type ScopeTargetType =
  // Network & External
  | "domain"
  | "subdomain"
  | "ip_address"
  | "ip_range"
  | "certificate"
  // Applications
  | "api"
  | "website"
  | "mobile_app"
  // Cloud
  | "cloud_account"
  | "cloud_resource"
  // Infrastructure
  | "database"
  | "container"
  | "host"
  | "network"
  // Code & CI/CD
  | "repository"
  | "project" // @deprecated - Use repository instead
  // Generic
  | "path"
  | "email_domain";

export type ScopeTargetStatus = "active" | "inactive";

export type ScanType =
  | "vulnerability"
  | "port_scan"
  | "pentest"
  | "credential"
  | "secret_scan"
  | "compliance"
  | "configuration";

export type ScanFrequency =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "continuous"
  | "on_commit"
  | "on_demand";

/**
 * Scope Target - defines what should be scanned
 */
export interface ScopeTarget {
  id: string;
  type: ScopeTargetType;
  pattern: string;
  description: string;
  status: ScopeTargetStatus;
  priority?: "critical" | "high" | "medium" | "low";
  tags?: string[];
  addedAt: string;
  addedBy: string;
  updatedAt?: string;
  // Link to source (e.g., imported from cloud account)
  sourceType?: "manual" | "imported" | "discovered";
  sourceId?: string;
}

/**
 * Scope Exclusion - defines what should be excluded from scanning
 */
export interface ScopeExclusion {
  id: string;
  type: ScopeTargetType;
  pattern: string;
  reason: string;
  status: ScopeTargetStatus;
  expiresAt?: string; // Temporary exclusions
  approvedBy?: string;
  addedAt: string;
  addedBy: string;
}

/**
 * Scan Schedule - defines when and how to scan
 */
export interface ScanSchedule {
  id: string;
  name: string;
  type: ScanType;
  targetPatterns: string[]; // References to ScopeTarget patterns
  frequency: ScanFrequency;
  schedule?: {
    time?: string; // "02:00"
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
  };
  lastRun: string | null;
  nextRun: string | null;
  status: "active" | "paused" | "error";
  notifications?: {
    onComplete?: boolean;
    onFinding?: boolean;
    channels?: string[];
  };
}

/**
 * Scope Match Result - links an asset to its matching scope rules
 */
export interface ScopeMatchResult {
  assetId: string;
  assetName: string;
  assetType: string;
  matchedTargets: {
    targetId: string;
    pattern: string;
    matchType: "exact" | "wildcard" | "cidr" | "regex";
  }[];
  matchedExclusions: {
    exclusionId: string;
    pattern: string;
    reason: string;
  }[];
  inScope: boolean; // true if matched by target and not excluded
}

/**
 * Scope Coverage Stats
 */
export interface ScopeCoverage {
  totalAssets: number;
  inScopeAssets: number;
  excludedAssets: number;
  uncoveredAssets: number;
  coveragePercent: number;
  byType: Record<string, {
    total: number;
    inScope: number;
    excluded: number;
  }>;
}

/**
 * Type configuration for UI display
 */
export interface ScopeTypeConfig {
  type: ScopeTargetType;
  label: string;
  icon: string;
  placeholder: string;
  helpText: string;
  validation: {
    pattern: RegExp;
    message: string;
  };
  supportsWildcard: boolean;
  supportsCIDR: boolean;
}

/**
 * Mapping of scope target types to asset types
 */
export const SCOPE_TO_ASSET_TYPE_MAP: Record<ScopeTargetType, string[]> = {
  domain: ["domain"],
  subdomain: ["domain"],
  ip_address: ["ip_address", "host"],
  ip_range: ["ip_address", "host"],
  certificate: ["certificate"],
  api: ["api", "api_endpoint"],
  website: ["website"],
  mobile_app: ["mobile_app"],
  cloud_account: ["cloud_account"],
  cloud_resource: ["compute", "storage", "serverless", "database"],
  database: ["database"],
  container: ["container", "container_image"],
  host: ["host"],
  network: ["network"],
  repository: ["repository"],
  project: ["repository", "project"], // @deprecated - maps to repository
  path: ["api_endpoint"],
  email_domain: ["domain"],
};

/**
 * Scope type configurations for validation and UI
 */
export const SCOPE_TYPE_CONFIGS: ScopeTypeConfig[] = [
  {
    type: "domain",
    label: "Domain",
    icon: "Globe",
    placeholder: "*.example.com or api.example.com",
    helpText: "Supports wildcards (*.domain.com)",
    validation: {
      pattern: /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      message: "Invalid domain format",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "subdomain",
    label: "Subdomain",
    icon: "Globe",
    placeholder: "api.example.com",
    helpText: "Specific subdomain",
    validation: {
      pattern: /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      message: "Invalid subdomain format",
    },
    supportsWildcard: false,
    supportsCIDR: false,
  },
  {
    type: "ip_address",
    label: "IP Address",
    icon: "Server",
    placeholder: "192.168.1.1",
    helpText: "Single IP address",
    validation: {
      pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
      message: "Invalid IP address format",
    },
    supportsWildcard: false,
    supportsCIDR: false,
  },
  {
    type: "ip_range",
    label: "IP Range",
    icon: "Server",
    placeholder: "10.0.0.0/8",
    helpText: "CIDR notation (e.g., 10.0.0.0/8)",
    validation: {
      pattern: /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/,
      message: "Invalid CIDR format",
    },
    supportsWildcard: false,
    supportsCIDR: true,
  },
  {
    type: "certificate",
    label: "Certificate",
    icon: "Shield",
    placeholder: "*.example.com",
    helpText: "SSL/TLS certificate domain",
    validation: {
      pattern: /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      message: "Invalid certificate domain",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "api",
    label: "API",
    icon: "Code",
    placeholder: "api.example.com/v1/*",
    helpText: "API endpoint pattern",
    validation: {
      pattern: /^.+$/,
      message: "API pattern required",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "website",
    label: "Website",
    icon: "Globe",
    placeholder: "https://example.com",
    helpText: "Website URL",
    validation: {
      pattern: /^https?:\/\/.+$/,
      message: "Invalid URL format",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "cloud_account",
    label: "Cloud Account",
    icon: "Cloud",
    placeholder: "AWS:123456789012",
    helpText: "Format: PROVIDER:account-id",
    validation: {
      pattern: /^(AWS|Azure|GCP|Alibaba|Oracle):[\w-]+$/,
      message: "Invalid cloud account format",
    },
    supportsWildcard: false,
    supportsCIDR: false,
  },
  {
    type: "cloud_resource",
    label: "Cloud Resource",
    icon: "Cloud",
    placeholder: "arn:aws:ec2:*",
    helpText: "Cloud resource ARN or ID pattern",
    validation: {
      pattern: /^.+$/,
      message: "Resource pattern required",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "database",
    label: "Database",
    icon: "Database",
    placeholder: "db.example.com:5432",
    helpText: "Database host:port",
    validation: {
      pattern: /^.+:\d+$/,
      message: "Format: host:port",
    },
    supportsWildcard: false,
    supportsCIDR: false,
  },
  {
    type: "container",
    label: "Container",
    icon: "Box",
    placeholder: "registry/image:tag",
    helpText: "Container image pattern",
    validation: {
      pattern: /^.+$/,
      message: "Container pattern required",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "host",
    label: "Host",
    icon: "Server",
    placeholder: "hostname or IP",
    helpText: "Server hostname or IP",
    validation: {
      pattern: /^.+$/,
      message: "Host pattern required",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "repository",
    label: "Repository",
    icon: "GitBranch",
    placeholder: "github.com/org/repo",
    helpText: "Git repository - supports github.com, gitlab.com, bitbucket.com",
    validation: {
      pattern: /^(github|gitlab|bitbucket)\.com\/[\w-]+\/(\*|[\w-]+)$/,
      message: "Invalid repository format",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "project",
    label: "Project (deprecated)",
    icon: "GitBranch",
    placeholder: "github.com/org/repo",
    helpText: "Deprecated - use Repository instead",
    validation: {
      pattern: /^(github|gitlab|bitbucket)\.com\/[\w-]+\/(\*|[\w-]+)$/,
      message: "Invalid project format",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "path",
    label: "Path",
    icon: "Folder",
    placeholder: "/api/v1/*",
    helpText: "URL path pattern",
    validation: {
      pattern: /^\/.*/,
      message: "Path must start with /",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
  {
    type: "email_domain",
    label: "Email Domain",
    icon: "Mail",
    placeholder: "*@example.com",
    helpText: "Email domain for credential monitoring",
    validation: {
      pattern: /^\*?@.+\..+$/,
      message: "Format: *@domain.com",
    },
    supportsWildcard: true,
    supportsCIDR: false,
  },
];

/**
 * Get type config by type
 */
export const getScopeTypeConfig = (type: ScopeTargetType): ScopeTypeConfig | undefined => {
  return SCOPE_TYPE_CONFIGS.find((config) => config.type === type);
};
