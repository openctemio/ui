import {
  GitBranch,
  KeyRound,
  MessageSquare,
  Shield,
  ShieldCheck,
  TicketCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface IntegrationCategoryCard {
  id: string
  title: string
  description: string
  icon: LucideIcon
  href: string
  /**
   * 'Soon' when the target page is a ComingSoonPage. Pinned both ways by
   * src/config/__tests__/sidebar-no-scaffolds.test.ts: a placeholder page needs
   * the badge, and a badge needs a placeholder page.
   */
  badge?: 'Soon'
}

/**
 * The category cards on the Integrations overview: navigation to the pages
 * that own each connect flow. Kept outside the page file so the badge test can
 * read it (an App Router page may only export its component).
 */
export const INTEGRATION_CATEGORIES: IntegrationCategoryCard[] = [
  {
    id: 'scm',
    title: 'SCM connections',
    description: 'Connect GitHub, GitLab, Bitbucket, or Azure DevOps',
    icon: GitBranch,
    href: '/settings/integrations/scm',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Slack, Teams, Telegram, and webhook alerts',
    icon: MessageSquare,
    href: '/settings/integrations/notifications',
  },
  {
    id: 'cicd',
    title: 'CI/CD pipelines',
    description: 'Integrate with Jenkins, GitHub Actions, GitLab CI',
    icon: Workflow,
    href: '/settings/integrations/cicd',
    badge: 'Soon',
  },
  {
    id: 'ticketing',
    title: 'Ticketing systems',
    description: 'Connect Jira, ServiceNow, or Linear',
    icon: TicketCheck,
    href: '/settings/integrations/ticketing',
  },
  {
    id: 'api-keys',
    title: 'API keys',
    description: 'Issue and revoke programmatic access keys',
    icon: KeyRound,
    href: '/settings/api-keys',
  },
  {
    id: 'security',
    title: 'Vulnerability scanners',
    description: 'Connect Tenable (Nessus Pro / Tenable.sc)',
    icon: ShieldCheck,
    href: '/settings/integrations/security',
  },
  {
    id: 'siem',
    title: 'SIEM',
    description: 'Forward security events to Splunk',
    icon: Shield,
    href: '/settings/integrations/siem',
  },
]
