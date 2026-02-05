/**
 * Mock data for repositories feature (development/demo purposes)
 */

import type { AssetWithRepository, SCMProvider, Criticality, RepoVisibility } from "../types/repository.types";
import type { SCMConnection, SyncStatus, ComplianceStatus, QualityGateStatus, Severity, ScannerType, FindingStatus } from "../types/repository.types";

// UI expects snake_case field names for findings summary
interface FindingsSummaryUI {
  total: number;
  by_severity: Record<Severity, number>;
  by_status: Record<FindingStatus, number>;
  by_type: Record<ScannerType, number>;
  trend?: "increasing" | "decreasing" | "stable";
}

/**
 * Extended repository type for UI compatibility
 * Adds legacy project fields that the UI still expects (snake_case naming)
 */
export interface RepositoryView extends AssetWithRepository {
  // Legacy project fields for UI compatibility
  scm_provider: SCMProvider;
  scm_organization?: string;
  default_branch: string;
  visibility: RepoVisibility;
  primary_language?: string;
  risk_score: number; // snake_case alias for riskScore
  sync_status: SyncStatus;
  compliance_status: ComplianceStatus;
  quality_gate_status: QualityGateStatus;
  findings_summary: FindingsSummaryUI;
  components_summary?: {
    total: number;
    vulnerable: number;
  };
  scan_settings: {
    enabled_scanners: ScannerType[];
    auto_scan: boolean;
    scan_on_push: boolean;
    scan_on_pr?: boolean;
    branch_patterns?: string[];
  };
  security_features?: Record<string, boolean>;
  last_scanned_at?: string;
}

// ============================================
// Mock SCM Connections
// ============================================

export const mockSCMConnections: SCMConnection[] = [
  {
    id: "scm-1",
    tenantId: "tenant-1",
    name: "GitHub Enterprise",
    provider: "github",
    baseUrl: "https://github.com",
    authType: "oauth",
    scmOrganization: "vnsecurity",
    status: "connected",
    permissions: ["repo:read", "repo:write", "webhook:manage"],
    repositoryCount: 25,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    createdBy: "user-1",
  },
  {
    id: "scm-2",
    tenantId: "tenant-1",
    name: "GitLab Self-hosted",
    provider: "gitlab",
    baseUrl: "https://gitlab.vnsecurity.net",
    authType: "token",
    scmOrganization: "security-team",
    status: "connected",
    permissions: ["repo:read", "repo:write"],
    repositoryCount: 12,
    createdAt: "2024-01-05T00:00:00Z",
    updatedAt: "2024-01-14T14:00:00Z",
    createdBy: "user-1",
  },
];

// ============================================
// Mock Repository Assets
// ============================================

const createFindingsSummary = (total: number, critical: number, high: number, medium: number): FindingsSummaryUI => ({
  total,
  by_severity: {
    critical,
    high,
    medium,
    low: Math.max(0, total - critical - high - medium),
    info: 0,
  },
  by_status: {
    open: Math.floor(total * 0.6),
    confirmed: Math.floor(total * 0.1),
    in_progress: Math.floor(total * 0.1),
    resolved: Math.floor(total * 0.15),
    false_positive: Math.floor(total * 0.03),
    accepted_risk: Math.floor(total * 0.02),
  },
  by_type: {
    sast: Math.floor(total * 0.3),
    sca: Math.floor(total * 0.4),
    secret: Math.floor(total * 0.1),
    iac: Math.floor(total * 0.1),
    container: Math.floor(total * 0.05),
    dast: Math.floor(total * 0.05),
  },
  trend: total > 5 ? "increasing" : "stable",
});

