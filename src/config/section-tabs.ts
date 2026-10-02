/**
 * Route tabs of the pages that have sub-pages. Each list is used twice: the page
 * renders it with `SectionTabs`, and its sidebar item carries it as `sections`
 * so the command palette can still search each sub-page. The sidebar itself
 * shows ONE row per section (at most two nav levels: group, then item).
 */
import { AlertTriangle, Bug, FileKey, FileWarning, Wrench } from 'lucide-react'
import type { SectionTab } from '@/features/shared/components/section-tabs'

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
