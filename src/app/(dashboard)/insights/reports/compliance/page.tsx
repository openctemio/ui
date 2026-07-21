import { redirect } from 'next/navigation'

/**
 * Legacy route. The previous "Compliance Reports" page here was largely a stub
 * (hardcoded zero/N-A stats, a "Coming Soon" card and disabled actions). The
 * real compliance experience — frameworks, controls and assessments — lives at
 * /compliance. Redirect so any stale link/bookmark still resolves.
 */
export default function ComplianceReportsRedirect() {
  redirect('/compliance')
}