export const mockRepositories: RepositoryView[] = [
  {
    id: "asset-repo-1",
    type: "repository",
    name: "api-gateway",
    description: "Main API Gateway service",
    criticality: "critical",
    status: "active",
    scope: "internal",
    exposure: "public",
    riskScore: 75,
    findingCount: 12,
    tags: ["api", "gateway", "production"],
    firstSeen: "2024-01-01T00:00:00Z",
    lastSeen: "2024-01-15T10:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    metadata: {},
    // Legacy fields for UI compatibility
    scm_provider: "github",
    scm_organization: "vnsecurity",
    default_branch: "main",
    visibility: "private",
    primary_language: "Go",
    risk_score: 75,
    sync_status: "synced",
    compliance_status: "non_compliant",
    quality_gate_status: "failed",
    findings_summary: createFindingsSummary(12, 2, 4, 4),
    components_summary: { total: 156, vulnerable: 5 },
    scan_settings: {
      enabled_scanners: ["sast", "sca", "secret"],
      auto_scan: true,
      scan_on_push: true,
    },
    last_scanned_at: "2024-01-15T06:00:00Z",
    repository: {
      assetId: "asset-repo-1",
      repoId: "123456",
      fullName: "vnsecurity/api-gateway",
      scmOrganization: "vnsecurity",
      cloneUrl: "https://github.com/vnsecurity/api-gateway.git",
      webUrl: "https://github.com/vnsecurity/api-gateway",
      defaultBranch: "main",
      visibility: "private",
      language: "Go",
      languages: { Go: 75000, TypeScript: 15000 },
      topics: ["api", "microservices"],
      stars: 45,
      forks: 12,
      watchers: 30,
      openIssues: 8,
      contributorsCount: 15,
      sizeKb: 25000,
      branchCount: 12,
      protectedBranchCount: 2,
      componentCount: 156,
      vulnerableComponentCount: 5,
      findingCount: 12,
      scanEnabled: true,
      scanSchedule: "0 0 * * *",
      lastScannedAt: "2024-01-15T06:00:00Z",
    },
  },
  {
    id: "asset-repo-2",
    type: "repository",
    name: "web-frontend",
    description: "React web application",
    criticality: "high",
    status: "active",
    scope: "external",
    exposure: "public",
    riskScore: 45,
    findingCount: 8,
    tags: ["frontend", "react", "production"],
    firstSeen: "2024-01-02T00:00:00Z",
    lastSeen: "2024-01-15T09:00:00Z",
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-15T09:00:00Z",
    metadata: {},
    // Legacy fields for UI compatibility
    scm_provider: "github",
    scm_organization: "vnsecurity",
    default_branch: "main",
    visibility: "private",
    primary_language: "TypeScript",
    risk_score: 45,
    sync_status: "synced",
    compliance_status: "partial",
    quality_gate_status: "warning",
    findings_summary: createFindingsSummary(8, 0, 2, 4),
    components_summary: { total: 234, vulnerable: 3 },
    scan_settings: {
      enabled_scanners: ["sast", "sca"],
      auto_scan: true,
      scan_on_push: true,
    },
    last_scanned_at: "2024-01-15T05:00:00Z",
    repository: {
      assetId: "asset-repo-2",
      repoId: "123457",
      fullName: "vnsecurity/web-frontend",
      scmOrganization: "vnsecurity",
      cloneUrl: "https://github.com/vnsecurity/web-frontend.git",
      webUrl: "https://github.com/vnsecurity/web-frontend",
      defaultBranch: "main",
      visibility: "private",
      language: "TypeScript",
      languages: { TypeScript: 85000, CSS: 10000, HTML: 5000 },
      topics: ["react", "nextjs", "frontend"],
      stars: 32,
      forks: 8,
      watchers: 25,
      openIssues: 5,
      contributorsCount: 10,
      sizeKb: 45000,
      branchCount: 8,
      protectedBranchCount: 1,
      componentCount: 234,
      vulnerableComponentCount: 3,
      findingCount: 8,
      scanEnabled: true,
      lastScannedAt: "2024-01-15T05:00:00Z",
    },
  },
  {
    id: "asset-repo-3",
    type: "repository",
    name: "auth-service",
    description: "Authentication microservice",
    criticality: "critical",
    status: "active",
    scope: "internal",
    exposure: "restricted",
    riskScore: 35,
    findingCount: 3,
    tags: ["auth", "security", "microservices"],
    firstSeen: "2024-01-03T00:00:00Z",
    lastSeen: "2024-01-15T08:00:00Z",
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-15T08:00:00Z",
    metadata: {},
    // Legacy fields for UI compatibility
    scm_provider: "github",
    scm_organization: "vnsecurity",
    default_branch: "main",
    visibility: "private",
    primary_language: "Python",
    risk_score: 35,
    sync_status: "synced",
    compliance_status: "compliant",
    quality_gate_status: "passed",
    findings_summary: createFindingsSummary(3, 0, 1, 1),
    components_summary: { total: 89, vulnerable: 1 },
    scan_settings: {
      enabled_scanners: ["sast", "sca", "secret", "iac"],
      auto_scan: true,
      scan_on_push: true,
    },
    last_scanned_at: "2024-01-15T04:00:00Z",
    repository: {
      assetId: "asset-repo-3",
      repoId: "123458",
      fullName: "vnsecurity/auth-service",
      scmOrganization: "vnsecurity",
      cloneUrl: "https://github.com/vnsecurity/auth-service.git",
      webUrl: "https://github.com/vnsecurity/auth-service",
      defaultBranch: "main",
      visibility: "private",
      language: "Python",
      languages: { Python: 90000, Dockerfile: 2000 },
      topics: ["authentication", "oauth", "jwt"],
      stars: 28,
      forks: 5,
      watchers: 20,
      openIssues: 2,
      contributorsCount: 8,
      sizeKb: 18000,
      branchCount: 5,
      protectedBranchCount: 2,
      componentCount: 89,
      vulnerableComponentCount: 1,
      findingCount: 3,
      scanEnabled: true,
      lastScannedAt: "2024-01-15T04:00:00Z",
    },
  },
];

