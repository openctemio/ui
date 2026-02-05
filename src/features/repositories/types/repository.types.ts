/**
 * Repository Types
 *
 * Type definitions for Git repositories in CTEM platform
 * Uses unified asset architecture (asset_type='repository' + asset_repositories extension)
 *
 * Re-exports common types from asset.types.ts and adds SCM/import specific types
 */

// ============================================
// Re-export from Asset Types (unified architecture)
// ============================================
export {
  // Base types
  type Asset,
  type AssetType,
  type AssetScope,
  type ExposureLevel,
  type Criticality,
  type AssetMetadata,
  type AssetStats,
  // Repository extension
  type RepositoryExtension,
  type AssetWithRepository,
  type CreateRepositoryAssetInput,
  type UpdateRepositoryExtensionInput,
  type RepoVisibility,
  type SCMProvider,
  // Labels and colors
  SCM_PROVIDER_LABELS,
  REPO_VISIBILITY_LABELS,
  REPO_VISIBILITY_COLORS,
  ASSET_SCOPE_LABELS,
  EXPOSURE_LEVEL_LABELS,
  CRITICALITY_LABELS,
  CRITICALITY_COLORS,
} from "@/features/assets/types/asset.types";

// ============================================
// SCM Connection Types
// ============================================

/**
 * SCM Permission levels
 */
export type SCMPermission =
  | "repo:read"
  | "repo:write"
  | "webhook:manage"
  | "org:read"
  | "user:read";

/**
 * SCM Connection status
 */
export type SCMConnectionStatus = "connected" | "disconnected" | "error";

export const SCM_CONNECTION_STATUS_LABELS: Record<SCMConnectionStatus, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

export const SCM_CONNECTION_STATUS_COLORS: Record<SCMConnectionStatus, { bg: string; text: string }> = {
  connected: { bg: "bg-green-500/15", text: "text-green-600" },
  disconnected: { bg: "bg-gray-500/15", text: "text-gray-600" },
  error: { bg: "bg-red-500/15", text: "text-red-600" },
};

/**
 * SCM Connection configuration
 */
export interface SCMConnection {
  id: string;
  tenantId: string;
  name: string;
  provider: import("@/features/assets/types/asset.types").SCMProvider;
  baseUrl: string;
  apiUrl?: string;
  authType: "token" | "oauth" | "app";
  scmOrganization?: string;
  status: SCMConnectionStatus;
  lastValidatedAt?: string;
  errorMessage?: string;
  permissions: SCMPermission[];
  repositoryCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateSCMConnectionInput {
  name: string;
  provider: import("@/features/assets/types/asset.types").SCMProvider;
  baseUrl?: string;
  authType: "token" | "oauth" | "app";
  accessToken?: string;
  scmOrganization?: string;
}

// ============================================
// Repository Status Types
// ============================================

/**
 * Sync status with SCM
 */
export type SyncStatus = "synced" | "pending" | "syncing" | "error" | "disabled";

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  synced: "Synced",
  pending: "Pending",
  syncing: "Syncing",
  error: "Sync Error",
  disabled: "Sync Disabled",
};

export const SYNC_STATUS_COLORS: Record<SyncStatus, { bg: string; text: string }> = {
  synced: { bg: "bg-green-500/15", text: "text-green-600" },
  pending: { bg: "bg-yellow-500/15", text: "text-yellow-600" },
  syncing: { bg: "bg-blue-500/15", text: "text-blue-600" },
  error: { bg: "bg-red-500/15", text: "text-red-600" },
  disabled: { bg: "bg-gray-500/15", text: "text-gray-600" },
};

/**
 * Compliance status
 */
export type ComplianceStatus = "compliant" | "non_compliant" | "not_assessed" | "partial";

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: "Compliant",
  non_compliant: "Non-Compliant",
  not_assessed: "Not Assessed",
  partial: "Partial",
};

/**
 * Quality gate status
 */
export type QualityGateStatus = "passed" | "failed" | "warning" | "not_computed";

export const QUALITY_GATE_STATUS_LABELS: Record<QualityGateStatus, string> = {
  passed: "Passed",
  failed: "Failed",
  warning: "Warning",
  not_computed: "Not Computed",
};

// ============================================
// Scanner Types
// ============================================

export type ScannerType = "sast" | "sca" | "secret" | "iac" | "container" | "dast";

export const SCANNER_TYPE_LABELS: Record<ScannerType, string> = {
  sast: "SAST",
  sca: "SCA",
  secret: "Secret Detection",
  iac: "IaC Security",
  container: "Container Security",
  dast: "DAST",
};

// ============================================
// Severity Types
// ============================================

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

