/**
 * Customizable dashboards (RFC-021 Phase-1b).
 *
 * Types mirror the api `/me/dashboards` contract: a dashboard is a name + a JSON
 * widget layout, self-scoped to the current user.
 */

export interface DashboardWidget {
  widget_type: string
  x: number
  y: number
  w: number
  h: number
  config?: Record<string, unknown>
}

export interface Dashboard {
  id: string
  name: string
  is_default: boolean
  layout: DashboardWidget[]
  created_at?: string
  updated_at?: string
}

export interface DashboardListResponse {
  data: Dashboard[]
}

export interface CreateDashboardInput {
  name: string
  layout: DashboardWidget[]
}

export interface UpdateDashboardInput {
  name: string
  layout: DashboardWidget[]
}
