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
  ClipboardCheck,
  Target,
  Settings2,
  Radar,
  Container,
  UserRoundX,
  Building2,
  Crown,
  Swords,
  ShieldCheck,
  Workflow,
  FileWarning,
  FileText,
  Command,
  AudioWaveform,
  Crosshair,
  ClipboardList,
  RotateCcw,
  Timer,
  RadioTower,
  Wrench,
  // New icons for CTEM architecture
  LayoutGrid,
  Package,
  // CTEM Phase 1 icons
  TrendingUp,
  AlertTriangle,
  Fingerprint,
  // Access Control icons
  // Integration icons
  Shield,
  // Pipeline icons
  GitMerge,
  // Template & Secret Store icons
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
  ShieldQuestion,
  Database,
  Fence,
} from 'lucide-react'
import { type SidebarData } from '@/components/types'
import { Permission, Role } from '@/lib/permissions'
import {
  ASSETS_SECTION_TABS,
  BUSINESS_CONTEXT_SECTION_TABS,
  EXPOSURES_SECTION_TABS,
  REMEDIATION_SECTION_TABS,
  THREAT_MODEL_SECTION_TABS,
} from './section-tabs'

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
        {
          title: 'My Work',
          url: '/my-work',
          icon: ClipboardCheck,
          permission: Permission.FindingsRead,
        },
        // The central work object — one click from anywhere, next to the views
        // built on it (Dashboard, My Work), not buried under Insights.
        {
          title: 'Findings',
          url: '/findings',
          icon: FileWarning,
          // Badge is dynamically fetched from dashboard stats - see useDynamicBadges hook
          // Approvals accessible via button in findings page (not sidebar - keeps sidebar lean)
          permission: Permission.FindingsRead,
          module: 'findings',
        },
      ],
    },

    // ========================================
    // PHASE 1: SCOPING
    // What the program decides: what matters, how far the boundary goes, what
    // threats it assumes, and the cycle that binds them. One row per ctem.org
    // scoping artifact (docs/ui/scoping-ia-2026-10.md); what Discovery found
    // (attack surface, groups, relationships) lives in Discovery, and
    // framework reporting (Compliance) in Insights.
    // ========================================
    {
      title: 'Scoping',
      icon: Goal,
      cluster: 'cycle',
      items: [
        {
          // The program anchor: charter, scope snapshot, outcome. First,
          // because every other Scoping object exists to fill a cycle.
          title: 'Cycles',
          url: '/cycles',
          icon: RotateCcw,
          permission: Permission.CTEMCyclesRead,
          module: 'ctem_cycles',
        },
        {
          // The Critical Asset Register: crown jewels, the services they
          // serve, the units that own them. Three modules behind one row; the
          // row shows while any tab is open to the user and links to the
          // first such tab (BUSINESS_CONTEXT_SECTION_TABS carries the gates).
          title: 'Business context',
          url: '/crown-jewels',
          icon: Crown,
          sections: BUSINESS_CONTEXT_SECTION_TABS,
        },
        {
          // Was "Scope Config": in-scope targets and the exclusions scans
          // enforce. Its old Schedules tab never ran; Scans owns scheduling.
          title: 'Boundaries',
          url: '/scope-config',
          icon: Fence,
          permission: Permission.ScopeRead,
          module: 'scope_config',
        },
        {
          // Threats per crown jewel, and the attacker profiles they are
          // modelled against (THREAT_MODEL_SECTION_TABS, two modules).
          title: 'Threat model',
          url: '/threat-model',
          icon: Crosshair,
          sections: THREAT_MODEL_SECTION_TABS,
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
      cluster: 'cycle',
      items: [
        {
          title: 'Scans',
          url: '/scans',
          icon: Radar,
          permission: Permission.ScansRead,
          module: 'scans',
        },
        // Sensors are a fleet operators open daily (offline sensors, keys,
        // zones), not a preference, so they sit next to Scans rather than in
        // Settings, as in Tenable VM (left nav > Sensors) and Rapid7 (Data
        // Collection Management).
        {
          title: 'Sensors',
          url: '/sensors',
          icon: RadioTower,
          permission: Permission.SensorsRead,
          module: 'sensors',
        },
        // What is exposed, summarised from the inventory below (moved from
        // Scoping: it is a Discovery output, not a scoping decision).
        {
          title: 'Attack surface',
          url: '/attack-surface',
          icon: Target,
          permission: Permission.AssetsRead,
          module: 'attack_surface',
        },
        // ----------------------------------------
        // ASSETS: one row for the inventory and what organises it. Its views
        // are in-page route tabs (ASSETS_SECTION_TABS): Inventory | Groups |
        // What changed | Suggestions. What changed is the delta of the
        // inventory (fed by the same scans); groups organise it into scan
        // targets and RBAC scopes; relationship suggestions curate the asset
        // graph. The row has no gate of its own: each tab carries its module
        // (Suggestions is `relationships`), and the row shows while any tab is.
        // ----------------------------------------
        {
          title: 'Assets',
          url: '/assets',
          icon: Container,
          sections: ASSETS_SECTION_TABS,
        },
        // /assets opens on the full, filterable list; the category cards are a
        // view switch on the same page (?view=categories). /assets/all redirects.
        // ----------------------------------------
        // EXPOSURES (CVEs + non-CVE security issues)
        // ----------------------------------------
        // The API gates /api/v1/exposures on the `exposures` module
        // (RequireModule(ModuleExposures)), so the sidebar binds the same
        // module: turning the Exposures toggle off now hides the nav AND gates
        // the API consistently. `exposures` ships active/default-on, so tenants
        // with no override keep the group — only an explicit disable hides it.
        {
          // One row for the whole section, active on every /exposures/* route.
          // Its five views (Overview, Vulnerabilities, Secrets, Code weaknesses,
          // Misconfigurations) are in-page route tabs (EXPOSURES_SECTION_TABS),
          // the same pattern as Remediation: the four type pages are one stats
          // dashboard filtered by finding source, and the lists themselves live
          // in /findings, so they do not earn a third nav level.
          // /exposures/credentials is deliberately absent: it reads
          // useDashboardStats and renders EVERY finding in the tenant under a
          // "Credential Exposures" heading. See docs/nav-coverage.md.
          title: 'Exposures',
          url: '/exposures',
          icon: AlertTriangle,
          // Visible if user has EITHER findings:read OR vulnerabilities:read.
          permission: [Permission.FindingsRead, Permission.VulnerabilitiesRead],
          module: 'exposures',
          sections: EXPOSURES_SECTION_TABS,
        },
        // ----------------------------------------
        // CREDENTIAL LEAKS
        // Module: credentials (requires Team+ plan)
        // ----------------------------------------
        {
          // "Credential leaks", not "Credentials": leaked accounts and tokens
          // from breaches and the dark web — distinct from the Secrets tab of
          // Exposures (secrets committed to code), so a distinct icon too.
          title: 'Credential leaks',
          url: '/credentials',
          icon: UserRoundX,
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
      cluster: 'cycle',
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
          // IOC catalogue — bound to its own `iocs` module (not the parent's
          // threat_intel) so the ModuleIOCs toggle gates this page end-to-end.
          // permission threat_intel:read matches the backend on /api/v1/iocs.
          title: 'Indicators (IOCs)',
          url: '/threat-intel/iocs',
          icon: Fingerprint,
          permission: Permission.ThreatIntelRead,
          module: 'iocs',
        },
        {
          // Detect & Respond — tenant-wide IOC match feed showing runtime
          // detections that fired and which findings auto-reopened. Same `iocs`
          // module so the toggle gates it end-to-end.
          title: 'Detections',
          url: '/threat-intel/detections',
          icon: Radar,
          permission: Permission.ThreatIntelRead,
          module: 'iocs',
        },
        {
          title: 'Business Impact',
          url: '/business-impact',
          icon: Building2,
          permission: Permission.VulnerabilitiesRead,
          module: 'business_impact',
        },
        {
          // Compensating controls lower a finding's priority, so they sit with
          // the other prioritization levers (was under Validation).
          title: 'Compensating Controls',
          url: '/controls',
          icon: Shield,
          permission: Permission.CompensatingControlsRead,
          module: 'compensating_controls',
        },
        {
          title: 'Priority Rules',
          url: '/priority-rules',
          icon: Settings2,
          permission: Permission.PriorityRulesRead,
          module: 'priority_rules',
        },
      ],
    },

    // ========================================
    // PHASE 4: VALIDATION
    // Prove that fixes and controls work. Campaign-first and flat (two levels:
    // group, then item): a campaign's findings, retests and report are tabs of
    // its page, not separate entries.
    // ========================================
    {
      title: 'Validation',
      icon: FlaskConical,
      cluster: 'cycle',
      items: [
        {
          // Coverage KPI (findings:read) plus per-module sections, each shown
          // only when its module is on.
          title: 'Overview',
          url: '/validation',
          icon: LayoutDashboard,
          permission: Permission.FindingsRead,
        },
        {
          title: 'Pentest campaigns',
          url: '/pentest/campaigns',
          icon: ClipboardList,
          permission: Permission.PentestRead,
          module: 'pentest',
        },
        {
          title: 'Attack simulation',
          url: '/attack-simulation',
          icon: Swords,
          permission: Permission.PentestRead,
          module: 'attack_simulation',
        },
        {
          title: 'Control testing',
          url: '/control-testing',
          icon: ShieldCheck,
          permission: Permission.PentestRead,
          module: 'control_testing',
        },
        {
          title: 'Retest queue',
          url: '/validation/retests',
          icon: RotateCcw,
          permission: Permission.PentestRead,
          module: 'pentest',
        },
        {
          // Its own module (post-000161), so turning mitre_coverage off hides
          // it rather than leading to "Feature Not Available".
          title: 'ATT&CK coverage',
          url: '/validation/attack-coverage',
          icon: LayoutGrid,
          permission: Permission.PentestRead,
          module: 'mitre_coverage',
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
      cluster: 'cycle',
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
          sections: REMEDIATION_SECTION_TABS,
        },
        {
          title: 'SLA Compliance',
          url: '/sla',
          icon: Timer,
          permission: Permission.SLARead,
          module: 'sla',
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
          title: 'Reports',
          url: '/reports',
          icon: FileText,
          permission: Permission.ReportsRead,
          module: 'reports',
        },
        {
          // Framework control assessment is governance reporting, not a CTEM
          // stage (moved from Scoping).
          title: 'Compliance',
          url: '/compliance',
          icon: ClipboardCheck,
          permission: Permission.ComplianceFrameworksRead,
          module: 'compliance',
        },
      ],
    },

    // Settings and Help are not nav groups: they are pinned in the sidebar
    // footer (src/components/layout/sidebar-footer-links.tsx). Every settings
    // page lives in the settings shell (src/config/settings-nav.ts).
  ],
}
