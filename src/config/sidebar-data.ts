/**
 * Sidebar Navigation Data
 *
 * Configuration for the application sidebar navigation
 * Aligned with CTEM (Continuous Threat Exposure Management) framework:
 * 1. Scoping - Define attack surface and business context
 * 2. Discovery - Identify assets, vulnerabilities, and exposures
 * 3. Prioritization - Rank risks based on exploitability and impact
 * 4. Validation - Verify threats and test security controls
 * 5. Mobilization - Execute remediation and track progress
 *
 * Note: Features marked as "Soon" are documented in docs/ROADMAP.md
 * and temporarily hidden from navigation.
 */

import {
  LayoutDashboard,
  FolderKanban,
  ClipboardCheck,
  Target,
  Settings2,
  Radar,
  Globe,
  MonitorSmartphone,
  Container,
  GitBranch,
  Cloud,
  KeyRound,
  Building2,
  Crown,
  Swords,
  ShieldCheck,
  ListChecks,
  Workflow,
  FileWarning,
  FileText,
  Users,
  Puzzle,
  Command,
  AudioWaveform,
  Building,
  Zap,
  Server,
  Boxes,
  Database,
  Smartphone,
  Crosshair,
  ClipboardList,
  Bug,
  RotateCcw,
  BookTemplate,
  History,
  Clock,
  Bot,
  FileSliders,
  Wrench,
  // New icons for CTEM architecture
  LayoutGrid,
  ShieldAlert,
  Package,
  Scale,
  Download,
  // CTEM Phase 1 icons
  TrendingUp,
  AlertTriangle,
  Link2,
  // Access Control icons
  FolderKey,
  Key,
  // Integration icons
  Shield,
  Bell,
  MessageSquare,
  // Pipeline icons
  GitMerge,
  // Template & Secret Store icons
  FolderGit2,
  Lock,
  FileCode2,
  // Attack path icons
  Route,
  Waypoints,
} from 'lucide-react'
import { type SidebarData } from '@/components/types'
import { Permission, Role } from '@/lib/permissions'

// Re-export Permission and Role for convenience
export { Permission, Role }