export const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/15", text: "text-red-600", border: "border-red-500/30" },
  high: { bg: "bg-orange-500/15", text: "text-orange-600", border: "border-orange-500/30" },
  medium: { bg: "bg-yellow-500/15", text: "text-yellow-600", border: "border-yellow-500/30" },
  low: { bg: "bg-blue-500/15", text: "text-blue-600", border: "border-blue-500/30" },
  info: { bg: "bg-gray-500/15", text: "text-gray-600", border: "border-gray-500/30" },
};

// ============================================
// Findings Summary Types
// ============================================

export type FindingStatus =
  | "open"
  | "confirmed"
  | "in_progress"
  | "resolved"
  | "false_positive"
  | "accepted_risk";

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  open: "Open",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  resolved: "Resolved",
  false_positive: "False Positive",
  accepted_risk: "Accepted Risk",
};

export interface FindingsSummary {
  total: number;
  bySeverity: Record<Severity, number>;
  byStatus: Record<FindingStatus, number>;
  byType: Record<ScannerType, number>;
  newLast7Days?: number;
  resolvedLast7Days?: number;
  trend?: "increasing" | "decreasing" | "stable";
}

export interface ComponentsSummary {
  total: number;
  direct: number;
  transitive: number;
  vulnerable: number;
  outdated: number;
  licenseRiskHigh: number;
  licenseRiskMedium: number;
  uniqueLicenses: number;
}

// ============================================
// Scan Settings Types
// ============================================

export interface ScanSettings {
  enabledScanners: ScannerType[];
  autoScan: boolean;
  schedule?: string;
  scanOnPush: boolean;
  scanOnPr: boolean;
  branchPatterns: string[];
  excludePatterns: string[];
  scanMode: "full" | "incremental";
  failOnSeverity?: Severity[];
  presetId?: string;
}

// ============================================
// Import Types
// ============================================

export type ImportMode = "all" | "selected" | "pattern";

export interface RepositoryImportConfig {
  scmConnectionId: string;
  importMode: ImportMode;
  selectedRepos?: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
  visibilityFilter?: import("@/features/assets/types/asset.types").RepoVisibility[];
  languageFilter?: string[];
  minStars?: number;
  excludeForks?: boolean;
  excludeArchived?: boolean;
  autoSync: boolean;
  syncInterval?: "hourly" | "daily" | "weekly";
  defaultScanSettings?: Partial<ScanSettings>;
  defaultPolicyId?: string;
  defaultCriticality?: import("@/features/assets/types/asset.types").Criticality;
  defaultTags?: string[];
  autoAssignTeam?: string;
  autoAssignGroup?: string;
}

export interface ImportPreview {
  totalFound: number;
  willImport: number;
  alreadyImported: number;
  excluded: number;
  repositories: ImportPreviewItem[];
}

export interface ImportPreviewItem {
  repoId: string;
  fullName: string;
  name: string;
  visibility: import("@/features/assets/types/asset.types").RepoVisibility;
  defaultBranch: string;
  language?: string;
  stars: number;
  updatedAt: string;
  status: "new" | "exists" | "excluded";
  excludeReason?: string;
}

