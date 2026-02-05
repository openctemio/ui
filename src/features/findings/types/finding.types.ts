/**
 * Finding Types
 *
 * Type definitions for security findings/vulnerabilities
 * Based on HackerOne/Bugcrowd style vulnerability management
 */

import type { Severity } from '@/features/shared/types'

// ============================================
// FINDING STATUS (Workflow-based)
// ============================================

/**
 * Finding status - simplified workflow:
 * new → confirmed → in_progress → resolved
 *
 * Terminal states (can reopen to "confirmed"):
 * - false_positive: Not a real issue (requires approval)
 * - accepted: Risk accepted with expiration (requires approval)
 * - duplicate: Linked to another finding
 */
export type FindingStatus =
  | 'new' // Scanner just found it
  | 'confirmed' // Verified as real issue, needs fix
  | 'in_progress' // Developer working on fix
  | 'resolved' // Fix applied - REMEDIATED
  | 'false_positive' // Not a real issue (requires approval)
  | 'accepted' // Risk accepted (requires approval, has expiration)
  | 'duplicate' // Linked to another finding

export type StatusCategory = 'open' | 'in_progress' | 'closed'

export interface StatusConfig {
  label: string
  color: string
  bgColor: string
  textColor: string
  icon: string
  category: StatusCategory
  requiresApproval?: boolean
  showExpiration?: boolean
}

export const FINDING_STATUS_CONFIG: Record<FindingStatus, StatusConfig> = {
  new: {
    label: 'New',
    color: 'border-blue-500/50',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
    icon: 'circle-dot',
    category: 'open',
  },
  confirmed: {
    label: 'Confirmed',
    color: 'border-orange-500/50',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    icon: 'check-circle',
    category: 'open',
  },
  in_progress: {
    label: 'In Progress',
    color: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    icon: 'loader',
    category: 'in_progress',
  },
  resolved: {
    label: 'Resolved',
    color: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
    icon: 'check-square',
    category: 'closed',
  },
  false_positive: {
    label: 'False Positive',
    color: 'border-slate-500/50',
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    icon: 'x-circle',
    category: 'closed',
    requiresApproval: true,
  },
  accepted: {
    label: 'Risk Accepted',
    color: 'border-amber-500/50',
    bgColor: 'bg-amber-500/20',
    textColor: 'text-amber-400',
    icon: 'alert-triangle',
    category: 'closed',
    requiresApproval: true,
    showExpiration: true,
  },
  duplicate: {
    label: 'Duplicate',
    color: 'border-slate-500/50',
    bgColor: 'bg-slate-500/20',
    textColor: 'text-slate-400',
    icon: 'copy',
    category: 'closed',
  },
}

/**
 * Status transitions workflow
 * Simplified: new → confirmed → in_progress → resolved
 *
 * Note: Transitions to false_positive and accepted require approval
 * from security team. The UI should show approval dialog for these.
 */
export const STATUS_TRANSITIONS: Record<FindingStatus, FindingStatus[]> = {
  // Open states
  new: ['confirmed', 'duplicate', 'false_positive'],
  confirmed: ['in_progress', 'resolved', 'duplicate', 'false_positive', 'accepted'],
  // In progress
  in_progress: ['resolved', 'confirmed'],
  // Closed states (can reopen to confirmed)
  resolved: ['confirmed'],
  false_positive: ['confirmed'],
  accepted: ['confirmed'],
  duplicate: ['confirmed'],
}

/**
 * Check if a status requires approval to transition to
 */
export function requiresApproval(status: FindingStatus): boolean {
  return status === 'false_positive' || status === 'accepted'
}

/**
 * Check if a status is open (needs action)
 */
export function isOpenStatus(status: FindingStatus): boolean {
  const category = FINDING_STATUS_CONFIG[status]?.category
  return category === 'open' || category === 'in_progress'
}

/**
 * Check if a status is closed (terminal states: resolved, false_positive, accepted, duplicate)
 */
export function isClosedStatus(status: FindingStatus): boolean {
  const category = FINDING_STATUS_CONFIG[status]?.category
  return category === 'closed'
}

/**
 * Get valid transitions for a status
 */
