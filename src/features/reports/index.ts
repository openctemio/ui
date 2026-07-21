/**
 * Reports feature — recurring emailed digests (report schedules) and the
 * executive-summary CSV export. Wired to backend endpoints that already exist;
 * there is no downloadable-artifact store, so this feature does not fabricate a
 * generated-reports list.
 */
export { ReportSchedulesSection } from './components/report-schedules-section'
export { ExecutiveSummarySection } from './components/executive-summary-section'
export * from './types'
