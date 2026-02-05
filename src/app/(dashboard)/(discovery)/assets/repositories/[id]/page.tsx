'use client'

import { useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Main } from '@/components/layout'
import { RiskScoreBadge } from '@/features/shared'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  GitBranch,
  Search as SearchIcon,
  MoreHorizontal,
  Eye,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Lock,
  Globe,
  ExternalLink,
  Github,
  GitlabIcon,
  Cloud,
  XCircle,
  Clock,
  Package,
  FileCode,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  Play,
  GitMerge,
  GitPullRequest,
  MessageSquare,
  Filter,
  UserPlus,
  ChevronRight,
  AlertOctagon,
  Bell,
  History,
  Layers,
  Timer,
  Loader2,
} from 'lucide-react'
import {
  useRepository,
  useRepositoryBranches,
  type RepositoryView,
  type SCMProvider,
  type Severity,
  type BranchStatus,
  type SLAStatus,
  type ScannerType,
  SCM_PROVIDER_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  BRANCH_STATUS_LABELS,
  BRANCH_STATUS_COLORS,
  SLA_STATUS_LABELS,
  SLA_STATUS_COLORS,
  SCANNER_TYPE_LABELS,
} from '@/features/repositories'

// Additional types for detail page
type Repository = RepositoryView
type FindingStatus =
  | 'open'
  | 'confirmed'
  | 'in_progress'
  | 'resolved'
  | 'false_positive'
  | 'accepted_risk'
type TriageStatus = 'needs_triage' | 'triaged' | 'escalated'
type ActivityAction =
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'finding_created'
  | 'finding_resolved'
  | 'finding_regressed'
  | 'finding_status_changed'
  | 'finding_assigned'
  | 'finding_triaged'
  | 'finding_commented'
  | 'branch_created'
  | 'branch_added'
  | 'branch_deleted'
  | 'pr_opened'
  | 'pr_merged'
  | 'pr_closed'
  | 'repository_synced'
  | 'settings_changed'
  | 'config_updated'
  | 'notification_sent'
  | 'issue_created'
type DetailTab = 'overview' | 'branches' | 'findings' | 'components' | 'activity' | 'settings'

// Labels
const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
}

const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  open: 'Open',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  false_positive: 'False Positive',
  accepted_risk: 'Accepted Risk',
}

const FINDING_STATUS_COLORS: Record<FindingStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-red-500/15', text: 'text-red-600' },
  confirmed: { bg: 'bg-orange-500/15', text: 'text-orange-600' },
  in_progress: { bg: 'bg-blue-500/15', text: 'text-blue-600' },
  resolved: { bg: 'bg-green-500/15', text: 'text-green-600' },
  false_positive: { bg: 'bg-gray-500/15', text: 'text-gray-600' },
  accepted_risk: { bg: 'bg-yellow-500/15', text: 'text-yellow-600' },
}

const TRIAGE_STATUS_LABELS: Record<TriageStatus, string> = {
  needs_triage: 'Needs Triage',
  triaged: 'Triaged',
  escalated: 'Escalated',
}

const TRIAGE_STATUS_COLORS: Record<TriageStatus, { bg: string; text: string }> = {
  needs_triage: { bg: 'bg-yellow-500/15', text: 'text-yellow-600' },
  triaged: { bg: 'bg-blue-500/15', text: 'text-blue-600' },
  escalated: { bg: 'bg-red-500/15', text: 'text-red-600' },
}

const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  scan_started: 'Scan Started',
  scan_completed: 'Scan Completed',
  scan_failed: 'Scan Failed',
  finding_created: 'Finding Created',
  finding_resolved: 'Finding Resolved',
  finding_regressed: 'Finding Regressed',
  finding_status_changed: 'Finding Status Changed',
  finding_assigned: 'Finding Assigned',
  finding_triaged: 'Finding Triaged',
  finding_commented: 'Comment Added',
  branch_created: 'Branch Created',
  branch_added: 'Branch Added',
  branch_deleted: 'Branch Deleted',
  pr_opened: 'Pull Request Opened',
  pr_merged: 'Pull Request Merged',
  pr_closed: 'Pull Request Closed',
  repository_synced: 'Repository Synced',
  settings_changed: 'Settings Changed',
  config_updated: 'Config Updated',
  notification_sent: 'Notification Sent',
  issue_created: 'Issue Created',
}

const SCM_PROVIDER_COLORS: Record<SCMProvider, string> = {
  github: 'bg-gray-900 text-white',
  gitlab: 'bg-orange-600 text-white',
  bitbucket: 'bg-blue-600 text-white',
  azure_devops: 'bg-blue-500 text-white',
  codecommit: 'bg-yellow-600 text-white',
  local: 'bg-gray-500 text-white',
}

// Mock data for detail page
interface BranchFindingsSummary {
  total: number
  by_severity: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
}

interface BranchDetail {
  id: string
  name: string
  type: 'main' | 'develop' | 'feature' | 'release' | 'hotfix' | 'other'
  is_default: boolean
  is_protected: boolean
  scan_status: BranchStatus
  last_commit_sha: string
  last_commit_message: string
  last_commit_author: string
  last_commit_author_avatar?: string
  last_commit_at: string
  findings_summary: BranchFindingsSummary
  compared_to_default?: {
    new_findings: number
    resolved_findings: number
  }
  last_scanned_at?: string
}

