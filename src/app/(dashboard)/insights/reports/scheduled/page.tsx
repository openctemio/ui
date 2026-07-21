import { redirect } from 'next/navigation'

/**
 * Legacy route. The previous "Scheduled Reports" page here was a non-functional
 * stub (hardcoded zeros, a "Coming Soon" card, a disabled action and a
 * fabricated report-type list). Scheduled reports are now handled by the real
 * reports page. Redirect so any stale link/bookmark still resolves.
 */
export default function ScheduledReportsRedirect() {
  redirect('/reports')
}