export function getValidTransitions(status: FindingStatus): FindingStatus[] {
  return STATUS_TRANSITIONS[status] || []
}

// ============================================
// SEVERITY
// ============================================

export const SEVERITY_CONFIG: Record<
  Severity,
  {
    label: string
    color: string
    bgColor: string
    textColor: string
    cvssRange: string
  }
> = {
  critical: {
    label: 'Critical',
    color: 'border-red-500/50',
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
    cvssRange: '9.0 - 10.0',
  },
  high: {
    label: 'High',
    color: 'border-orange-500/50',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    cvssRange: '7.0 - 8.9',
  },
  medium: {
    label: 'Medium',
    color: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
    cvssRange: '4.0 - 6.9',
  },
  low: {
    label: 'Low',
    color: 'border-green-500/50',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
    cvssRange: '0.1 - 3.9',
  },
  info: {
    label: 'Info',
    color: 'border-gray-500/50',
    bgColor: 'bg-gray-500/20',
    textColor: 'text-gray-400',
    cvssRange: '0',
  },
  none: {
    label: 'None',
    color: 'border-gray-500/50',
    bgColor: 'bg-gray-500/20',
    textColor: 'text-gray-400',
    cvssRange: '0',
  },
}

// ============================================
// USER
// ============================================

export type UserRole = 'admin' | 'analyst' | 'developer' | 'viewer'

export interface FindingUser {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
}

// ============================================
// AFFECTED ASSET
// ============================================

export type AssetType = 'domain' | 'website' | 'service' | 'ip' | 'repository' | 'cloud'

export interface AffectedAsset {
  id: string
  type: AssetType
  name: string
  url?: string
  criticality?: Severity
}

// ============================================
// EVIDENCE
// ============================================

export type EvidenceType = 'screenshot' | 'video' | 'log' | 'request' | 'response' | 'code' | 'file'

export interface Evidence {
  id: string
  type: EvidenceType
  title: string
  content: string // URL or base64 or text
  mimeType?: string
  createdAt: string
  createdBy: FindingUser
}

export const EVIDENCE_TYPE_CONFIG: Record<EvidenceType, { label: string; icon: string }> = {
  screenshot: { label: 'Screenshot', icon: 'image' },
  video: { label: 'Video', icon: 'video' },
  log: { label: 'Log Entry', icon: 'file-text' },
  request: { label: 'HTTP Request', icon: 'arrow-up-right' },
  response: { label: 'HTTP Response', icon: 'arrow-down-left' },
  code: { label: 'Code/Payload', icon: 'code' },
  file: { label: 'File', icon: 'paperclip' },
}

// ============================================
// REMEDIATION
// ============================================

export type RemediationStepStatus = 'pending' | 'in_progress' | 'completed'

export interface RemediationStep {
  id: string
  description: string
  status: RemediationStepStatus
  completedBy?: FindingUser
  completedAt?: string
}

export interface Remediation {
  description: string
  steps: RemediationStep[]
  references: string[]
  deadline?: string
  progress: number // 0-100
}

// ============================================
// ACTIVITY
// ============================================

export type ActivityType =
  | 'created'
  | 'ai_triage'
  | 'ai_triage_requested'
  | 'ai_triage_failed'
  | 'status_changed'
  | 'severity_changed'
  | 'assigned'
  | 'unassigned'
  | 'comment'
  | 'internal_note'
  | 'evidence_added'
  | 'remediation_started'
  | 'remediation_updated'
  | 'verified'
  | 'reopened'
  | 'linked'
  | 'duplicate_marked'
  | 'false_positive_marked'

export interface Attachment {
  id: string
  filename: string
  url: string
  size: number
  mimeType: string
}

export interface Reaction {
  emoji: string
  users: FindingUser[]
  count: number
}

export interface Activity {
  id: string
  type: ActivityType
  actor: FindingUser | 'system' | 'ai'
  content?: string
  metadata?: Record<string, unknown>

  // For status/severity changes
  previousValue?: string
  newValue?: string
  reason?: string

  // For comments
  isInternal?: boolean
  attachments?: Attachment[]
  reactions?: Reaction[]
  replies?: Activity[]

  // Timestamps
  createdAt: string
  editedAt?: string
}

