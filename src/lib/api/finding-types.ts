/**
 * Finding API Types
 *
 * TypeScript types for Finding Management (Security Findings)
 */

// Finding severity levels
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// Finding status
export type FindingStatus = 'new' | 'triaged' | 'in_progress' | 'resolved' | 'false_positive' | 'accepted_risk';

// Finding source (how the finding was discovered)
export type FindingSource = 'sast' | 'sca' | 'dast' | 'iac' | 'secret' | 'manual' | 'pentest' | 'bug_bounty';

/**
 * Finding entity from API
 */
export interface Finding {
  id: string;
  tenant_id: string;
  vulnerability_id?: string;
  asset_id: string;
  branch_id?: string;
  component_id?: string;
  source: FindingSource;
  tool_name: string;
  tool_version?: string;
  rule_id?: string;
  file_path?: string;
  start_line?: number;
  end_line?: number;
  start_column?: number;
  end_column?: number;
  snippet?: string;
  message: string;
  severity: FindingSeverity;
  status: FindingStatus;
  resolution?: string;
  resolved_at?: string;
  resolved_by?: string;
  scan_id?: string;
  fingerprint: string;
  location?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Finding list filters
 */
export interface FindingListFilters {
  asset_id?: string;
  branch_id?: string;
  component_id?: string;
  vulnerability_id?: string;
  severities?: FindingSeverity[];
  statuses?: FindingStatus[];
  sources?: FindingSource[];
  tool_name?: string;
  rule_id?: string;
  scan_id?: string;
  file_path?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

/**
 * Paginated list response
 */
export interface FindingListResponse {
  data: Finding[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Create finding request
 */
export interface CreateFindingRequest {
  asset_id: string;
  branch_id?: string;
  vulnerability_id?: string;
  component_id?: string;
  source: string;
  tool_name: string;
  tool_version?: string;
  rule_id?: string;
  file_path?: string;
  start_line?: number;
  end_line?: number;
  start_column?: number;
  end_column?: number;
  snippet?: string;
  message: string;
  severity: string;
  scan_id?: string;
}

/**
 * Update finding status request
 */
export interface UpdateFindingStatusRequest {
  status: FindingStatus;
  resolution?: string;
  resolved_by?: string;
}

/**
 * Finding comment
 */
export interface FindingComment {
  id: string;
  finding_id: string;
  author_id: string;
  content: string;
  is_status_change: boolean;
  old_status?: string;
  new_status?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Add comment request
 */
export interface AddCommentRequest {
  content: string;
}

/**
 * Finding statistics
 */
export interface FindingStats {
  total: number;
  by_severity: Record<FindingSeverity, number>;
  by_status: Record<FindingStatus, number>;
  by_source: Record<FindingSource, number>;
}

/**
 * Severity configuration for UI display
 */
export const SEVERITY_CONFIG: Record<FindingSeverity, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: 'Low', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  info: { label: 'Info', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
};

/**
 * Status configuration for UI display
 */
export const STATUS_CONFIG: Record<FindingStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  triaged: { label: 'Triaged', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  in_progress: { label: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  resolved: { label: 'Resolved', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  false_positive: { label: 'False Positive', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
  accepted_risk: { label: 'Accepted Risk', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
};

/**
 * Source configuration for UI display
 */
export const SOURCE_CONFIG: Record<FindingSource, { label: string; description: string }> = {
  sast: { label: 'SAST', description: 'Static Application Security Testing' },
  sca: { label: 'SCA', description: 'Software Composition Analysis' },
  dast: { label: 'DAST', description: 'Dynamic Application Security Testing' },
  iac: { label: 'IaC', description: 'Infrastructure as Code Scanning' },
  secret: { label: 'Secret', description: 'Secret/Credential Detection' },
  manual: { label: 'Manual', description: 'Manually Reported' },
  pentest: { label: 'Pentest', description: 'Penetration Testing' },
  bug_bounty: { label: 'Bug Bounty', description: 'Bug Bounty Program' },
};
