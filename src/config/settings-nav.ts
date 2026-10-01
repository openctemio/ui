/**
 * Settings navigation: the one source of truth for the settings rail, the
 * /settings landing page and the Settings section of the command palette (⌘K).
 *
 * Routes under /settings and /account (plus every item's own URL) render the
 * settings shell: the left sidebar swaps its content for this list, two levels
 * deep (group, then item), with a way back to the app. The main sidebar keeps a
 * single "Settings" link.
 *
 * Rules (src/config/__tests__/settings-nav.test.ts):
 * - every url has a page; no page is a scaffold;
 * - `permission` / `module` equal what the route guard enforces for the url,
 *   and personal items (/account) carry neither;
 * - a "Soon" badge if and only if the page is a ComingSoonPage;
 * - 2 to 8 items per group; titles in sentence case;
 * - every title, group and description has en and vi strings.
 *
 * Design: openctemio/ui Settings IA research (2026-10-01). The groups follow
 * the target tree; some items still point at their old URLs until their pages
 * move (each move ships with a 308 in src/config/legacy-routes.ts).
 */
import {
  Activity,
  Bell,
  Bot,
  Boxes,
  Building,
  Clock,
  Crosshair,
  FileCode2,
  FileSliders,
  FolderGit2,
  FolderKey,
  GitBranch,
  History,
  Key,
  KeyRound,
  ListChecks,
  Lock,
  MessageSquare,
  Puzzle,
  Scale,
  Settings2,
  Shield,
  ShieldCheck,
  Timer,
  User,
  UserCog,
  Users,
  Workflow,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Permission } from '@/lib/permissions'

export interface SettingsNavItem {
  /** Stable id. i18n keys: `settings.item.<id>` (title), `settings.desc.<id>`. */
  id: string
  /** English title, sentence case. */
  title: string
  /** One line: what this page configures. Shown on the landing page, searched by the filter. */
  description: string
  url: string
  icon: LucideIcon
  /** Permission the route guard requires. Omitted only for the user's own pages. */
  permission?: string
  /** Tenant module the route guard requires. */
  module?: string
  /** Sub-module of `module` that must be enabled (integration categories). */
  subModuleKey?: string
  /** 'Soon' when the page is a ComingSoonPage. */
  badge?: 'Soon'
  /** Extra words the rail filter and ⌘K match on. */
  keywords?: string[]
}

export interface SettingsNavGroup {
  /** i18n key: `settings.group.<id>`. */
  id: string
  title: string
  items: SettingsNavItem[]
}

