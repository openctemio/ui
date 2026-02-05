/**
 * Finding API Types
 *
 * Type definitions matching backend API responses for findings
 */

// ============================================
// Common Types
// ============================================

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none'

/**
 * Finding status - simplified workflow
 *
 * Workflow: new → confirmed → in_progress → resolved
 * Terminal states: false_positive, accepted, duplicate (can reopen to confirmed)
 */
export type FindingStatus =
  | 'new' // Scanner just found it
  | 'confirmed' // Verified as real issue, needs fix
  | 'in_progress' // Developer working on fix
  | 'resolved' // Fix applied - REMEDIATED
  | 'false_positive' // Not a real issue (requires approval)
  | 'accepted' // Risk accepted (requires approval, has expiration)
  | 'duplicate' // Linked to another finding

export type FindingSource =
  // Automated scanning tools (AppSec)
  | 'sast' // Static Application Security Testing (Semgrep, CodeQL, SonarQube)
  | 'dast' // Dynamic Application Security Testing (ZAP, Burp, Nuclei)
  | 'sca' // Software Composition Analysis (Trivy, Snyk, Grype)
  | 'secret' // Secret detection (Gitleaks, Trufflehog)
  | 'iac' // Infrastructure as Code scanning (Checkov, Tfsec, Kics)
  | 'container' // Container image scanning
  // Cloud & Infrastructure security
  | 'cspm' // Cloud Security Posture Management (Wiz, Prisma Cloud, AWS Security Hub)
  | 'easm' // External Attack Surface Management (Censys, Shodan, ProjectDiscovery)
  // Runtime & Production
  | 'rasp' // Runtime Application Self-Protection
  | 'waf' // Web Application Firewall findings
  | 'siem' // SIEM/Log analysis findings
  // Manual/human sources
  | 'manual' // Manual code review or ad-hoc discovery
  | 'pentest' // Penetration testing engagement
  | 'bug_bounty' // Bug bounty program submission
  | 'red_team' // Red team exercise
  // External sources
  | 'external' // Imported from external tools/systems
  | 'threat_intel' // Threat intelligence feeds
  | 'vendor' // Vendor security assessments/third-party audits

export type ApiFindingType = 'vulnerability' | 'secret' | 'misconfiguration' | 'compliance' | 'web3'

export type ApiDataFlowLocationType = 'source' | 'intermediate' | 'sink'

export interface ApiDataFlowLocation {
  path?: string
  line?: number
  column?: number
  content?: string
  label?: string
  index?: number
  location_type?: ApiDataFlowLocationType
}

export interface ApiDataFlow {
  sources?: ApiDataFlowLocation[]
  intermediates?: ApiDataFlowLocation[]
  sinks?: ApiDataFlowLocation[]
}

// ============================================
// API Response Types
// ============================================

/**
 * Finding entity from API
 */
export interface ApiFinding {
  id: string
  tenant_id: string
  vulnerability_id?: string
  asset_id: string
  asset?: {
    id: string
    name: string
    type: string
    web_url?: string
  }
  branch_id?: string
  component_id?: string
  source: FindingSource
  tool_name: string
  tool_version?: string
  rule_id?: string
  rule_name?: string
  file_path?: string
  start_line?: number
  end_line?: number
  start_column?: number
  end_column?: number
  snippet?: string
  context_snippet?: string
  context_start_line?: number
  title?: string
  description?: string
  message: string
  recommendation?: string
  fix_code?: string // Auto-fix code snippet
  fix_regex?: {
    // Regex-based fix pattern
    regex: string
    replacement: string
    count?: number // 0 = replace all
  }
  remediation?: {
    // Full remediation JSONB
    recommendation?: string
    fix_code?: string
    fix_regex?: {
      regex: string
      replacement: string
      count?: number
    }
    steps?: string[]
    references?: string[]
    effort?: string // trivial, low, medium, high
    fix_available?: boolean
    auto_fixable?: boolean
  }
  severity: Severity
  cvss_score?: number
  cvss_vector?: string
  cve_id?: string
  cwe_ids?: string[]
  owasp_ids?: string[]
  tags?: string[]
  status: FindingStatus
  is_triaged: boolean // true if status != "new"
  resolution?: string
  resolved_at?: string
  resolved_by?: string
  assigned_to?: string
  assigned_to_user?: {
    id: string
    name: string
    email: string
  }
  assigned_at?: string
  assigned_by?: string
  first_detected_at?: string
  last_seen_at?: string
  first_detected_branch?: string
  first_detected_commit?: string
  last_seen_branch?: string
  last_seen_commit?: string
  scan_id?: string
  fingerprint: string
  location?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string

  // Extended fields from SARIF/scanner output
  confidence?: number // 0-100 confidence score
  impact?: string // high/medium/low
  likelihood?: string // high/medium/low
  rank?: number // priority rank score
  vulnerability_class?: string[] // e.g., ["SQL Injection", "Injection"]
  subcategory?: string[] // additional categorization
  baseline_state?: string // new/existing/unchanged
  kind?: string // fail/pass/warning/note
  occurrence_count?: number // number of occurrences
  duplicate_count?: number // number of duplicates
  comments_count?: number // number of comments
  sla_status?: string // on_track/at_risk/breached/not_applicable

  // Security context
  exposure_vector?: string // network/local/adjacent/physical
  is_network_accessible?: boolean // whether accessible from network
  attack_prerequisites?: string // what's needed to exploit
  data_exposure_risk?: string // critical/high/medium/low
  reputational_impact?: boolean // whether has reputational impact
  compliance_impact?: string[] // e.g., ["PCI-DSS", "SOC2", "OWASP"]