interface FindingDetail {
  id: string
  title: string
  description: string
  severity: Severity
  status: FindingStatus
  triage_status: TriageStatus
  scanner_type: ScannerType
  file_path?: string
  line_start?: number
  branches: string[]
  sla_status: SLAStatus
  sla_days_remaining?: number
  first_detected_at: string
  assigned_to_name?: string
  assigned_to_avatar?: string
  comments_count: number
  cwe_ids?: string[]
}

interface ActivityLog {
  id: string
  action: ActivityAction
  actor_type: 'user' | 'system'
  actor_name: string
  actor_avatar?: string
  entity_name?: string
  comment?: string
  timestamp: string
  changes?: Array<{
    field: string
    old_value?: string | number | boolean
    new_value: string | number | boolean
  }>
  scan_summary?: {
    branch: string
    findings_total: number
    findings_new: number
    findings_resolved: number
    duration_seconds: number
    quality_gate_passed: boolean
  }
  pr_info?: {
    number: number
    title: string
    url: string
    source_branch: string
    target_branch: string
  }
}

interface SLAPolicy {
  id: string
  name: string
  rules: Array<{
    severity: Severity
    days_to_remediate: number
    warning_threshold_percent: number
  }>
}

const mockBranchDetails: BranchDetail[] = [
  {
    id: 'branch-1',
    name: 'main',
    type: 'main',
    is_default: true,
    is_protected: true,
    scan_status: 'passed',
    last_commit_sha: 'abc123',
    last_commit_message: 'feat: add new feature',
    last_commit_author: 'John Doe',
    last_commit_author_avatar: '',
    last_commit_at: '2024-01-15T10:30:00Z',
    findings_summary: {
      total: 5,
      by_severity: { critical: 1, high: 2, medium: 1, low: 1, info: 0 },
    },
    last_scanned_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'branch-2',
    name: 'develop',
    type: 'develop',
    is_default: false,
    is_protected: true,
    scan_status: 'warning',
    last_commit_sha: 'def456',
    last_commit_message: 'fix: resolve bug',
    last_commit_author: 'Jane Smith',
    last_commit_author_avatar: '',
    last_commit_at: '2024-01-14T14:00:00Z',
    findings_summary: {
      total: 8,
      by_severity: { critical: 0, high: 3, medium: 3, low: 2, info: 0 },
    },
    compared_to_default: {
      new_findings: 3,
      resolved_findings: 0,
    },
    last_scanned_at: '2024-01-14T14:00:00Z',
  },
]

const mockFindings: FindingDetail[] = [
  {
    id: 'finding-1',
    title: 'SQL Injection vulnerability',
    description: 'User input not sanitized before database query',
    severity: 'critical',
    status: 'open',
    triage_status: 'triaged',
    scanner_type: 'sast',
    file_path: 'src/api/users.go',
    line_start: 45,
    branches: ['main'],
    sla_status: 'warning',
    sla_days_remaining: 5,
    first_detected_at: '2024-01-10T00:00:00Z',
    assigned_to_name: 'John Doe',
    assigned_to_avatar: '',
    comments_count: 2,
    cwe_ids: ['CWE-89'],
  },
  {
    id: 'finding-2',
    title: 'Vulnerable dependency: lodash < 4.17.21',
    description: 'Known prototype pollution vulnerability',
    severity: 'high',
    status: 'in_progress',
    triage_status: 'triaged',
    scanner_type: 'sca',
    file_path: 'package.json',
    line_start: 15,
    branches: ['main', 'develop'],
    sla_status: 'on_track',
    sla_days_remaining: 10,
    first_detected_at: '2024-01-12T00:00:00Z',
    comments_count: 1,
    cwe_ids: ['CWE-1321'],
  },
]

const mockActivities: ActivityLog[] = [
  {
    id: 'activity-1',
    action: 'scan_completed',
    actor_type: 'system',
    actor_name: 'System',
    entity_name: 'main',
    timestamp: '2024-01-15T10:30:00Z',
    scan_summary: {
      branch: 'main',
      findings_total: 5,
      findings_new: 3,
      findings_resolved: 0,
      duration_seconds: 180,
      quality_gate_passed: true,
    },
  },
  {
    id: 'activity-2',
    action: 'finding_resolved',
    actor_type: 'user',
    actor_name: 'John Doe',
    actor_avatar: '',
    entity_name: 'SQL Injection in login',
    timestamp: '2024-01-14T14:00:00Z',
    changes: [{ field: 'status', old_value: 'open', new_value: 'resolved' }],
  },
]

const mockSLAPolicy: SLAPolicy = {
  id: 'sla-1',
  name: 'Default Security SLA',
  rules: [
    { severity: 'critical', days_to_remediate: 2, warning_threshold_percent: 50 },
    { severity: 'high', days_to_remediate: 15, warning_threshold_percent: 70 },
    { severity: 'medium', days_to_remediate: 30, warning_threshold_percent: 80 },
    { severity: 'low', days_to_remediate: 60, warning_threshold_percent: 90 },
    { severity: 'info', days_to_remediate: 90, warning_threshold_percent: 90 },
  ],
}

const getOverdueFindingsCount = (findings: FindingDetail[]) =>
  findings.filter((f) => f.sla_status === 'overdue' || f.sla_status === 'exceeded').length

const getSLAWarningsCount = (findings: FindingDetail[]) =>
  findings.filter((f) => f.sla_status === 'warning').length

// ============================================
// API Response Types & Transformation
// ============================================