export const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; color: string }
> = {
  created: {
    label: 'Created',
    icon: 'plus-circle',
    color: 'text-blue-400',
  },
  ai_triage: {
    label: 'AI Analysis',
    icon: 'bot',
    color: 'text-purple-400',
  },
  ai_triage_requested: {
    label: 'AI Analysis Requested',
    icon: 'bot',
    color: 'text-purple-400',
  },
  ai_triage_failed: {
    label: 'AI Analysis Failed',
    icon: 'bot',
    color: 'text-red-400',
  },
  status_changed: {
    label: 'Status Changed',
    icon: 'arrow-right-left',
    color: 'text-yellow-400',
  },
  severity_changed: {
    label: 'Severity Changed',
    icon: 'gauge',
    color: 'text-orange-400',
  },
  assigned: {
    label: 'Assigned',
    icon: 'user-plus',
    color: 'text-green-400',
  },
  unassigned: {
    label: 'Unassigned',
    icon: 'user-minus',
    color: 'text-gray-400',
  },
  comment: {
    label: 'Comment',
    icon: 'message-square',
    color: 'text-blue-400',
  },
  internal_note: {
    label: 'Internal Note',
    icon: 'lock',
    color: 'text-amber-400',
  },
  evidence_added: {
    label: 'Evidence Added',
    icon: 'file-plus',
    color: 'text-green-400',
  },
  remediation_started: {
    label: 'Remediation Started',
    icon: 'wrench',
    color: 'text-blue-400',
  },
  remediation_updated: {
    label: 'Remediation Updated',
    icon: 'refresh-cw',
    color: 'text-blue-400',
  },
  verified: {
    label: 'Verified',
    icon: 'shield-check',
    color: 'text-green-400',
  },
  reopened: {
    label: 'Reopened',
    icon: 'rotate-ccw',
    color: 'text-orange-400',
  },
  linked: {
    label: 'Linked',
    icon: 'link',
    color: 'text-blue-400',
  },
  duplicate_marked: {
    label: 'Marked Duplicate',
    icon: 'copy',
    color: 'text-orange-400',
  },
  false_positive_marked: {
    label: 'Marked False Positive',
    icon: 'x-circle',
    color: 'text-red-400',
  },
}

// ============================================
// AI TRIAGE
// ============================================

export interface AITriageResult {
  risk: Severity
  cvss: number
  exploitability: 'none' | 'low' | 'medium' | 'high' | 'critical'
  affectedAssets: number
  summary: string
  recommendations: string[]
  references: string[]
}

// ============================================
// RELATED FINDING
// ============================================

export interface RelatedFinding {
  id: string
  title: string
  severity: Severity
  status: FindingStatus
  assetName: string
  similarity?: number // percentage
  linkType?: 'similar' | 'related' | 'duplicate'
}

// ============================================
// MAIN FINDING MODEL
// ============================================

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

export interface Finding {
  id: string
  title: string
  description: string
  severity: Severity
  status: FindingStatus

  // Finding Type (discriminator for specialized fields)
  findingType?: FindingType

  // Technical Details
  cvss?: number
  cvssVector?: string
  cve?: string
  cwe?: string
  owasp?: string
  tags?: string[]

  // Location Info (file path, line numbers)
  filePath?: string
  startLine?: number
  endLine?: number
  startColumn?: number
  endColumn?: number

  // Repository Info (for linking to source code)
  repositoryUrl?: string // Repository web URL (e.g., https://github.com/org/repo)
  branch?: string // Branch name
  commitSha?: string // Commit SHA for precise linking

  // Scanner/Tool Info
  ruleId?: string
  ruleName?: string
  toolName?: string
  toolVersion?: string

  // Code snippet
  snippet?: string
  contextSnippet?: string
  contextStartLine?: number

  // Affected Assets
  assets: AffectedAsset[]

  // Evidence
  evidence: Evidence[]

  // Remediation
  remediation: Remediation

  // Assignment
  assignee?: FindingUser
  team?: string

  // Metadata
  source: FindingSource
  scanner?: string
  scanId?: string

  // Relations
  duplicateOf?: string
  relatedFindings: string[]
  remediationTaskId?: string

