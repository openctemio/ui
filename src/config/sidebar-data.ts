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
  BadgeCheck,
  Target,
  Settings2,
  Radar,
  Container,
  GitBranch,
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
  Boxes,
  Crosshair,
  ClipboardList,
  Bug,
  RotateCcw,
  BookTemplate,
  History,
  Clock,
  Timer,
  Bot,
  FileSliders,
  Wrench,
  // New icons for CTEM architecture
  LayoutGrid,
  Package,
  Scale,
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
  // Pipeline icons
  GitMerge,
  // Template & Secret Store icons
  FolderGit2,
  Lock,
  FileCode2,
  // Attack path icons
  Route,
  Waypoints,
  // CTEM section-header icons (sidebar-07 collapsible group headers)
  Goal,
  Telescope,
  ListOrdered,
  FlaskConical,
  Rocket,
  BarChart3,
  Settings,
  ShieldQuestion,
  Database,
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
      icon: Goal,
      items: [
        {
          title: 'Attack Surface',
          url: '/attack-surface',
          icon: Target,
          permission: Permission.AssetsRead,
          module: 'attack_surface',
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
          module: 'business_units',
        },
        {
          title: 'Crown Jewels',
          url: '/crown-jewels',
          icon: Crown,
          permission: Permission.ScopeRead,
          module: 'crown_jewels',
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
          title: 'Threat Model',
          url: '/threat-model',
          icon: Crosshair,
          permission: Permission.AssetsRead,
          module: 'threat_model',
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
      icon: Telescope,
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
          url: '/assets',
          icon: Container,
          permission: Permission.AssetsRead,
          module: 'assets',
        },
        // The unified, filterable "All Assets" inventory (/assets/all) is reached
        // from a button on the Assets Overview page, so it is intentionally not a
        // separate sidebar entry (it duplicated the item above).
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
          permission: [Permission.FindingsRead, Permission.VulnerabilitiesRead],
          module: 'findings',
          // A collapsible cannot also carry a `url` (NavCollapsible has no url in
          // src/components/types.ts), so the parent page is reached through an
          // Overview child — the same shape Integrations uses below.
          //
          // Only the four children scoped to their own finding type are listed.
          // /exposures/credentials is deliberately absent: it reads
          // useDashboardStats and renders EVERY finding in the tenant under a
          // "Credential Exposures" heading. See docs/nav-coverage.md.
          items: [
            {
              title: 'Overview',
              url: '/exposures',
              icon: AlertTriangle,
            },
            {
              title: 'Vulnerabilities',
              url: '/exposures/vulnerabilities',
              icon: Bug,
            },
            {
              title: 'Secrets',
              url: '/exposures/secrets',
              icon: KeyRound,
            },
            {
              title: 'Code',
              url: '/exposures/code',
              icon: FileWarning,
            },
            {
              title: 'Misconfigurations',
              url: '/exposures/misconfigurations',
              icon: Wrench,
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
          url: '/components',
          icon: Package,
          permission: Permission.ComponentsRead,
          module: 'components',
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
      icon: ListOrdered,
      items: [
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
          title: 'Threat Intel',
          url: '/threat-intel',
          icon: TrendingUp,
          permission: Permission.VulnerabilitiesRead,
          module: 'threat_intel',
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
      icon: FlaskConical,
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
          url: '/controls',
          icon: Shield,
          permission: Permission.CompensatingControlsRead,
          module: 'compensating_controls',
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
      icon: Rocket,
      items: [
        {
          // One nav item; the two related views (Tasks / Solution Families) are
          // presented as in-page <SectionTabs> rather than two near-identical
          // sidebar entries.
          // "Solution Families" (/remediations) is reachable as an in-page
          // SectionTabs tab on this page — not a separate sidebar entry.
          title: 'Remediation',
          url: '/remediation',
          icon: Wrench,
          permission: Permission.RemediationRead,
          module: 'remediation_tasks',
        },
        {
          title: 'SLA Compliance',
          url: '/sla',
          icon: Timer,
          permission: Permission.SLARead,
        },
        {
          title: 'Exceptions',
          url: '/exceptions',
          icon: ShieldQuestion,
          permission: Permission.SuppressionsRead,
          module: 'findings',
        },
        {
          title: 'Workflows',
          url: '/workflows',
          icon: Workflow,
          permission: Permission.WorkflowsRead,
          module: 'workflows',
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
      icon: BarChart3,
      items: [
        {
          title: 'Program Health',
          url: '/insights/program-health',
          icon: Target,
          // Outcome scorecard — always available with dashboard read, no module gate.
          permission: Permission.DashboardRead,
        },
        {
          title: 'Data Quality',
          url: '/insights/data-quality',
          icon: Database,
          // Discovery data-hygiene scorecard — core, no module gate (same as Program Health).
          permission: Permission.DashboardRead,
        },
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
      ],
    },

    // ========================================
    // SETTINGS - System configuration
    // ========================================
    {
      title: 'Settings',
      icon: Settings,
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
            {
              title: 'SLA Policies',
              url: '/settings/sla-policies',
              icon: Timer,
              permission: Permission.SLARead,
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
              // This route renders ComingSoonPage. The badge is what keeps the entry
              // honest: without it the item looks like every other live integration
              // and the click is a dead end.
              badge: 'Soon',
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
              // This route renders ComingSoonPage. The badge is what keeps the entry
              // honest: without it the item looks like every other live integration
              // and the click is a dead end.
              badge: 'Soon',
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
              title: 'Verified Domains',
              url: '/settings/integrations/verified-domains',
              icon: BadgeCheck,
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