export const settingsNav: SettingsNavGroup[] = [
  {
    id: 'account',
    title: 'My account',
    items: [
      {
        id: 'profile',
        title: 'Profile',
        description: 'Your name, email and avatar.',
        url: '/account',
        icon: User,
        keywords: ['name', 'avatar', 'me'],
      },
      {
        id: 'account-security',
        title: 'Security',
        description: 'Password, two-factor authentication and active sessions.',
        url: '/account/security',
        icon: Shield,
        keywords: ['password', '2fa', 'mfa', 'totp', 'sessions'],
      },
      {
        id: 'preferences',
        title: 'Preferences',
        description: 'Theme, language, time zone and date format.',
        url: '/account/preferences',
        icon: Settings2,
        keywords: ['theme', 'dark mode', 'language', 'timezone'],
      },
      {
        id: 'my-notifications',
        title: 'Notifications',
        description: 'Which notifications you receive, and how.',
        url: '/settings/notifications',
        icon: Bell,
        keywords: ['email', 'digest', 'alerts', 'mute'],
      },
      {
        id: 'activity',
        title: 'Activity',
        description: 'Your own recent sign-ins and actions.',
        url: '/account/activity',
        icon: Activity,
        keywords: ['history', 'sign-ins'],
      },
    ],
  },
  {
    id: 'organization',
    title: 'Organization',
    items: [
      {
        id: 'org-general',
        title: 'General',
        description: 'Organization name, branding, localization, security and storage.',
        url: '/settings/tenant',
        icon: Building,
        permission: Permission.TeamUpdate,
        keywords: ['tenant', 'branding', 'logo', 'timezone', 'storage', 's3'],
      },
      {
        id: 'modules',
        title: 'Modules',
        description: 'Turn product modules on or off for this organization.',
        url: '/settings/modules',
        icon: Boxes,
        permission: Permission.TeamUpdate,
        keywords: ['features', 'plan', 'license', 'enable', 'disable'],
      },
      {
        id: 'audit-log',
        title: 'Audit log',
        description: 'Who did what, and when, across the organization.',
        url: '/settings/audit',
        icon: History,
        permission: Permission.AuditRead,
        keywords: ['audit trail', 'events', 'compliance'],
      },
    ],
  },
  {
    id: 'access',
    title: 'Access',
    items: [
      {
        id: 'members',
        title: 'Members',
        description: 'People in the organization, their roles and invitations.',
        url: '/settings/users',
        icon: Users,
        permission: Permission.MembersRead,
        keywords: ['users', 'invite', 'people'],
      },
      {
        id: 'teams',
        title: 'Teams',
        description: 'Groups of members and the assets they can see.',
        url: '/settings/access-control/groups',
        icon: FolderKey,
        permission: Permission.GroupsRead,
        keywords: ['groups', 'data scope'],
      },
      {
        id: 'assignment-rules',
        title: 'Assignment rules',
        description: 'Rules that assign assets to teams automatically.',
        url: '/settings/access-control/assignment-rules',
        icon: GitBranch,
        permission: Permission.AssignmentRulesRead,
        keywords: ['ownership', 'routing', 'teams'],
      },
      {
        id: 'roles',
        title: 'Roles',
        description: 'Custom roles and the permissions they grant.',
        url: '/settings/roles',
        icon: Key,
        permission: Permission.RolesRead,
        keywords: ['rbac', 'permissions'],
      },
      {
        id: 'scim',
        title: 'Directory sync (SCIM)',
        description: 'Provision members from your identity provider.',
        url: '/settings/integrations/scim-tokens',
        icon: UserCog,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        keywords: ['scim', 'provisioning', 'okta', 'entra', 'azure ad', 'directory'],
      },
      {
        id: 'api-keys',
        title: 'API keys',
        description: 'Keys for scripts and tools that call the API.',
        url: '/settings/integrations/api-keys',
        icon: KeyRound,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        keywords: ['token', 'programmatic', 'automation'],
      },
      {
        id: 'mcp',
        title: 'AI access (MCP)',
        description: 'Let AI assistants read your data over MCP.',
        url: '/settings/integrations/mcp',
        icon: Bot,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        keywords: ['mcp', 'claude', 'llm', 'assistant'],
      },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    items: [
      {
        id: 'risk-scoring',
        title: 'Risk scoring',
        description: 'How asset risk scores are weighted.',
        url: '/settings/scoring',
        icon: Scale,
        permission: Permission.TeamUpdate,
        module: 'risk_scoring',
        keywords: ['score', 'weights', 'presets'],
      },
      {
        id: 'sla-policies',
        title: 'SLA policies',
        description: 'Remediation deadlines per severity.',
        url: '/settings/sla-policies',
        icon: Timer,
        permission: Permission.SLARead,
        module: 'sla',
        keywords: ['sla', 'deadline', 'due date'],
      },
      {
        id: 'asset-lifecycle',
        title: 'Asset lifecycle',
        description: 'When stale assets are retired automatically.',
        url: '/settings/asset-lifecycle',
        icon: Clock,
        permission: Permission.TeamUpdate,
        keywords: ['stale', 'retire', 'archive'],
      },
      {
        id: 'pentest-methodology',
        title: 'Pentest methodology',
        description: 'Campaign types and testing methodologies.',
        url: '/settings/pentest',
        icon: Crosshair,
        permission: Permission.PentestWrite,
        module: 'pentest',
        keywords: ['pentest', 'campaign types', 'methodology'],
      },
    ],
  },
  {
    id: 'scanning',
    title: 'Scanning',
    items: [
      {
        id: 'scan-profiles',
        title: 'Scan profiles',
        description: 'Reusable scan configurations: tools, intensity and duration.',
        url: '/scan-profiles',
        icon: FileSliders,
        permission: Permission.ScanProfilesRead,
        module: 'scans',
        keywords: ['profiles', 'scan config'],
      },
      {
        id: 'scanner-templates',
        title: 'Scanner templates',
        description: 'Custom Nuclei, Semgrep and Gitleaks templates.',
        url: '/scanner-templates',
        icon: FileCode2,
        permission: Permission.ScannerTemplatesRead,
        module: 'scanner_templates',
        keywords: ['nuclei', 'semgrep', 'gitleaks', 'rules'],
      },
      {
        id: 'template-sources',
        title: 'Template sources',
        description: 'Git, S3 and HTTP sources that keep templates in sync.',
        url: '/template-sources',
        icon: FolderGit2,
        permission: Permission.TemplateSourcesRead,
        module: 'template_sources',
        keywords: ['git', 's3', 'sync'],
      },
      {
        id: 'source-credentials',
        title: 'Source credentials',
        description: 'Encrypted credentials that template sources use to fetch.',
        url: '/secret-store',
        icon: Lock,
        permission: Permission.SecretStoreRead,
        module: 'scans',
        keywords: ['secret store', 'secrets', 'tokens', 'git token'],
      },
      {
        id: 'tools',
        title: 'Tools',
        description: 'The scanners that sensors can run.',
        url: '/tools',
        icon: Wrench,
        permission: Permission.ToolsRead,
        module: 'scans',
        keywords: ['scanners', 'tool registry'],
      },
      {
        id: 'capabilities',
        title: 'Capabilities',
        description: 'The capability taxonomy that tools are matched on.',
        url: '/capabilities',
        icon: Zap,
        permission: Permission.ToolsRead,
        module: 'scans',
        keywords: ['taxonomy'],
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    items: [
      {
        id: 'all-integrations',
        title: 'All integrations',
        description: 'Every connection and its status.',
        url: '/settings/integrations',
        icon: Puzzle,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        keywords: ['connections', 'catalog'],
      },
      {
        id: 'source-control',
        title: 'Source control',
        description: 'GitHub, GitLab, Bitbucket and Azure DevOps.',
        url: '/settings/integrations/scm',
        icon: GitBranch,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        subModuleKey: 'scm',
        keywords: ['scm', 'github', 'gitlab', 'bitbucket', 'azure devops'],
      },
      {
        id: 'vulnerability-scanners',
        title: 'Vulnerability scanners',
        description: 'Tenable Nessus Pro and Tenable.sc connectors.',
        url: '/settings/integrations/security',
        icon: ShieldCheck,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        subModuleKey: 'scanners',
        keywords: ['tenable', 'nessus', 'import'],
      },
      {
        id: 'ticketing',
        title: 'Ticketing',
        description: 'Jira and other ticketing systems.',
        url: '/settings/integrations/ticketing',
        icon: ListChecks,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        subModuleKey: 'ticketing',
        keywords: ['jira', 'servicenow', 'tickets'],
      },
      {
        id: 'notification-channels',
        title: 'Notification channels',
        description: 'Slack, Teams, Telegram and webhook alerts for the organization.',
        url: '/settings/integrations/notifications',
        icon: MessageSquare,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        subModuleKey: 'notifications',
        keywords: ['slack', 'teams', 'telegram', 'webhook', 'outbox'],
      },
      {
        id: 'siem',
        title: 'SIEM',
        description: 'Forward security events to Splunk.',
        url: '/settings/integrations/siem',
        icon: Shield,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        subModuleKey: 'siem',
        keywords: ['splunk', 'hec', 'events'],
      },
      {
        id: 'cicd',
        title: 'CI/CD',
        description: 'Run scans in your pipelines and gate deployments.',
        url: '/settings/integrations/cicd',
        icon: Workflow,
        permission: Permission.IntegrationsRead,
        module: 'integrations',
        subModuleKey: 'pipelines_int',
        badge: 'Soon',
        keywords: ['pipelines', 'github actions', 'gitlab ci', 'jenkins'],
      },
    ],
  },
]

/** Every item, in rail order. */
export const settingsNavItems: SettingsNavItem[] = settingsNav.flatMap((g) => g.items)

/**
 * Routes under /settings that keep the app sidebar: Priority rules is a CTEM
 * working object in Prioritization (its URL moves out of /settings later), and
 * creating a new organization is onboarding, not configuration.
 */
const APP_SHELL_UNDER_SETTINGS = ['/settings/priority-rules', '/settings/tenant/create']

function underPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

/** Whether `pathname` renders the settings shell instead of the app sidebar. */
export function isSettingsShellPath(pathname: string): boolean {
  if (APP_SHELL_UNDER_SETTINGS.some((p) => underPath(pathname, p))) return false
  if (underPath(pathname, '/settings') || underPath(pathname, '/account')) return true
  return settingsNavItems.some((item) => underPath(pathname, item.url))
}

/** The rail item for `pathname`: the longest item url it sits under. */
export function activeSettingsItem(
  pathname: string,
  items: readonly SettingsNavItem[] = settingsNavItems
): SettingsNavItem | undefined {
  return items
    .filter((item) => underPath(pathname, item.url))
    .sort((a, b) => b.url.length - a.url.length)[0]
}

/** Case- and accent-insensitive match of a filter query against an item. */
export function matchesSettingsQuery(
  item: SettingsNavItem,
  query: string,
  labels: { title: string; description: string; group: string }
): boolean {
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const q = fold(query.trim())
  if (!q) return true
  const hay = fold(
    [labels.title, labels.description, labels.group, item.title, ...(item.keywords ?? [])].join(' ')
  )
  return q.split(/\s+/).every((word) => hay.includes(word))
}