// ============================================
// Statistics Helper
// ============================================

export function getRepositoryStats(repositories: RepositoryView[] | AssetWithRepository[] | undefined | null) {
  const emptyStats = {
    total: 0,
    with_critical_findings: 0,
    total_findings: 0,
    total_components: 0,
    vulnerable_components: 0,
    avg_risk_score: 0,
    scanned_last_24h: 0,
    by_status: { active: 0, inactive: 0, archived: 0 },
    by_criticality: { critical: 0, high: 0, medium: 0, low: 0 },
    by_visibility: { public: 0, private: 0, internal: 0 },
    by_quality_gate: { passed: 0, failed: 0, warning: 0, not_computed: 0 },
    by_provider: { github: 0, gitlab: 0, bitbucket: 0, azure_devops: 0, codecommit: 0, local: 0 },
  };

  if (!repositories || repositories.length === 0) {
    return emptyStats;
  }

  const total = repositories.length;
  const withCriticalFindings = repositories.filter(
    (r) => r.riskScore >= 80
  ).length;
  const avgRiskScore =
    repositories.reduce((sum, r) => sum + r.riskScore, 0) / total || 0;
  const totalFindings = repositories.reduce(
    (sum, r) => sum + r.findingCount,
    0
  );
  const totalComponents = repositories.reduce(
    (sum, r) => sum + (r.repository?.componentCount || 0),
    0
  );
  const vulnerableComponents = repositories.reduce(
    (sum, r) => sum + (r.repository?.vulnerableComponentCount || 0),
    0
  );

  // Count repositories scanned in last 24 hours
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const scannedLast24h = repositories.filter((r) => {
    const lastScanned = r.repository?.lastScannedAt;
    if (!lastScanned) return false;
    return new Date(lastScanned) > oneDayAgo;
  }).length;

  const byCriticality: Record<Criticality, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const byVisibility: Record<RepoVisibility, number> = {
    public: 0,
    private: 0,
    internal: 0,
  };

  const byStatus: Record<string, number> = {
    active: 0,
    inactive: 0,
    archived: 0,
  };

  const byQualityGate = {
    passed: 0,
    failed: 0,
    warning: 0,
    not_computed: 0,
  };

  const byProvider: Record<SCMProvider, number> = {
    github: 0,
    gitlab: 0,
    bitbucket: 0,
    azure_devops: 0,
    codecommit: 0,
    local: 0,
  };

  repositories.forEach((r) => {
    // Status
    if (r.status in byStatus) {
      byStatus[r.status]++;
    }
    // Criticality
    if (r.criticality in byCriticality) {
      byCriticality[r.criticality as Criticality]++;
    }
    // Visibility
    if (r.repository?.visibility && r.repository.visibility in byVisibility) {
      byVisibility[r.repository.visibility]++;
    }
    // Quality gate - approximate based on risk score
    if (r.riskScore < 30) {
      byQualityGate.passed++;
    } else if (r.riskScore < 60) {
      byQualityGate.warning++;
    } else {
      byQualityGate.failed++;
    }
  });

  return {
    total,
    with_critical_findings: withCriticalFindings,
    total_findings: totalFindings,
    total_components: totalComponents,
    vulnerable_components: vulnerableComponents,
    avg_risk_score: Math.round(avgRiskScore),
    scanned_last_24h: scannedLast24h,
    by_status: byStatus,
    by_criticality: byCriticality,
    by_visibility: byVisibility,
    by_quality_gate: byQualityGate,
    by_provider: byProvider,
  };
}
