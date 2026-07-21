/**
 * Report feature types. Mirrors the backend report-schedule + executive-summary
 * contracts. See:
 *   api/internal/infra/http/handler/report_schedule_handler.go
 *   api/internal/app/module/dashboard.go (ExecutiveSummary)
 */

export interface Recipient {
  email: string
  name?: string
}

/** Report types the scheduler can actually render (reportschedule.validReportTypes). */
export type ReportType = 'executive_summary' | 'summary' | 'findings'

/**
 * Delivery format. The scheduler renders a finding-summary HTML digest and
 * emails it to recipients — HTML is the only format actually produced today.
 */
export type ReportFormat = 'html'

export interface ReportSchedule {
  id: string
  name: string
  report_type: string
  format: string
  cron_expression: string
  timezone: string
  recipients: Recipient[]
  delivery_channel: string
  is_active: boolean
  last_run_at?: string | null
  last_status?: string
  next_run_at?: string | null
  run_count: number
  created_at: string
}

export interface ReportSchedulesResponse {
  data: ReportSchedule[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface CreateReportScheduleInput {
  name: string
  report_type: ReportType
  format: ReportFormat
  cron_expression: string
  timezone: string
  recipients: Recipient[]
  options?: Record<string, unknown>
}

/** Executive summary metrics (dashboard.ExecutiveSummary). */
export interface ExecutiveSummary {
  period: string
  risk_score_current: number
  risk_score_change: number
  findings_total: number
  findings_resolved_period: number
  findings_new_period: number
  p0_open: number
  p0_resolved_period: number
  p1_open: number
  p1_resolved_period: number
  sla_compliance_pct: number
  sla_breached: number
  mttr_critical_hours: number
  mttr_high_hours: number
  crown_jewels_at_risk: number
  regression_count: number
  regression_rate_pct: number
}