interface ApiAssetResponse {
  id: string
  tenant_id?: string
  name: string
  type: string
  criticality: string
  status: string
  scope: string
  exposure: string
  risk_score: number
  finding_count: number
  description?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  first_seen: string
  last_seen: string
  created_at: string
  updated_at: string
  repository?: {
    asset_id: string
    repo_id?: string
    full_name: string
    scm_connection_id?: string
    scm_provider: string
    scm_organization?: string
    visibility?: string
    default_branch?: string
    primary_language?: string
    languages?: string[]
    topics?: string[]
    description?: string
    web_url?: string
    clone_url?: string
    created_at_source?: string
    updated_at_source?: string
    pushed_at_source?: string
    branch_count?: number
    commit_count?: number
    contributor_count?: number
    open_pr_count?: number
    size_kb?: number
    is_fork?: boolean
    is_archived?: boolean
    is_disabled?: boolean
    is_template?: boolean
    has_issues?: boolean
    has_wiki?: boolean
    security_features?: {
      advanced_security?: boolean
      secret_scanning?: boolean
      secret_scanning_push_protection?: boolean
      dependabot_alerts?: boolean
      dependabot_updates?: boolean
      code_scanning?: boolean
    }
    scan_settings?: {
      enabled_scanners: string[]
      auto_scan: boolean
      scan_on_push: boolean
      scan_on_pr: boolean
      schedule?: string
      branch_patterns?: string[]
    }
    sync_status?: string
    last_synced_at?: string
    last_scanned_at?: string
    findings_summary?: {
      total: number
      by_severity: {
        critical: number
        high: number
        medium: number
        low: number
        info: number
      }
      by_status?: {
        open: number
        in_progress: number
        resolved: number
        false_positive: number
        accepted_risk: number
      }
    }
    components_summary?: {
      total: number
      vulnerable: number
      outdated: number
    }
    quality_gate_status?: string
    compliance_status?: string
    created_at?: string
    updated_at?: string
  }
}

function transformToRepositoryView(asset: ApiAssetResponse): RepositoryView {
  const repo = asset.repository

  // Map API scope to AssetScope type
  const scopeMap: Record<string, string> = {
    in_scope: 'internal',
    out_of_scope: 'external',
    pending_review: 'unknown',
    internal: 'internal',
    external: 'external',
    cloud: 'cloud',
    partner: 'partner',
    vendor: 'vendor',
    shadow: 'shadow',
  }

  // Map API exposure to ExposureLevel type
  const exposureMap: Record<string, string> = {
    external: 'public',
    internal: 'private',
    unknown: 'unknown',
    public: 'public',
    restricted: 'restricted',
    private: 'private',
    isolated: 'isolated',
  }

  // Build findings summary with all required fields
  const baseFindingsSummary = repo?.findings_summary || {
    total: asset.finding_count,
    by_severity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  }

  // Ensure by_status has all required fields including 'confirmed'
  const apiByStatus = baseFindingsSummary.by_status || {}
  const findingsSummary = {
    total: baseFindingsSummary.total,
    by_severity: baseFindingsSummary.by_severity,
    by_status: {
      open: (apiByStatus as Record<string, number>).open || 0,
      confirmed: (apiByStatus as Record<string, number>).confirmed || 0,
      in_progress: (apiByStatus as Record<string, number>).in_progress || 0,
      resolved: (apiByStatus as Record<string, number>).resolved || 0,
      false_positive: (apiByStatus as Record<string, number>).false_positive || 0,
      accepted_risk: (apiByStatus as Record<string, number>).accepted_risk || 0,
    },
    by_type: {
      sast: 0,
      sca: 0,
      secret: 0,
      iac: 0,
      container: 0,
      dast: 0,
    },
  }

  // Build scan settings with typed enabled_scanners
  const scanSettings = {
    enabled_scanners: (repo?.scan_settings?.enabled_scanners || []) as ScannerType[],
    auto_scan: repo?.scan_settings?.auto_scan ?? false,
    scan_on_push: repo?.scan_settings?.scan_on_push ?? false,
    scan_on_pr: repo?.scan_settings?.scan_on_pr,
    branch_patterns: repo?.scan_settings?.branch_patterns,
  }

  return {
    // Base Asset fields
    id: asset.id,
    type: 'repository',
    name: asset.name,
    description: asset.description || repo?.description || '',
    criticality: asset.criticality as 'critical' | 'high' | 'medium' | 'low',
    status: asset.status as 'active' | 'inactive' | 'archived' | 'pending',
    scope: (scopeMap[asset.scope] || 'internal') as
      | 'internal'
      | 'external'
      | 'cloud'
      | 'partner'
      | 'vendor'
      | 'shadow',
    exposure: (exposureMap[asset.exposure] || 'unknown') as
      | 'public'
      | 'restricted'
      | 'private'
      | 'isolated'
      | 'unknown',
    riskScore: asset.risk_score,
    findingCount: asset.finding_count,
    tags: asset.tags || [],
    firstSeen: asset.first_seen,
    lastSeen: asset.last_seen,
    createdAt: asset.created_at,
    updatedAt: asset.updated_at,
    metadata: asset.metadata || {},
    // UI-friendly snake_case fields
    scm_provider: (repo?.scm_provider || 'github') as SCMProvider,
    scm_organization: repo?.scm_organization,
    default_branch: repo?.default_branch || 'main',
    visibility: (repo?.visibility || 'private') as 'public' | 'private' | 'internal',
    primary_language: repo?.primary_language,
    risk_score: asset.risk_score,
    sync_status: (repo?.sync_status || 'synced') as 'synced' | 'syncing' | 'pending' | 'error',
    compliance_status: (repo?.compliance_status || 'not_assessed') as
      | 'compliant'
      | 'non_compliant'
      | 'partial'
      | 'not_assessed',
    quality_gate_status: (repo?.quality_gate_status || 'not_computed') as
      | 'passed'
      | 'failed'
      | 'warning'
      | 'not_computed',
    findings_summary: findingsSummary,
    components_summary: repo?.components_summary,
    scan_settings: scanSettings,
    security_features: repo?.security_features,
    last_scanned_at: repo?.last_scanned_at,
    // Repository extension for UI (all required fields with defaults)
    repository: repo
      ? {
          assetId: asset.id,
          repoId: repo.repo_id,
          fullName: repo.full_name,
          scmOrganization: repo.scm_organization,
          cloneUrl: repo.clone_url,
          webUrl: repo.web_url,
          defaultBranch: repo.default_branch,
          visibility: (repo.visibility || 'private') as 'public' | 'private' | 'internal',
          language: repo.primary_language,
          languages: repo.languages as Record<string, number> | undefined,
          topics: repo.topics,
          // Required stats with defaults
          stars: 0,
          forks: 0,
          watchers: 0,
          openIssues: 0,
          contributorsCount: repo.contributor_count || 0,
          sizeKb: repo.size_kb || 0,
          branchCount: repo.branch_count || 0,
          protectedBranchCount: 0,
          componentCount: 0,
          vulnerableComponentCount: 0,
          findingCount: asset.finding_count,
          scanEnabled: scanSettings.auto_scan,
          lastScannedAt: repo.last_scanned_at,
        }
      : undefined,
  }
}