export interface ImportJob {
  id: string;
  tenantId: string;
  scmConnectionId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  totalRepos: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: ImportError[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ImportError {
  repoName: string;
  error: string;
}

// ============================================
// Branch Types
// ============================================

export type BranchType = "main" | "develop" | "feature" | "release" | "hotfix" | "other";

export type BranchStatus = "passed" | "failed" | "warning" | "scanning" | "not_scanned";

export const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = {
  passed: "Passed",
  failed: "Failed",
  warning: "Warning",
  scanning: "Scanning",
  not_scanned: "Not Scanned",
};

export const BRANCH_STATUS_COLORS: Record<BranchStatus, { bg: string; text: string; border: string }> = {
  passed: { bg: "bg-green-500/15", text: "text-green-600", border: "border-green-500/30" },
  failed: { bg: "bg-red-500/15", text: "text-red-600", border: "border-red-500/30" },
  warning: { bg: "bg-yellow-500/15", text: "text-yellow-600", border: "border-yellow-500/30" },
  scanning: { bg: "bg-blue-500/15", text: "text-blue-600", border: "border-blue-500/30" },
  not_scanned: { bg: "bg-gray-500/15", text: "text-gray-600", border: "border-gray-500/30" },
};

export interface Branch {
  id: string;
  assetId: string;
  name: string;
  type: BranchType;
  isDefault: boolean;
  isProtected: boolean;
  scanOnPush: boolean;
  scanOnPr: boolean;
  // Commit info
  lastCommitSha?: string;
  lastCommitMessage?: string;
  lastCommitAuthor?: string;
  lastCommitAt?: string;
  // Scan info
  lastScanId?: string;
  lastScannedAt?: string;
  scanStatus: BranchStatus;
  qualityGateStatus: QualityGateStatus;
  // Stats
  findingsSummary: FindingsSummary;
  // Comparison with default
  comparedToDefault?: {
    newFindings: number;
    resolvedFindings: number;
    unchangedFindings: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BranchConfig {
  name: string;
  isProtected: boolean;
  scanOnPush: boolean;
  scanOnPr: boolean;
  keepWhenInactive: boolean;
  retentionDays?: number;
}

// ============================================
// Scan Types
// ============================================

export interface RepositoryScan {
  id: string;
  assetId: string;
  branch: string;
  commitSha?: string;
  commitMessage?: string;
  trigger: "manual" | "scheduled" | "push" | "pr" | "api";
  scanMode: "full" | "diff" | "incremental";
  scanners: ScannerType[];
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  findingsNew: number;
  findingsFixed: number;
  findingsTotal: number;
  qualityGatePassed?: boolean;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  errorMessage?: string;
}

export interface TriggerScanInput {
  branch?: string;
  scanMode?: "full" | "diff";
  scanners?: ScannerType[];
  baseBranch?: string;
}

// ============================================
// Repository Filter Types
// ============================================

export interface RepositoryFilters {
  search?: string;
  name?: string;
  // SCM filters
  scmProviders?: import("@/features/assets/types/asset.types").SCMProvider[];
  scmConnectionIds?: string[];
  scmOrganizations?: string[];
  // Visibility/status filters
  visibilities?: import("@/features/assets/types/asset.types").RepoVisibility[];
  statuses?: string[];
  syncStatuses?: SyncStatus[];
  complianceStatuses?: ComplianceStatus[];
  qualityGateStatuses?: QualityGateStatus[];
  // Classification
  criticalities?: import("@/features/assets/types/asset.types").Criticality[];
  scopes?: import("@/features/assets/types/asset.types").AssetScope[];
  exposures?: import("@/features/assets/types/asset.types").ExposureLevel[];
  // Other
  languages?: string[];
  tags?: string[];
  groupIds?: string[];
  teamIds?: string[];
  policyIds?: string[];
  // Finding filters
  hasFindings?: boolean;
  hasCriticalFindings?: boolean;
  minRiskScore?: number;
  maxRiskScore?: number;
  // Date filters
  lastScannedAfter?: string;
  lastScannedBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
  // Pagination
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

// ============================================
// Stats Types
// ============================================

export interface RepositoryStats {
  total: number;
  byProvider: Record<import("@/features/assets/types/asset.types").SCMProvider, number>;
  byStatus: Record<string, number>;
  byVisibility: Record<import("@/features/assets/types/asset.types").RepoVisibility, number>;
  byCriticality: Record<import("@/features/assets/types/asset.types").Criticality, number>;
  byCompliance: Record<ComplianceStatus, number>;
  byQualityGate: Record<QualityGateStatus, number>;
  withFindings: number;
  withCriticalFindings: number;
  avgRiskScore: number;
  totalFindings: number;
  totalComponents: number;
  vulnerableComponents: number;
  synced: number;
  syncErrors: number;
  scannedLast24h: number;
  scannedLast7d: number;
  neverScanned: number;
}

// ============================================
// API Response Types
// ============================================

export interface PaginationLinks {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
}

export interface RepositoryListResponse {
  data: import("@/features/assets/types/asset.types").AssetWithRepository[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  links?: PaginationLinks;
}

// ============================================
// SLA Types
// ============================================

export type SLAStatus = "on_track" | "warning" | "overdue" | "exceeded" | "not_applicable";

export const SLA_STATUS_LABELS: Record<SLAStatus, string> = {
  on_track: "On Track",
  warning: "Warning",
  overdue: "Overdue",
  exceeded: "SLA Exceeded",
  not_applicable: "N/A",
};

export const SLA_STATUS_COLORS: Record<SLAStatus, { bg: string; text: string }> = {
  on_track: { bg: "bg-green-500/15", text: "text-green-600" },
  warning: { bg: "bg-yellow-500/15", text: "text-yellow-600" },
  overdue: { bg: "bg-orange-500/15", text: "text-orange-600" },
  exceeded: { bg: "bg-red-500/15", text: "text-red-600" },
  not_applicable: { bg: "bg-gray-500/15", text: "text-gray-600" },
};

export interface SLAPolicy {
  id: string;
  assetId?: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  rules: SLARule[];
  escalationEnabled: boolean;
  escalationRules?: EscalationRule[];
  createdAt: string;
  updatedAt: string;
}

export interface SLARule {
  severity: Severity;
  daysToRemediate: number;
  warningThresholdPercent: number;
}

export interface EscalationRule {
  trigger: "warning" | "overdue" | "exceeded";
  notifyUsers?: string[];
  notifyChannels?: string[];
  autoAssignTo?: string;
}

export const DEFAULT_SLA_DAYS: Record<Severity, number> = {
  critical: 2,
  high: 15,
  medium: 30,
  low: 60,
  info: 90,
};
