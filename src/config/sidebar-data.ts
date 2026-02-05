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
    email: 'user@rediver.io',
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
            // External Attack Surface - Internet-facing assets
            {
              title: 'Domains',
              url: '/assets/domains',
              icon: Globe,
              assetModuleKey: 'domains',
            },
            {
              title: 'Certificates',
              url: '/assets/certificates',
              icon: ShieldCheck,
              assetModuleKey: 'certificates',
            },
            {
              title: 'IP Addresses',
              url: '/assets/ip-addresses',
              icon: Target,
              assetModuleKey: 'ip-addresses',
            },
            // Applications - Web, mobile, API services
            {
              title: 'Websites',
              url: '/assets/websites',
              icon: MonitorSmartphone,
              assetModuleKey: 'websites',
            },
            {
              title: 'APIs',
              url: '/assets/apis',
              icon: Zap,
              assetModuleKey: 'apis',
            },
            {
              title: 'Mobile Apps',
              url: '/assets/mobile',
              icon: Smartphone,
              assetModuleKey: 'mobile',
            },
            {
              title: 'Services',
              url: '/assets/services',
              icon: Zap,
              assetModuleKey: 'services',
            },
            // Cloud Infrastructure
            {
              title: 'Cloud Accounts',
              url: '/assets/cloud-accounts',
              icon: Cloud,
              assetModuleKey: 'cloud-accounts',
            },
            {
              title: 'Cloud Resources',
              url: '/assets/cloud',
              icon: Cloud,
              assetModuleKey: 'cloud',
            },
            {
              title: 'Compute',
              url: '/assets/compute',
              icon: Server,
              assetModuleKey: 'compute',
            },
            {
              title: 'Storage',
              url: '/assets/storage',
              icon: Database,
              assetModuleKey: 'storage',
            },
            {
              title: 'Serverless',
              url: '/assets/serverless',
              icon: Zap,
              assetModuleKey: 'serverless',
            },
            // Infrastructure - Servers, containers, networks
            {
              title: 'Hosts',
              url: '/assets/hosts',
              icon: Server,
              assetModuleKey: 'hosts',
            },
            {
              title: 'Kubernetes',
              url: '/assets/containers',
              icon: Boxes,
              assetModuleKey: 'containers',
            },
            {
              title: 'Databases',
              url: '/assets/databases',
              icon: Database,
              assetModuleKey: 'databases',
            },
            {
              title: 'Networks',
              url: '/assets/networks',
              icon: Target,
              assetModuleKey: 'networks',
            },
            // Code & CI/CD
            {
              title: 'Repositories',
              url: '/assets/repositories',
              icon: GitBranch,
              assetModuleKey: 'repositories',
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
          module: 'findings',
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
              badge: '12',
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
          module: 'pentest',
        },
        {
          title: 'Control Testing',
          url: '/control-testing',
          icon: ShieldCheck,
          permission: Permission.PentestRead,
          module: 'pentest',
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
              title: 'Audit Log',
              url: '/settings/audit',
              icon: History,
              // Requires audit:read permission (core feature - no module required)
              permission: Permission.AuditRead,
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
            },
            {
              title: 'Notifications',
              url: '/settings/integrations/notifications',
              icon: Bell,
            },
            {
              title: 'CI/CD',
              url: '/settings/integrations/cicd',
              icon: Workflow,
            },
            {
              title: 'Ticketing',
              url: '/settings/integrations/ticketing',
              icon: ListChecks,
            },
            {
              title: 'SIEM',
              url: '/settings/integrations/siem',
              icon: Shield,
            },
          ],
        },
      ],
    },
  ],
}