import { cn } from '@/lib/utils'
import { Can, Permission } from '@/lib/permissions'
import { getErrorMessage } from '@/lib/api/error-handler'

// ============================================
// Helper Components
// ============================================

function ProviderIcon({ provider, className }: { provider: SCMProvider; className?: string }) {
  switch (provider) {
    case 'github':
      return <Github className={cn('h-4 w-4', className)} />
    case 'gitlab':
      return <GitlabIcon className={cn('h-4 w-4', className)} />
    case 'bitbucket':
    case 'azure_devops':
      return <Cloud className={cn('h-4 w-4', className)} />
    default:
      return <GitBranch className={cn('h-4 w-4', className)} />
  }
}

function BranchStatusBadge({ status }: { status: BranchStatus }) {
  const config: Record<BranchStatus, { icon: React.ReactNode }> = {
    passed: { icon: <CheckCircle className="h-3 w-3" /> },
    failed: { icon: <XCircle className="h-3 w-3" /> },
    warning: { icon: <AlertTriangle className="h-3 w-3" /> },
    scanning: { icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
    not_scanned: { icon: <Minus className="h-3 w-3" /> },
  }
  return (
    <Badge variant="outline" className={cn('gap-1', BRANCH_STATUS_COLORS[status])}>
      {config[status].icon}
      {BRANCH_STATUS_LABELS[status]}
    </Badge>
  )
}

function SeverityBadge({ severity, count }: { severity: Severity; count?: number }) {
  return (
    <Badge variant="outline" className={cn('gap-1', SEVERITY_COLORS[severity])}>
      {count !== undefined ? `${count} ${SEVERITY_LABELS[severity]}` : SEVERITY_LABELS[severity]}
    </Badge>
  )
}

function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', FINDING_STATUS_COLORS[status])}>
      {FINDING_STATUS_LABELS[status]}
    </Badge>
  )
}

function TriageStatusBadge({ status }: { status: TriageStatus }) {
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', TRIAGE_STATUS_COLORS[status])}>
      {TRIAGE_STATUS_LABELS[status]}
    </Badge>
  )
}

function SLAStatusBadge({ status, daysRemaining }: { status: SLAStatus; daysRemaining?: number }) {
  if (status === 'not_applicable') return null
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', SLA_STATUS_COLORS[status])}>
      <Timer className="h-3 w-3" />
      {daysRemaining !== undefined && daysRemaining >= 0
        ? `${daysRemaining}d left`
        : daysRemaining !== undefined
          ? `${Math.abs(daysRemaining)}d overdue`
          : SLA_STATUS_LABELS[status]}
    </span>
  )
}

