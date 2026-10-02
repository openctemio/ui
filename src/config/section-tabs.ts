/**
 * Route tabs of the pages that have sub-pages. Each list is used twice: the page
 * renders it with `SectionTabs`, and its sidebar item carries it as `sections`
 * so the command palette can still search each sub-page. The sidebar itself
 * shows ONE row per section (at most two nav levels: group, then item).
 */
import {
  AlertTriangle,
  Bug,
  Building,
  Building2,
  Crosshair,
  Container,
  Crown,
  FileKey,
  FileWarning,
  FolderKanban,
  History,
  Link2,
  Swords,
  Wrench,
} from 'lucide-react'
import type { SectionTab } from '@/features/shared/components/section-tabs'
import { Permission } from '@/lib/permissions'

/**
 * Exposures: the attack-surface exposure events (Overview) and four views of
 * findings by type. URLs predate the tabs and are unchanged.
 */
export const EXPOSURES_SECTION_TABS: readonly SectionTab[] = [
  { label: 'Overview', href: '/exposures', icon: AlertTriangle },
  { label: 'Vulnerabilities', href: '/exposures/vulnerabilities', icon: Bug },
  // FileKey, not KeyRound: KeyRound reads as the separate Credential leaks
  // module (leaked accounts), while this tab is secrets committed to code.
  { label: 'Secrets', href: '/exposures/secrets', icon: FileKey },
  { label: 'Code weaknesses', href: '/exposures/code', icon: FileWarning },
  { label: 'Misconfigurations', href: '/exposures/misconfigurations', icon: Wrench },
]

/** Remediation: the task list and the solution families it groups findings into. */
export const REMEDIATION_SECTION_TABS: readonly SectionTab[] = [
  { label: 'Tasks', href: '/remediation' },
  { label: 'Solution families', href: '/remediations' },
]

/**
 * Scoping > Business context: the ctem.org Critical Asset Register. Each tab is
 * its own module and keeps its URL; the tab's module and permission are the
 * route guard's (route-permissions.ts), so a tab is shown exactly when its page
 * opens. Render with `GatedSectionTabs`.
 */
export const BUSINESS_CONTEXT_SECTION_TABS: readonly SectionTab[] = [
  {
    label: 'Crown jewels',
    href: '/crown-jewels',
    icon: Crown,
    module: 'crown_jewels',
    permission: Permission.AssetsRead,
  },
  {
    label: 'Services',
    href: '/business-services',
    icon: Building,
    module: 'business_services',
    permission: Permission.BusinessServicesRead,
  },
  {
    label: 'Units',
    href: '/business-units',
    icon: Building2,
    module: 'business_units',
    permission: Permission.AssetsRead,
  },
]

/**
 * Scoping > Threat model: the per-crown-jewel threats and the attacker
 * assumptions they are modelled against. Two modules, one row.
 */
export const THREAT_MODEL_SECTION_TABS: readonly SectionTab[] = [
  {
    label: 'Threats',
    href: '/threat-model',
    icon: Crosshair,
    module: 'threat_model',
    permission: Permission.AssetsRead,
  },
  {
    label: 'Attacker profiles',
    href: '/attacker-profiles',
    icon: Swords,
    module: 'attacker_profiles',
    permission: Permission.AttackerProfilesRead,
  },
]

/**
 * Discovery > Assets: the inventory, the groups that organise it, what changed
 * in it and the relationships detected between assets. URLs predate the tabs
 * and are unchanged; Suggestions is its own module.
 */
export const ASSETS_SECTION_TABS: readonly SectionTab[] = [
  {
    label: 'Inventory',
    href: '/assets',
    icon: Container,
    module: 'assets',
    permission: Permission.AssetsRead,
  },
  {
    label: 'Groups',
    href: '/asset-groups',
    icon: FolderKanban,
    module: 'assets',
    permission: Permission.AssetGroupsRead,
  },
  {
    label: 'What changed',
    href: '/assets/changes',
    icon: History,
    module: 'assets',
    permission: Permission.AssetsRead,
  },
  {
    label: 'Suggestions',
    href: '/relationships/suggestions',
    icon: Link2,
    module: 'relationships',
    permission: Permission.AssetsRead,
  },
]