  // Timestamps
  discoveredAt: string
  resolvedAt?: string
  verifiedAt?: string
  createdAt: string
  updatedAt: string

  // Extended: Risk Assessment
  isTriaged?: boolean
  confidence?: number // 0-100
  impact?: string // high/medium/low
  likelihood?: string // high/medium/low
  rank?: number // priority score
  slaStatus?: string // on_track/at_risk/breached/not_applicable

  // Extended: Security Context
  exposureVector?: string // network/local/adjacent/physical
  isNetworkAccessible?: boolean
  attackPrerequisites?: string
  dataExposureRisk?: string // critical/high/medium/low
  reputationalImpact?: boolean
  complianceImpact?: string[] // ["PCI-DSS", "SOC2"]

  // Extended: Classification
  vulnerabilityClass?: string[] // ["SQL Injection", "Injection"]
  baselineState?: string // new/existing/unchanged
  kind?: string // fail/pass/warning

  // Extended: Remediation Info
  remediationType?: string // patch/config/code
  estimatedFixTime?: number // minutes
  fixComplexity?: string // simple/moderate/complex
  remedyAvailable?: boolean

  // Auto-fix fields (from scanner)
  fixCode?: string // Actual code fix from scanner (e.g., Semgrep fix)
  fixRegex?: {
    // Regex-based fix pattern
    regex: string
    replacement: string
    count?: number // 0 = replace all
  }