function ActivityIcon({ action }: { action: ActivityAction }) {
  const iconMap: Partial<Record<ActivityAction, React.ReactNode>> = {
    scan_started: <Play className="h-4 w-4 text-blue-500" />,
    scan_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    scan_failed: <XCircle className="h-4 w-4 text-red-500" />,
    finding_created: <AlertTriangle className="h-4 w-4 text-orange-500" />,
    finding_resolved: <CheckCircle className="h-4 w-4 text-green-500" />,
    finding_regressed: <AlertOctagon className="h-4 w-4 text-red-500" />,
    finding_status_changed: <RefreshCw className="h-4 w-4 text-blue-500" />,
    finding_assigned: <UserPlus className="h-4 w-4 text-purple-500" />,
    finding_triaged: <Filter className="h-4 w-4 text-indigo-500" />,
    finding_commented: <MessageSquare className="h-4 w-4 text-gray-500" />,
    branch_created: <GitBranch className="h-4 w-4 text-green-500" />,
    branch_deleted: <Trash2 className="h-4 w-4 text-red-500" />,
    pr_opened: <GitPullRequest className="h-4 w-4 text-blue-500" />,
    pr_merged: <GitMerge className="h-4 w-4 text-purple-500" />,
    pr_closed: <XCircle className="h-4 w-4 text-gray-500" />,
    repository_synced: <RefreshCw className="h-4 w-4 text-blue-500" />,
    settings_changed: <Settings className="h-4 w-4 text-gray-500" />,
    notification_sent: <Bell className="h-4 w-4 text-yellow-500" />,
    issue_created: <ExternalLink className="h-4 w-4 text-blue-500" />,
  }
  return iconMap[action] || <Activity className="h-4 w-4 text-gray-500" />
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ============================================
// Tab Components
// ============================================

// Overview Tab
function OverviewTab({
  repository,
  branches,
  findings,
  activities,
}: {
  repository: Repository
  branches: BranchDetail[]
  findings: FindingDetail[]
  activities: ActivityLog[]
}) {
  const overdueFindingsCount = getOverdueFindingsCount(findings)
  const slaWarningsCount = getSLAWarningsCount(findings)
  const defaultBranch = branches.find((b) => b.is_default)

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Critical/High
            </CardDescription>
            <CardTitle className="text-3xl text-red-500">
              {repository.findings_summary.by_severity.critical +
                repository.findings_summary.by_severity.high}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {repository.findings_summary.total} total findings
            </p>
          </CardContent>
        </Card>

        <Card className={overdueFindingsCount > 0 ? 'border-red-500/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-orange-500" />
              SLA Overdue
            </CardDescription>
            <CardTitle
              className={cn(
                'text-3xl',
                overdueFindingsCount > 0 ? 'text-red-500' : 'text-green-500'
              )}
            >
              {overdueFindingsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">{slaWarningsCount} warnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-blue-500" />
              Branches
            </CardDescription>
            <CardTitle className="text-3xl text-blue-500">{branches.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {branches.filter((b) => b.scan_status === 'passed').length} passing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-500" />
              Components
            </CardDescription>
            <CardTitle className="text-3xl text-purple-500">
              {repository.components_summary?.total || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {repository.components_summary?.vulnerable || 0} vulnerable
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              Risk Score
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <RiskScoreBadge score={repository.risk_score} size="lg" />
          </CardContent>
        </Card>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Default Branch Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4 w-4" />
              Default Branch
            </CardTitle>
          </CardHeader>
          <CardContent>
            {defaultBranch && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">{defaultBranch.name}</code>
                    <BranchStatusBadge status={defaultBranch.scan_status} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Last scan: {formatTimeAgo(defaultBranch.last_scanned_at || '')}
                  </span>
                </div>

                {/* Findings bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Findings by Severity</span>
                    <span className="text-muted-foreground">
                      {defaultBranch.findings_summary.total} total
                    </span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    {(['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map(
                      (severity) => {
                        const count = defaultBranch.findings_summary.by_severity[severity]
                        const total = defaultBranch.findings_summary.total || 1
                        const width = (count / total) * 100
                        const colors: Record<Severity, string> = {
                          critical: 'bg-red-500',
                          high: 'bg-orange-500',
                          medium: 'bg-yellow-500',
                          low: 'bg-blue-500',
                          info: 'bg-gray-400',
                        }
                        if (count === 0) return null
                        return (
                          <TooltipProvider key={severity}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(colors[severity])}
                                  style={{ width: `${width}%` }}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                {SEVERITY_LABELS[severity]}: {count}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      }
                    )}
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Critical: {defaultBranch.findings_summary.by_severity.critical}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      High: {defaultBranch.findings_summary.by_severity.high}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      Medium: {defaultBranch.findings_summary.by_severity.medium}
                    </span>
                  </div>
                </div>

                {/* Last commit */}
                {defaultBranch.last_commit_sha && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={defaultBranch.last_commit_author_avatar} />
                      <AvatarFallback>
                        {defaultBranch.last_commit_author?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{defaultBranch.last_commit_message}</p>
                      <p className="text-xs text-muted-foreground">
                        {defaultBranch.last_commit_author} committed{' '}
                        {formatTimeAgo(defaultBranch.last_commit_at || '')}
                      </p>
                    </div>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {defaultBranch.last_commit_sha.slice(0, 7)}
                    </code>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <ActivityIcon action={activity.action} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.actor_name}</span>{' '}
                      {ACTIVITY_ACTION_LABELS[activity.action].toLowerCase()}
                      {activity.entity_name && (
                        <>
                          {' '}
                          on <span className="font-medium">{activity.entity_name}</span>
                        </>
                      )}
                    </p>
                    {activity.comment && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.comment}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Findings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Critical & High Severity Findings
          </CardTitle>
          <CardDescription>Findings requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {findings
              .filter(
                (f) =>
                  (f.severity === 'critical' || f.severity === 'high') && f.status !== 'resolved'
              )
              .slice(0, 5)
              .map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                >
                  <SeverityBadge severity={finding.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{finding.id}</code>
                      <span className="font-medium text-sm truncate">{finding.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {finding.file_path}:{finding.line_start}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FindingStatusBadge status={finding.status} />
                    <SLAStatusBadge
                      status={finding.sla_status}
                      daysRemaining={finding.sla_days_remaining}
                    />
                  </div>
                  {finding.assigned_to_name && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={finding.assigned_to_avatar} />
                      <AvatarFallback>{finding.assigned_to_name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            {findings.filter(
              (f) => (f.severity === 'critical' || f.severity === 'high') && f.status !== 'resolved'
            ).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No critical or high severity findings!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Branches Tab
function BranchesTab({
  branches,
  repositoryName,
}: {
  branches: BranchDetail[]
  repositoryName: string
}) {
  const [_selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [compareBranch, setCompareBranch] = useState<string>('')

  return (
    <div className="space-y-6">
      {/* Branch comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitMerge className="h-4 w-4" />
            Compare Branches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={compareBranch || branches.find((b) => b.is_default)?.name}
              onValueChange={setCompareBranch}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Base branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.name}>
                    {branch.name} {branch.is_default && '(default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Compare branch" />
              </SelectTrigger>
              <SelectContent>
                {branches
                  .filter(
                    (b) => b.name !== (compareBranch || branches.find((b) => b.is_default)?.name)
                  )
                  .map((branch) => (
                    <SelectItem key={branch.id} value={branch.name}>
                      {branch.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button variant="outline">Compare</Button>
          </div>
        </CardContent>
      </Card>

      {/* Branches list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            All Branches
          </CardTitle>
          <CardDescription>
            {branches.length} branches in {repositoryName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Findings</TableHead>
                <TableHead>vs Default</TableHead>
                <TableHead>Last Scan</TableHead>
                <TableHead>Last Commit</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((branch) => (
                <TableRow
                  key={branch.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedBranch(branch.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{branch.name}</code>
                      {branch.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          default
                        </Badge>
                      )}
                      {branch.is_protected && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <BranchStatusBadge status={branch.scan_status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {branch.findings_summary.by_severity.critical > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                          {branch.findings_summary.by_severity.critical}C
                        </Badge>
                      )}
                      {branch.findings_summary.by_severity.high > 0 && (
                        <Badge className="h-5 px-1.5 text-xs bg-orange-500">
                          {branch.findings_summary.by_severity.high}H
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground ml-1">
                        ({branch.findings_summary.total} total)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {branch.compared_to_default ? (
                      <div className="flex items-center gap-2 text-sm">
                        {branch.compared_to_default.new_findings > 0 && (
                          <span className="flex items-center gap-1 text-red-500">
                            <TrendingUp className="h-3 w-3" />+
                            {branch.compared_to_default.new_findings}
                          </span>
                        )}
                        {branch.compared_to_default.resolved_findings > 0 && (
                          <span className="flex items-center gap-1 text-green-500">
                            <TrendingDown className="h-3 w-3" />-
                            {branch.compared_to_default.resolved_findings}
                          </span>
                        )}
                        {branch.compared_to_default.new_findings === 0 &&
                          branch.compared_to_default.resolved_findings === 0 && (
                            <span className="text-muted-foreground">No changes</span>
                          )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(branch.last_scanned_at || '')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={branch.last_commit_author_avatar} />
                        <AvatarFallback className="text-xs">
                          {branch.last_commit_author?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <code className="text-xs bg-muted px-1 rounded">
                        {branch.last_commit_sha?.slice(0, 7)}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toast.info('Triggering scan...')}>
                          <Play className="mr-2 h-4 w-4" />
                          Scan Branch
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Findings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Settings className="mr-2 h-4 w-4" />
                          Branch Settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// Findings Tab
function FindingsTab({ findings }: { findings: FindingDetail[] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [scannerFilter, setScannerFilter] = useState<string>('all')

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (
        searchQuery &&
        !f.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !f.id.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false
      if (statusFilter !== 'all' && f.status !== statusFilter) return false
      if (scannerFilter !== 'all' && f.scanner_type !== scannerFilter) return false
      return true
    })
  }, [findings, searchQuery, severityFilter, statusFilter, scannerFilter])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="false_positive">False Positive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scannerFilter} onValueChange={setScannerFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Scanner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scanners</SelectItem>
                <SelectItem value="sast">SAST</SelectItem>
                <SelectItem value="sca">SCA</SelectItem>
                <SelectItem value="secret">Secret</SelectItem>
                <SelectItem value="iac">IaC</SelectItem>
                <SelectItem value="container">Container</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Findings list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Findings
            </span>
            <Badge variant="secondary">{filteredFindings.length} results</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredFindings.map((finding) => (
              <div
                key={finding.id}
                className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    <SeverityBadge severity={finding.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {finding.id}
                      </code>
                      <Badge variant="outline" className="text-xs">
                        {SCANNER_TYPE_LABELS[finding.scanner_type]}
                      </Badge>
                      <TriageStatusBadge status={finding.triage_status} />
                    </div>
                    <h4 className="font-medium mb-1">{finding.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {finding.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileCode className="h-3 w-3" />
                        {finding.file_path}:{finding.line_start}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {finding.branches.length} branches
                      </span>
                      {finding.cwe_ids && finding.cwe_ids.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {finding.cwe_ids[0]}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        First seen: {formatTimeAgo(finding.first_detected_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <FindingStatusBadge status={finding.status} />
                    <SLAStatusBadge
                      status={finding.sla_status}
                      daysRemaining={finding.sla_days_remaining}
                    />
                    {finding.assigned_to_name && (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={finding.assigned_to_avatar} />
                          <AvatarFallback className="text-xs">
                            {finding.assigned_to_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {finding.assigned_to_name}
                        </span>
                      </div>
                    )}
                    {finding.comments_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {finding.comments_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredFindings.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No findings match your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Activity Tab
function ActivityTab({ activities }: { activities: ActivityLog[] }) {
  const [actionFilter, setActionFilter] = useState<string>('all')

  const filteredActivities = useMemo(() => {
    if (actionFilter === 'all') return activities
    return activities.filter((a) => {
      if (actionFilter === 'scans') return a.action.startsWith('scan_')
      if (actionFilter === 'findings') return a.action.startsWith('finding_')
      if (actionFilter === 'branches')
        return a.action.startsWith('branch_') || a.action.startsWith('pr_')
      return true
    })
  }, [activities, actionFilter])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={actionFilter} onValueChange={setActionFilter}>
            <TabsList>
              <TabsTrigger value="all">All Activity</TabsTrigger>
              <TabsTrigger value="scans">Scans</TabsTrigger>
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="branches">Branches & PRs</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Activity Timeline
          </CardTitle>
          <CardDescription>{filteredActivities.length} events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

            <div className="space-y-6">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border">
                    <ActivityIcon action={activity.action} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      {activity.actor_type === 'user' && (
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={activity.actor_avatar} />
                          <AvatarFallback className="text-xs">
                            {activity.actor_name[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="font-medium text-sm">{activity.actor_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {ACTIVITY_ACTION_LABELS[activity.action].toLowerCase()}
                      </span>
                      {activity.entity_name && (
                        <span className="text-sm">
                          on <span className="font-medium">{activity.entity_name}</span>
                        </span>
                      )}
                    </div>

                    {/* Changes */}
                    {activity.changes && activity.changes.length > 0 && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
                        {activity.changes.map((change, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-muted-foreground capitalize">
                              {change.field}:
                            </span>
                            <span className="line-through text-red-500">
                              {String(change.old_value || 'none')}
                            </span>
                            <ChevronRight className="h-3 w-3" />
                            <span className="text-green-500">{String(change.new_value)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comment */}
                    {activity.comment && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        &ldquo;{activity.comment}&rdquo;
                      </p>
                    )}

                    {/* Scan summary */}
                    {activity.scan_summary && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {activity.scan_summary.branch}
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {activity.scan_summary.findings_total} findings
                          </span>
                          {activity.scan_summary.findings_new > 0 && (
                            <span className="text-red-500">
                              +{activity.scan_summary.findings_new} new
                            </span>
                          )}
                          {activity.scan_summary.findings_resolved > 0 && (
                            <span className="text-green-500">
                              -{activity.scan_summary.findings_resolved} resolved
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(activity.scan_summary.duration_seconds / 60)}m
                          </span>
                          {activity.scan_summary.quality_gate_passed ? (
                            <Badge variant="outline" className="text-green-500 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-500 border-red-500/20">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PR info */}
                    {activity.pr_info && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 text-sm">
                          <GitPullRequest className="h-4 w-4" />
                          <a
                            href={activity.pr_info.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline"
                          >
                            #{activity.pr_info.number} {activity.pr_info.title}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <code className="bg-muted px-1 rounded">
                            {activity.pr_info.source_branch}
                          </code>
                          <ChevronRight className="h-3 w-3" />
                          <code className="bg-muted px-1 rounded">
                            {activity.pr_info.target_branch}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Settings Tab
function SettingsTab({ repository }: { repository: Repository }) {
  return (
    <div className="space-y-6">
      {/* Scan Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="h-4 w-4" />
            Scan Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Enabled Scanners</h4>
            <div className="flex flex-wrap gap-2">
              {repository.scan_settings.enabled_scanners.map((scanner) => (
                <Badge key={scanner} className="uppercase">
                  {scanner}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              {repository.scan_settings.auto_scan ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Auto Scan</p>
                <p className="text-xs text-muted-foreground">Scan automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {repository.scan_settings.scan_on_push ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Scan on Push</p>
                <p className="text-xs text-muted-foreground">Trigger on commits</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {repository.scan_settings.scan_on_pr ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Scan on PR</p>
                <p className="text-xs text-muted-foreground">Trigger on pull requests</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Branch Patterns</h4>
            <div className="flex flex-wrap gap-2">
              {repository.scan_settings.branch_patterns?.map((pattern) => (
                <code key={pattern} className="text-sm bg-muted px-2 py-1 rounded">
                  {pattern}
                </code>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4" />
            SLA Policy
          </CardTitle>
          <CardDescription>{mockSLAPolicy.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Time to Remediate</TableHead>
                <TableHead>Warning Threshold</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSLAPolicy.rules.map((rule) => (
                <TableRow key={rule.severity}>
                  <TableCell>
                    <SeverityBadge severity={rule.severity} />
                  </TableCell>
                  <TableCell>{rule.days_to_remediate} days</TableCell>
                  <TableCell>{rule.warning_threshold_percent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Security Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {repository.security_features &&
              Object.entries(repository.security_features).map(([key, enabled]) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    enabled ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/30'
                  )}
                >
                  {enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={cn('text-sm', !enabled && 'text-muted-foreground')}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-500">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Can permission={Permission.AssetsWrite}>
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20">
              <div>
                <p className="font-medium">Archive Repository</p>
                <p className="text-sm text-muted-foreground">
                  Archive this repository. It can be restored later.
                </p>
              </div>
              <Button
                variant="outline"
                className="text-red-500 border-red-500/50 hover:bg-red-500/10"
              >
                Archive
              </Button>
            </div>
          </Can>
          <Can permission={Permission.AssetsDelete}>
            <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20">
              <div>
                <p className="font-medium">Delete Repository</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this repository and all associated data.
                </p>
              </div>
              <Button variant="destructive">Delete</Button>
            </div>
          </Can>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// Loading Skeleton Component
// ============================================

function DetailPageSkeleton() {
  return (
    <>
      <Main>
        <div className="mb-6">
          <Skeleton className="h-9 w-40 mb-4" />
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-96 mb-2" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>

        <Skeleton className="h-10 w-[500px] mb-6" />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-16 mt-2" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

// ============================================
// Main Page Component
// ============================================

export default function RepositoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const repositoryId = params.id as string

  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch repository data from API
  const {
    data: repositoryData,
    error: repoError,
    isLoading: repoLoading,
    mutate: mutateRepo,
  } = useRepository(repositoryId)

  // Fetch branches from API only after repository is successfully loaded
  const { data: _branchesData, isLoading: _branchesLoading } = useRepositoryBranches(
    repositoryData ? repositoryId : null
  )

  // Transform API response to RepositoryView
  const repository = useMemo(() => {
    if (!repositoryData) return null
    return transformToRepositoryView(repositoryData as unknown as ApiAssetResponse)
  }, [repositoryData])

  // TODO: Replace with real API when available
  // Currently using mock data for branches, findings, and activities
  const branches = mockBranchDetails
  const findings = mockFindings
  const activities = mockActivities

  // Action handlers
  const handleSync = useCallback(async () => {
    if (!repository) return
    setIsSyncing(true)
    try {
      const response = await fetch(`/api/v1/assets/${repository.id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) {
        throw new Error('Failed to sync repository')
      }
      toast.success('Repository sync initiated')
      mutateRepo()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to sync repository'))
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [repository, mutateRepo])

  const handleScan = useCallback(async () => {
    if (!repository) return
    setIsScanning(true)
    try {
      const response = await fetch(`/api/v1/assets/${repository.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanMode: 'full' }),
      })
      if (!response.ok) {
        throw new Error('Failed to trigger scan')
      }
      toast.success('Scan initiated successfully')
      mutateRepo()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to trigger scan'))
      console.error('Scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }, [repository, mutateRepo])

  const handleDelete = useCallback(async () => {
    if (!repository) return
    if (
      !confirm(
        `Are you sure you want to delete "${repository.name}"? This action cannot be undone.`
      )
    ) {
      return
    }
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/v1/assets/${repository.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete repository')
      }
      toast.success('Repository deleted successfully')
      router.push('/assets/repositories')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete repository'))
      console.error('Delete error:', error)
      setIsDeleting(false)
    }
  }, [repository, router])

  // Loading state
  if (repoLoading) {
    return <DetailPageSkeleton />
  }

  // Error state
  if (repoError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Repository</h2>
          <p className="text-muted-foreground mb-4">
            {repoError.message || 'Failed to load repository data. Please try again.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => mutateRepo()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={() => router.push('/assets/repositories')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Repositories
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!repository) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Repository Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The repository you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push('/assets/repositories')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Repositories
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Main>
        {/* Breadcrumb & Back */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/assets/repositories')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Repositories
          </Button>

          {/* Repository Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border">
                <ProviderIcon provider={repository.scm_provider} className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold">{repository.name}</h1>
                  <Badge
                    variant="outline"
                    className={cn(SCM_PROVIDER_COLORS[repository.scm_provider])}
                  >
                    {SCM_PROVIDER_LABELS[repository.scm_provider]}
                  </Badge>
                  <Badge variant={repository.status === 'active' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[repository.status]}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-2">
                  {repository.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {repository.visibility === 'private' ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Globe className="h-3.5 w-3.5" />
                    )}
                    {repository.visibility}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5" />
                    {repository.default_branch}
                  </span>
                  {repository.primary_language && (
                    <Badge variant="secondary" className="text-xs">
                      {repository.primary_language}
                    </Badge>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Last scan:{' '}
                    {repository.last_scanned_at
                      ? formatTimeAgo(repository.last_scanned_at)
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(repository.repository?.webUrl, '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in {SCM_PROVIDER_LABELS[repository.scm_provider]}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                {isSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
              <Button size="sm" onClick={handleScan} disabled={isScanning}>
                {isScanning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {isScanning ? 'Scanning...' : 'Scan Now'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" disabled={isDeleting}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(repository.repository?.webUrl || '')
                      toast.success('URL copied')
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy URL
                  </DropdownMenuItem>
                  <Can permission={Permission.AssetsDelete}>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500" onClick={handleDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Repository
                    </DropdownMenuItem>
                  </Can>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DetailTab)}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Layers className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="branches" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Branches
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {branches.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="findings" className="gap-2">
              <Shield className="h-4 w-4" />
              Findings
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {findings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <History className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              repository={repository}
              branches={branches}
              findings={findings}
              activities={activities}
            />
          </TabsContent>

          <TabsContent value="branches">
            <BranchesTab branches={branches} repositoryName={repository.name} />
          </TabsContent>

          <TabsContent value="findings">
            <FindingsTab findings={findings} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab activities={activities} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab repository={repository} />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
