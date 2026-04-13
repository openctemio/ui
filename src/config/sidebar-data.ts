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
  BarChart3,
  Building2,
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
  Bot,
  FileSliders,
  Wrench,
  // New icons for CTEM architecture
  ShieldAlert,
  Package,
  Scale,
  Download,
  // CTEM Phase 1 icons
  TrendingUp,
  AlertTriangle,
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
          url: '/attack-surface',
          icon: Target,
          permission: Permission.AssetsRead,
          module: 'assets',
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
          module: 'assets',
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
        // EXPOSURES (Non-CVE security issues)
        // ----------------------------------------
        {
          title: 'Exposures',
          url: '/exposures',
          icon: AlertTriangle,
          permission: Permission.FindingsRead,
          module: 'exposures',
        },
        // ----------------------------------------
        // CREDENTIAL LEAKS
        // Module: credentials (requires Team+ plan)
        // ----------------------------------------
        {
          title: 'Credential Leaks',
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
              badge: '4',
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
            },
          ],
        },
        // ----------------------------------------
        // COMING SOON - Identities
        // See docs/ROADMAP.md for full feature specs
        // ----------------------------------------
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
          title: 'Threat Intel',
          url: '/threat-intel',
          icon: TrendingUp,
          permission: Permission.VulnerabilitiesRead,
          module: 'threat_intel',
        },
        {
          title: 'Risk Analysis',
          url: '/risk-analysis',
          icon: BarChart3,
          permission: Permission.VulnerabilitiesRead,
          module: 'threat_intel',
        },
        {
          title: 'Business Impact',
          url: '/business-impact',
          icon: Building2,
          permission: Permission.VulnerabilitiesRead,
          module: 'threat_intel',
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
          title: 'Remediation Tasks',
          url: '/remediation',
          icon: ListChecks,
          badge: '24',
          permission: Permission.RemediationRead,
          module: 'remediation',
        },
        {
          title: 'Workflows',
          url: '/workflows',
          icon: Workflow,
          permission: Permission.WorkflowsRead,
          module: 'remediation',
        },
        {
          title: 'Scan Pipelines',
          url: '/pipelines',
          icon: GitMerge,
          permission: Permission.PipelinesRead,
          module: 'scans',
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
              module: 'scans',
            },
            {
              title: 'Template Sources',
              url: '/template-sources',
              icon: FolderGit2,
              permission: Permission.TemplateSourcesRead,
              module: 'scans',
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
          ],
        },
      ],
    },
  ],
}