  // Full remediation JSONB from API
  apiRemediation?: {
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

  // Extended: Tracking
  workItemUris?: string[] // linked issues
  occurrenceCount?: number
  duplicateCount?: number
  lastSeenAt?: string
  correlationId?: string // for grouping related findings

  // Extended: Technical context
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
  relatedLocations?: Array<{
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

  // Data Flow (Attack Path / Taint Tracking)
  hasDataFlow?: boolean // Lightweight flag for list views
  dataFlow?: DataFlow // Full data when fetching single finding

  // Type-specific details (based on findingType)
  secretDetails?: SecretDetails
  complianceDetails?: ComplianceDetails
  web3Details?: Web3Details
  misconfigDetails?: MisconfigurationDetails
}

// ============================================
// FINDING TYPE (Discriminator)
// ============================================

/**
 * Finding type discriminator - determines specialized fields and fingerprint strategy
 */
export type FindingType =
  | 'vulnerability' // SAST, SCA, DAST findings
  | 'secret' // Secret detection (Gitleaks, Trufflehog)
  | 'misconfiguration' // IaC findings (Checkov, Trivy-config)
  | 'compliance' // Compliance framework violations
  | 'web3' // Smart contract findings

export const FINDING_TYPE_CONFIG: Record<
  FindingType,
  { label: string; icon: string; color: string; bgColor: string }
> = {
  vulnerability: {
    label: 'Vulnerability',
    icon: 'bug',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  secret: {
    label: 'Secret',
    icon: 'key',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  misconfiguration: {
    label: 'Misconfiguration',
    icon: 'settings',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  compliance: {
    label: 'Compliance',
    icon: 'shield-check',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  web3: {
    label: 'Web3',
    icon: 'coins',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
}

// ============================================
// DATA FLOW (Taint Tracking / Attack Path)
// ============================================

/**
 * Location type in data flow trace
 */
export type DataFlowLocationType = 'source' | 'intermediate' | 'sink' | 'sanitizer'

/**
 * Location in a data flow trace (source → intermediate → sink)
 */
export interface DataFlowLocation {
  /** File path */
  path?: string
  /** Line number (1-indexed) */
  line?: number
  /** Column number (1-indexed) */
  column?: number
  /** Code snippet at this location */
  content?: string
  /** Variable/expression name being tracked */
  label?: string
  /** Step index in the flow (for ordering) */
  index?: number
  /** Location type */
  type?: DataFlowLocationType
  /** Function name containing this location */
  functionName?: string
  /** Class name containing this location */
  className?: string
}

/**
 * Data flow trace representing taint propagation from source to sink
 */
export interface DataFlow {
  /** Where tainted data enters (e.g., user input) */
  sources?: DataFlowLocation[]
  /** Transformation/propagation steps */
  intermediates?: DataFlowLocation[]
  /** Where the vulnerability occurs (e.g., SQL execution) */
  sinks?: DataFlowLocation[]
}

export const DATA_FLOW_LOCATION_CONFIG: Record<
  DataFlowLocationType,
  { label: string; icon: string; color: string; bgColor: string; description: string }
> = {
  source: {
    label: 'Source',
    icon: 'log-in',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'Where untrusted data enters',
  },
  intermediate: {
    label: 'Propagation',
    icon: 'arrow-right',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    description: 'Data transformation step',
  },
  sink: {
    label: 'Sink',
    icon: 'alert-triangle',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'Where vulnerability occurs',
  },
  sanitizer: {
    label: 'Sanitizer',
    icon: 'shield',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Where data is sanitized',
  },
}

// ============================================
// SECRET DETAILS (when findingType === 'secret')
// ============================================

export type SecretType =
  | 'api_key'
  | 'password'
  | 'token'
  | 'certificate'
  | 'private_key'
  | 'oauth'
  | 'jwt'
  | 'ssh_key'
  | 'aws_key'
  | 'gcp_key'
  | 'azure_key'
  | 'generic_secret'
  | 'database_credential'
  | 'encryption_key'

export interface SecretDetails {
  secretType?: SecretType
  service?: string // aws, github, stripe, etc.
  maskedValue?: string // First/last chars visible
  valid?: boolean // Is secret still valid
  revoked?: boolean // Has been revoked
  scopes?: string[] // API permissions
  expiresAt?: string
}

// ============================================
// COMPLIANCE DETAILS (when findingType === 'compliance')
// ============================================

export type ComplianceFramework =
  | 'pci-dss'
  | 'hipaa'
  | 'soc2'
  | 'cis'
  | 'nist'
  | 'iso27001'
  | 'gdpr'
  | 'fedramp'

export type ComplianceResult = 'pass' | 'fail' | 'manual' | 'not_applicable'

export interface ComplianceDetails {
  framework?: ComplianceFramework
  frameworkVersion?: string
  controlId?: string
  controlName?: string
  controlDescription?: string
  result?: ComplianceResult
}

// ============================================
// WEB3 DETAILS (when findingType === 'web3')
// ============================================

export interface Web3Details {
  chain?: string // ethereum, bsc, polygon
  contractAddress?: string
  swcId?: string // SWC-107, SWC-101
  functionSelector?: string
}

// ============================================
// MISCONFIGURATION DETAILS (when findingType === 'misconfiguration')
// ============================================

export interface MisconfigurationDetails {
  policyId?: string
  policyName?: string
  resourceType?: string
  resourceName?: string
  expected?: string
  actual?: string
  cause?: string
}

// ============================================
// FINDING DETAIL (Extended for detail page)
// ============================================

export interface FindingDetail extends Finding {
  activities: Activity[]
  similarFindings?: RelatedFinding[]
  linkedFindings?: RelatedFinding[]
  sameCveFindings?: RelatedFinding[]
}

// ============================================
// STATISTICS
// ============================================

export interface FindingStats {
  total: number
  bySeverity: Record<Severity, number>
  byStatus: Record<FindingStatus, number>
  averageCvss: number
  overdueCount: number
  resolvedThisWeek: number
  newThisWeek: number
}

// ============================================
// ASSIGNABLE USERS (for dropdowns)
// ============================================

export const MOCK_USERS: FindingUser[] = [
  {
    id: 'usr-001',
    name: 'Nguyen Van An',
    email: 'an.nguyen@rediver.io',
    role: 'analyst',
  },
  {
    id: 'usr-002',
    name: 'Tran Thi Binh',
    email: 'binh.tran@rediver.io',
    role: 'analyst',
  },
  {
    id: 'usr-003',
    name: 'Le Van Cuong',
    email: 'cuong.le@rediver.io',
    role: 'developer',
  },
  {
    id: 'usr-004',
    name: 'Pham Thi Dung',
    email: 'dung.pham@rediver.io',
    role: 'admin',
  },
  {
    id: 'usr-005',
    name: 'Security Lead',
    email: 'lead@rediver.io',
    role: 'admin',
  },
]