  // Remediation context
  remediation_type?: string // patch/config/code/workaround
  estimated_fix_time?: number // minutes
  fix_complexity?: string // simple/moderate/complex
  remedy_available?: boolean // whether fix is available

  // Tracking
  work_item_uris?: string[] // linked issue URLs
  correlation_id?: string // for grouping related findings

  // Technical details
  stacks?: Array<{
    message?: string
    frames?: Array<{
      location?: {
        // Backend format (snake_case)
        path?: string
        start_line?: number
        start_column?: number
        message?: string
      }
      module?: string
      thread_id?: number
    }>
  }>
  related_locations?: Array<{
    // Backend format (snake_case)
    id?: number // Optional index for display
    path?: string
    start_line?: number
    end_line?: number
    start_column?: number
    end_column?: number
    message?: string
    snippet?: string
    context_snippet?: string
    branch?: string
    commit_sha?: string
  }>
  attachments?: Array<{
    type?: 'evidence' | 'screenshot' | 'document' | 'reference' | 'code' | 'other'
    description?: string
    artifact_location?: {
      uri?: string
      uri_base_id?: string
    }
  }>
  partial_fingerprints?: Record<string, string>

  // Finding type discriminator
  finding_type?: ApiFindingType

  // Data flow / taint tracking
  has_data_flow?: boolean // Lightweight flag for list views
  data_flow?: ApiDataFlow // Full data when fetching single finding

  // Secret-specific fields
  secret_type?: string
  secret_service?: string
  secret_valid?: boolean
  secret_revoked?: boolean

  // Compliance-specific fields
  compliance_framework?: string
  compliance_control_id?: string
  compliance_result?: string

  // Web3-specific fields
  web3_chain?: string
  web3_contract_address?: string
  web3_swc_id?: string

  // Misconfiguration-specific fields
  misconfig_policy_id?: string
  misconfig_resource_type?: string
  misconfig_expected?: string
  misconfig_actual?: string
}

/**
 * Vulnerability entity from API (global CVE database)
 */
export interface ApiVulnerability {
  id: string
  cve_id: string
  aliases?: string[]
  title: string
  description?: string
  severity: Severity
  cvss_score?: number
  cvss_vector?: string
  epss_score?: number
  epss_percentile?: number
  cisa_kev?: {
    date_added: string
    due_date: string
    ransomware_use?: string
    notes?: string
    is_past_due: boolean
  }
  exploit_available: boolean
  exploit_maturity: string
  references?: Array<{
    type: string
    url: string
  }>
  affected_versions?: Array<{
    ecosystem: string
    package: string
    introduced?: string
    fixed?: string
  }>
  fixed_versions?: string[]
  remediation?: string
  published_at?: string
  modified_at?: string
  status: string
  risk_score: number
  created_at: string
  updated_at: string
}

// ============================================
// List Response Types
// ============================================

export interface PaginationLinks {
  first?: string
  prev?: string
  next?: string
  last?: string
}

export interface ApiFindingListResponse {
  data: ApiFinding[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

export interface ApiVulnerabilityListResponse {
  data: ApiVulnerability[]
  total: number
  page: number
  per_page: number
  total_pages: number
  links?: PaginationLinks
}

// ============================================
// Input Types
// ============================================

export interface CreateFindingInput {
  asset_id: string
  vulnerability_id?: string
  component_id?: string
  source: FindingSource
  tool_name: string
  tool_version?: string
  rule_id?: string
  file_path?: string
  start_line?: number
  end_line?: number
  start_column?: number
  end_column?: number
  snippet?: string
  message: string
  severity: Severity
  scan_id?: string
}

export interface UpdateFindingStatusInput {
  status: FindingStatus
  resolution?: string
  resolved_by?: string
}

export interface UpdateFindingSeverityInput {
  severity: Severity
  cvss_score?: number
  cvss_vector?: string
}

export interface AssignFindingInput {
  user_id: string
  comment?: string
}

export interface TriageFindingInput {
  reason?: string // Optional reason for confirming the finding
}

export interface ClassifyFindingInput {
  cve_id?: string
  cwe_ids?: string[]
  owasp_ids?: string[]
  cvss_score?: number
  cvss_vector?: string
}

export interface SetFindingTagsInput {
  tags: string[]
}

// ============================================
// Comment Types
// ============================================

export interface ApiFindingComment {
  id: string
  finding_id: string
  author_id: string
  author_name?: string
  author_email?: string
  content: string
  is_status_change: boolean
  old_status?: FindingStatus
  new_status?: FindingStatus
  created_at: string
  updated_at?: string
}

export interface ApiFindingCommentListResponse {
  data: ApiFindingComment[]
  total: number
}

export interface AddCommentInput {
  content: string
}

export interface UpdateCommentInput {
  content: string
}

// ============================================
// Filter Types
// ============================================

export interface FindingApiFilters {
  asset_id?: string
  component_id?: string
  vulnerability_id?: string
  severities?: Severity[]
  statuses?: FindingStatus[]
  sources?: FindingSource[]
  source_id?: string // Agent/Source ID that created the finding
  tool_name?: string
  rule_id?: string
  scan_id?: string
  file_path?: string
  search?: string
  page?: number
  per_page?: number
}

export interface VulnerabilityApiFilters {
  cve_ids?: string[]
  severities?: Severity[]
  exploit_available?: boolean
  cisa_kev_only?: boolean
  statuses?: string[]
  min_cvss?: number
  max_cvss?: number
  min_epss?: number
  page?: number
  per_page?: number
}

// ============================================
// Stats Types
// ============================================

export interface FindingStatsResponse {
  total: number
  by_severity: Record<string, number>
  by_status: Record<string, number>
  by_source: Record<string, number>
  open_count: number
  resolved_count: number
}