export const sidebarData: SidebarData = {
  user: {
    name: 'User',
    email: 'user@openctem.io',
    avatar: '',
  },
  teams: [
    {
      name: 'Security Platform',
      logo: Command,
      plan: 'Enterprise',
    },
    {
      name: 'Security Ops',
      logo: AudioWaveform,
      plan: 'Team',
    },
  ],
  navGroups: [
    // ========================================
    // DASHBOARD - Overview & Quick Access
    // ========================================
    {
      title: '',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
          permission: Permission.DashboardRead,
        },
      ],
    },

    // ========================================
    // PHASE 1: SCOPING
    // Define attack surface, business context, and objectives
    // Module: assets (core - available in all plans)
    // ========================================
    {
      title: 'Scoping',
      items: [
        {
          title: 'Attack Surface',
          icon: Target,
          permission: Permission.AssetsRead,
          module: 'attack_surface',
          items: [
            {
              title: 'Overview',
              url: '/attack-surface',
              icon: Target,
            },
            {
              title: 'External',
              url: '/attack-surface/external',
              icon: Globe,
            },
            {
              title: 'Internal',
              url: '/attack-surface/internal',
              icon: Server,
            },
            {
              title: 'Cloud',
              url: '/attack-surface/cloud',
              icon: Cloud,
            },
          ],
        },
        {
          title: 'Asset Groups',
          url: '/asset-groups',
          icon: FolderKanban,
          permission: Permission.AssetGroupsRead,
          module: 'assets',
        },
        {
          title: 'Scope Config',
          url: '/scope-config',
          icon: Settings2,
          permission: Permission.ScopeRead,
          module: 'scope_config',
        },
        {
          title: 'Business Services',
          url: '/business-services',
          icon: Building,
          permission: Permission.BusinessServicesRead,
          module: 'business_services',
        },
        {
          title: 'Business Units',
          url: '/business-units',
          icon: Building2,
          permission: Permission.ScopeRead,
          module: 'scope_config',
        },
        {
          title: 'Crown Jewels',
          url: '/crown-jewels',
          icon: Crown,
          permission: Permission.ScopeRead,
          module: 'scope_config',
        },
        {
          title: 'CTEM Cycles',
          url: '/cycles',
          icon: RotateCcw,
          permission: Permission.CTEMCyclesRead,
          module: 'ctem_cycles',
        },
        {
          title: 'Attacker Profiles',
          url: '/attacker-profiles',
          icon: Swords,
          permission: Permission.AttackerProfilesRead,
          module: 'attacker_profiles',
        },
        {
          title: 'Relationships',
          url: '/relationships/suggestions',
          icon: Link2,
          permission: Permission.AssetsRead,
          module: 'relationships',
        },
        {
          title: 'Compliance',
          url: '/compliance',
          icon: ClipboardCheck,
          permission: Permission.ComplianceFrameworksRead,
          module: 'compliance',
        },
      ],
    },

    // ========================================
    // PHASE 2: DISCOVERY
    // Identify assets, vulnerabilities, misconfigurations, and exposures
    // Three pillars: Assets, Components (SBOM), Identities
    // ========================================
    {
      title: 'Discovery',
      items: [
        {
          title: 'Scans',
          url: '/scans',
          icon: Radar,
          permission: Permission.ScansRead,
          module: 'scans',
        },
        // ----------------------------------------
        // ASSET INVENTORY
        // Module: assets (core - available in all plans)
        // Organized by CTEM categories for comprehensive attack surface visibility
        // ----------------------------------------
        {
          title: 'Asset Inventory',
          icon: Container,
          permission: Permission.AssetsRead,
          module: 'assets',
          items: [
            // Overview - Entry point with asset statistics (always shown)
            {
              title: 'Overview',
              url: '/assets',
              icon: Container,
            },
            // Duplicate review is surfaced as a card on the Overview page
            // (/assets) rather than a standing nav item — it's an occasional
            // workflow, not a top-level asset category. Route still lives at
            // /assets/duplicates.
            // External Attack Surface
            {
              title: 'Domains',
              url: '/assets/domains',
              icon: Globe,
              subModuleKey: 'domains',
            },
            {
              title: 'Certificates',
              url: '/assets/certificates',
              icon: ShieldCheck,
              subModuleKey: 'certificates',
            },
            {
              title: 'IP Addresses',
              url: '/assets/ip-addresses',
              icon: Target,
              subModuleKey: 'ip-addresses',
            },
            // Applications
            {
              title: 'Websites',
              url: '/assets/websites',
              icon: MonitorSmartphone,
              subModuleKey: 'websites',
            },
            {
              title: 'APIs',
              url: '/assets/apis',
              icon: Zap,
              subModuleKey: 'apis',
            },
            {
              title: 'Mobile Apps',
              url: '/assets/mobile',
              icon: Smartphone,
              subModuleKey: 'mobile',
            },
            {
              title: 'Services',
              url: '/assets/services',
              icon: Zap,
              subModuleKey: 'services',
            },
            // Infrastructure
            {
              title: 'Hosts',
              url: '/assets/hosts',
              icon: Server,
              subModuleKey: 'hosts',
            },
            {
              title: 'Containers & K8s',
              url: '/assets/containers',
              icon: Boxes,
              subModuleKey: 'containers',
            },
            {
              title: 'Network Devices',
              url: '/assets/networks',
              icon: Target,
              subModuleKey: 'networks',
            },
            // Data
            {
              title: 'Databases',
              url: '/assets/databases',
              icon: Database,
              subModuleKey: 'databases',
            },
            {
              title: 'Storage',
              url: '/assets/storage',
              icon: Database,
              subModuleKey: 'storage',
            },
            // Cloud
            {
              title: 'Cloud Accounts',
              url: '/assets/cloud-accounts',
              icon: Cloud,
              subModuleKey: 'cloud-accounts',
            },
            // Identity
            {
              title: 'Identity & Access',
              url: '/assets/identity',
              icon: KeyRound,
              subModuleKey: 'identity',
            },
            // Code & CI/CD
            {
              title: 'Repositories',
              url: '/assets/repositories',
              icon: GitBranch,
              subModuleKey: 'repositories',
            },
          ],
        },
        // ----------------------------------------
        // EXPOSURES (CVEs + non-CVE security issues)
        // ----------------------------------------
        // Note: route guard at `/exposures/**` checks the `findings` module.
        // Backend keeps a separate `exposures` module record (migration 000004)
        // but no route enforces it, so binding sidebar to it caused a divergence.
        {
          title: 'Exposures',
          icon: AlertTriangle,
          // Group is visible if user has EITHER findings:read OR vulnerabilities:read.
          // Sub-items self-gate by their own permission.
          permission: [Permission.FindingsRead, Permission.VulnerabilitiesRead],
          module: 'findings',
          items: [
            {
              title: 'Overview',
              url: '/exposures',
              icon: AlertTriangle,
            },
            {
              // The CTEM "Active CVEs" view lives at /exposures/vulnerabilities.
              // It is the default tab — distinct from /exposures (event-style
              // exposures) and from the global CVE catalog browser.
              title: 'Vulnerabilities',
              url: '/exposures/vulnerabilities',
              icon: ShieldAlert,
              permission: Permission.VulnerabilitiesRead,
            },
            {
              title: 'Misconfigurations',
              url: '/exposures/misconfigurations',
              icon: Settings2,
              permission: Permission.FindingsRead,
            },
            {
              title: 'Secrets',
              url: '/exposures/secrets',
              icon: KeyRound,
              permission: Permission.FindingsRead,
            },
            {
              title: 'Code',
              url: '/exposures/code',
              icon: FileCode2,
              permission: Permission.FindingsRead,
            },
            {
              title: 'Credentials',
              url: '/exposures/credentials',
              icon: KeyRound,
              permission: Permission.FindingsRead,
            },
          ],
        },
        // ----------------------------------------
        // CREDENTIAL LEAKS
        // Module: credentials (requires Team+ plan)
        // ----------------------------------------
        {
          title: 'Credentials',
          url: '/credentials',
          icon: KeyRound,
          // Badge is now dynamic - fetched from API via useDynamicBadges hook
          permission: Permission.CredentialsRead,
          module: 'credentials',
        },
        // ----------------------------------------
        // SOFTWARE COMPONENTS (SBOM)
        // Module: components (requires Team+ plan)
        // ----------------------------------------
        {
          title: 'Components',
          icon: Package,
          permission: Permission.ComponentsRead,
          module: 'components',
          items: [
            {
              title: 'Overview',
              url: '/components',
              icon: Package,
            },
            {
              title: 'All Components',
              url: '/components/all',
              icon: Package,
            },
            {
              title: 'Vulnerable',
              url: '/components/vulnerable',
              icon: ShieldAlert,
            },
            {
              title: 'Ecosystems',
              url: '/components/ecosystems',
              icon: Boxes,
            },
            {
              title: 'Licenses',
              url: '/components/licenses',
              icon: Scale,
            },
            {
              title: 'SBOM Export',
              url: '/components/sbom-export',
              icon: Download,
              // Same pattern as MITRE Coverage — own module post-000161.
              module: 'sbom_export',
            },
          ],
        },
        // ----------------------------------------
        // IDENTITY DISCOVERY
        // ----------------------------------------
        {
          title: 'Identity',
          icon: KeyRound,
          permission: Permission.AssetsRead,
          items: [
            {
              title: 'Privileged Access',
              url: '/identity/privileged',
              icon: Crown,
            },
            {
              title: 'Identity Risks',
              url: '/identity/risks',
              icon: AlertTriangle,
            },
            {
              title: 'Shadow IT',
              url: '/identity/shadow-it',
              icon: Radar,
            },
          ],
        },
        {
          title: 'CI/CD Runners',
          url: '/runners',
          icon: Server,
          permission: Permission.ScansRead,
        },
      ],
    },

    // ========================================
    // PHASE 3: PRIORITIZATION
    // Rank risks based on exploitability, impact, and threat intelligence
    // Module: threat_intel (requires Business+ plan)
    // ========================================
    {
      title: 'Prioritization',
      items: [
        {
          title: 'Risk Overview',
          url: '/overview',
          icon: LayoutGrid,
          permission: Permission.VulnerabilitiesRead,
        },
        {
          title: 'Exposure Chains',
          url: '/exposure-chains',
          icon: Route,
          permission: Permission.AssetsRead,
          module: 'attack_surface',
        },
        {
          title: 'Attack Paths',
          url: '/attack-paths',
          icon: Waypoints,
          permission: Permission.AssetsRead,
          module: 'attack_surface',
        },
        {
          title: 'Attack Path Visualization',
          url: '/attack-path-visualization',
          icon: Waypoints,
          permission: Permission.AssetsRead,
        },
        {
          title: 'Threat Intel',
          icon: TrendingUp,
          permission: Permission.VulnerabilitiesRead,
          module: 'threat_intel',
          items: [
            {
              title: 'Overview',
              url: '/threat-intel',
              icon: TrendingUp,
            },
            {
              title: 'Active Threats',
              url: '/threats/active',
              icon: AlertTriangle,
            },
            {
              title: 'Exploitability',
              url: '/threats/exploitability',
              icon: ShieldAlert,
            },
            {
              title: 'Feeds',
              url: '/threats/feeds',
              icon: Radar,
            },
          ],
        },
        {
          title: 'Trending',
          url: '/trending',
          icon: TrendingUp,
          permission: Permission.VulnerabilitiesRead,
        },
        {
          title: 'Scoring',
          url: '/scoring',
          icon: Scale,
          permission: Permission.VulnerabilitiesRead,
        },
        {
          title: 'Business Impact',
          url: '/business-impact',
          icon: Building2,
          permission: Permission.VulnerabilitiesRead,
          module: 'business_impact',
        },
        {
          title: 'Priority Rules',
          url: '/settings/priority-rules',
          icon: Settings2,
          permission: Permission.PriorityRulesRead,
          module: 'priority_rules',
        },
      ],
    },

    // ========================================
    // PHASE 4: VALIDATION
    // Verify threats and test security controls effectiveness
    // Module: pentest (requires Business+ plan)
    // ========================================
    {
      title: 'Validation',
      items: [
        {
          title: 'Penetration Testing',
          icon: Crosshair,
          permission: Permission.PentestRead,
          module: 'pentest',
          items: [
            {
              title: 'Campaigns',
              url: '/pentest/campaigns',
              icon: ClipboardList,
            },
            {
              title: 'Findings',
              url: '/pentest/findings',
              icon: Bug,
            },
            {
              title: 'Retests',
              url: '/pentest/retests',
              icon: RotateCcw,
            },
            {
              title: 'Reports',
              url: '/pentest/reports',
              icon: FileText,
            },
            {
              title: 'Templates',
              url: '/pentest/templates',
              icon: BookTemplate,
            },
            {
              title: 'MITRE Coverage',
              url: '/pentest/mitre-coverage',
              icon: LayoutGrid,
              // Bound to its own module (post-000161) — without this, the
              // entry inherits parent's `pentest` module and stays visible
              // even when `mitre_coverage` is disabled, only to dump the
              // user on a "Feature Not Available" screen after click.
              module: 'mitre_coverage',
            },
          ],
        },
        {
          title: 'Attack Simulation',
          url: '/attack-simulation',
          icon: Swords,
          permission: Permission.PentestRead,
          module: 'attack_simulation', // Separate module — not yet implemented
        },
        {
          title: 'Control Testing',
          url: '/control-testing',
          icon: ShieldCheck,
          permission: Permission.PentestRead,
          module: 'control_testing', // Separate module — not yet implemented
        },
        {
          title: 'Compensating Controls',
          icon: Shield,
          permission: Permission.CompensatingControlsRead,
          module: 'compensating_controls',
          items: [
            {
              title: 'Overview',
              url: '/controls',
              icon: Shield,
            },
            {
              title: 'Controls',
              url: '/controls/list',
              icon: ListChecks,
            },
            {
              title: 'Gaps',
              url: '/controls/gaps',
              icon: AlertTriangle,
            },
            {
              title: 'Effectiveness',
              url: '/controls/effectiveness',
              icon: ShieldCheck,
            },
          ],
        },
        {
          title: 'Response',
          icon: ShieldAlert,
          permission: Permission.PentestRead,
          items: [
            {
              title: 'Detection Rules',
              url: '/response/detection',
              icon: Radar,
            },
            {
              title: 'Playbooks',
              url: '/response/playbooks',
              icon: BookTemplate,
            },
            {
              title: 'Response Time',
              url: '/response/time',
              icon: Clock,
            },
          ],
        },
        {
          title: 'Simulation',
          icon: Swords,
          permission: Permission.PentestRead,
          items: [
            {
              title: 'Campaigns',
              url: '/simulation/campaigns',
              icon: ClipboardList,
            },
            {
              title: 'Scenarios',
              url: '/simulation/scenarios',
              icon: FileSliders,
            },
            {
              title: 'Results',
              url: '/simulation/results',
              icon: FileText,
            },
          ],
        },
      ],
    },

    // ========================================
    // PHASE 5: MOBILIZATION
    // Execute remediation and track progress
    // Module: remediation (requires Business+ plan)
    // ========================================
    {
      title: 'Mobilization',
      items: [
        {
          // One nav item; the two related views (Tasks / Solution Families) are
          // presented as in-page <SectionTabs> rather than two near-identical
          // sidebar entries.
          title: 'Remediation',
          url: '/remediation',
          icon: Wrench,
          permission: Permission.RemediationRead,
          module: 'remediation_tasks',
        },
        {
          // Solution Families — bulk-resolve a remediation group;
          // distinct from /remediation (task board).
          title: 'Remediation Groups',
          url: '/remediations',
          icon: Boxes,
          permission: Permission.RemediationRead,
          module: 'remediation_tasks',
        },
        {
          title: 'Collaboration',
          icon: Users,
          permission: Permission.RemediationRead,
          items: [
            {
              title: 'Assignments',
              url: '/collaboration/assignments',
              icon: Users,
            },
            {
              title: 'Comments',
              url: '/collaboration/comments',
              icon: MessageSquare,
            },
            {
              title: 'Tickets',
              url: '/collaboration/tickets',
              icon: ListChecks,
            },
          ],
        },
        {
          title: 'Exceptions',
          icon: FileWarning,
          permission: Permission.RemediationRead,
          items: [
            {
              title: 'Pending',
              url: '/exceptions/pending',
              icon: Clock,
            },
            {
              title: 'Accepted',
              url: '/exceptions/accepted',
              icon: ShieldCheck,
            },
            {
              title: 'False Positives',
              url: '/exceptions/false-positives',
              icon: Bug,
            },
          ],
        },
        {
          title: 'Workflows',
          icon: Workflow,
          permission: Permission.WorkflowsRead,
          module: 'workflows',
          items: [
            {
              title: 'Overview',
              url: '/workflows',
              icon: Workflow,
            },
            {
              title: 'Active',
              url: '/workflows/active',
              icon: Zap,
            },
            {
              title: 'Automations',
              url: '/workflows/automations',
              icon: Bot,
            },
            {
              title: 'Templates',
              url: '/workflows/templates',
              icon: BookTemplate,
            },
          ],
        },
        {
          title: 'Progress',
          url: '/progress',
          icon: TrendingUp,
          permission: Permission.RemediationRead,
        },
        {
          title: 'SLA',
          url: '/sla',
          icon: Clock,
          permission: Permission.SLARead,
        },
        {
          title: 'Scan Pipelines',
          url: '/pipelines',
          icon: GitMerge,
          permission: Permission.PipelinesRead,
          module: 'scan_pipelines',
        },
      ],
    },

    // ========================================
    // INSIGHTS - Cross-cutting analytics and reporting
    // ========================================
    {
      title: 'Insights',
      items: [
        {
          title: 'Executive Summary',
          url: '/insights/executive',
          icon: TrendingUp,
          permission: Permission.DashboardRead,
          module: 'executive_summary',
        },
        {
          title: 'CTEM Maturity',
          url: '/insights/ctem-maturity',
          icon: ShieldCheck,
          permission: Permission.DashboardRead,
          module: 'ctem_maturity',
        },
        {
          title: 'Findings',
          url: '/findings',
          icon: FileWarning,
          // Badge is dynamically fetched from dashboard stats - see useDynamicBadges hook
          // Approvals accessible via button in findings page (not sidebar - keeps sidebar lean)
          permission: Permission.FindingsRead,
          module: 'findings',
        },
        {
          title: 'Reports',
          url: '/reports',
          icon: FileText,
          permission: Permission.ReportsRead,
          module: 'reports',
        },
        {
          title: 'Finding Insights',
          url: '/insights/findings',
          icon: FileWarning,
          permission: Permission.FindingsRead,
        },
        {
          title: 'Analytics',
          icon: LayoutGrid,
          permission: Permission.DashboardRead,
          items: [
            {
              title: 'Coverage',
              url: '/insights/analytics/coverage',
              icon: LayoutGrid,
            },
            {
              title: 'MTTR',
              url: '/insights/analytics/mttr',
              icon: Clock,
            },
            {
              title: 'Performance',
              url: '/insights/analytics/performance',
              icon: Zap,
            },
            {
              title: 'Trends',
              url: '/insights/analytics/trends',
              icon: TrendingUp,
            },
          ],
        },
        {
          title: 'Report Center',
          icon: FileText,
          permission: Permission.ReportsRead,
          items: [
            {
              title: 'Executive',
              url: '/insights/reports/executive',
              icon: FileText,
            },
            {
              title: 'Technical',
              url: '/insights/reports/technical',
              icon: FileCode2,
            },
            {
              title: 'Compliance',
              url: '/insights/reports/compliance',
              icon: ClipboardCheck,
              permission: Permission.ComplianceReportsRead,
              module: 'compliance',
            },
            {
              title: 'Scheduled',
              url: '/insights/reports/scheduled',
              icon: Clock,
            },
          ],
        },
      ],
    },

    // ========================================
    // SETTINGS - System configuration
    // ========================================
    {
      title: 'Settings',
      items: [
        {
          title: 'Scanning',
          icon: Radar,
          permission: Permission.ScansRead,
          module: 'scans',
          items: [
            {
              title: 'Agents',
              url: '/agents',
              icon: Bot,
              permission: Permission.AgentsRead,
              module: 'scans', // Agents are required to run scans, so bundle with scans module
            },
            {
              title: 'Profiles',
              url: '/scan-profiles',
              icon: FileSliders,
              permission: Permission.ScanProfilesRead,
              module: 'scans',
            },
            {
              title: 'Tools',
              url: '/tools',
              icon: Wrench,
              permission: Permission.ToolsRead,
              module: 'scans',
            },
            {
              title: 'Capabilities',
              url: '/capabilities',
              icon: Zap,
              permission: Permission.ToolsRead,
              module: 'scans',
            },
            {
              title: 'Scanner Templates',
              url: '/scanner-templates',
              icon: FileCode2,
              permission: Permission.ScannerTemplatesRead,
              module: 'scanner_templates',
            },
            {
              title: 'Template Sources',
              url: '/template-sources',
              icon: FolderGit2,
              permission: Permission.TemplateSourcesRead,
              module: 'template_sources',
            },
            {
              title: 'Secret Store',
              url: '/secret-store',
              icon: Lock,
              permission: Permission.SecretStoreRead,
              module: 'scans',
            },
          ],
        },
        {
          title: 'Organization',
          icon: Building,
          permission: Permission.TeamRead,
          items: [
            {
              title: 'General',
              url: '/settings/tenant',
              icon: Building,
              // Requires team:update permission to modify tenant settings
              permission: Permission.TeamUpdate,
            },
            {
              title: 'Members',
              url: '/settings/users',
              icon: Users,
              permission: Permission.MembersRead,
            },
            {
              title: 'Roles',
              url: '/settings/roles',
              icon: Key,
              // Requires roles:read permission (RBAC-based access)
              permission: Permission.RolesRead,
            },
            {
              title: 'Teams',
              url: '/settings/access-control/groups',
              icon: FolderKey,
              // Requires groups:read permission (RBAC-based access)
              permission: Permission.GroupsRead,
            },
            {
              title: 'Assignment Rules',
              url: '/settings/access-control/assignment-rules',
              icon: GitBranch,
              permission: Permission.AssignmentRulesRead,
            },
            {
              title: 'Audit Log',
              url: '/settings/audit',
              icon: History,
              // Requires audit:read permission (core feature - no module required)
              permission: Permission.AuditRead,
            },
            {
              title: 'Risk Scoring',
              url: '/settings/scoring',
              icon: Scale,
              // Requires team:update permission (admin-level configuration)
              permission: Permission.TeamUpdate,
              module: 'risk_scoring',
            },
            {
              title: 'Asset Lifecycle',
              url: '/settings/asset-lifecycle',
              icon: Clock,
              // Admin-level config: worker transitions asset status without
              // a human in the loop, so keep this gated to team:update.
              permission: Permission.TeamUpdate,
            },
            {
              title: 'Modules',
              url: '/settings/modules',
              icon: Boxes,
              // Requires team:update permission (admin-level configuration)
              permission: Permission.TeamUpdate,
            },
            {
              title: 'Pentest',
              url: '/settings/pentest',
              icon: Crosshair,
              permission: Permission.TeamUpdate,
              module: 'pentest',
            },
          ],
        },
        {
          title: 'Integrations',
          icon: Puzzle,
          // Integrations management requires integrations:read permission and integrations module
          // RBAC-based access - no minRole restriction
          permission: Permission.IntegrationsRead,
          module: 'integrations',
          items: [
            {
              title: 'Overview',
              url: '/settings/integrations',
              icon: Puzzle,
            },
            {
              title: 'SCMs',
              url: '/settings/integrations/scm',
              icon: GitBranch,
              subModuleKey: 'scm',
            },
            {
              title: 'Notifications',
              url: '/settings/integrations/notifications',
              icon: Bell,
              subModuleKey: 'notifications',
            },
            {
              title: 'CI/CD',
              url: '/settings/integrations/cicd',
              icon: Workflow,
              subModuleKey: 'pipelines_int',
            },
            {
              title: 'Ticketing',
              url: '/settings/integrations/ticketing',
              icon: ListChecks,
              subModuleKey: 'ticketing',
            },
            {
              title: 'SIEM',
              url: '/settings/integrations/siem',
              icon: Shield,
              subModuleKey: 'siem',
            },
            {
              title: 'SCIM Provisioning',
              url: '/settings/integrations/scim-tokens',
              icon: Users,
              subModuleKey: 'scim',
            },
            {
              title: 'SAML SSO',
              url: '/settings/integrations/saml',
              icon: ShieldCheck,
            },
            {
              title: 'AI Access (MCP)',
              url: '/settings/integrations/mcp',
              icon: Bot,
            },
          ],
        },
      ],
    },
  ],
}
