/**
 * Built-in dashboard templates (RFC-021 Phase-1b).
 *
 * Read-only starter layouts a user copies into a personal dashboard. Each widget
 * references a `widget_type` from WIDGET_REGISTRY; a widget the viewer lacks
 * permission for is dropped when the template is copied/rendered.
 */

import type { DashboardWidget } from './api/dashboards.types'
import { WIDGET_REGISTRY } from './widgets/registry'

export interface DashboardTemplate {
  key: string
  name: string
  description: string
  widgetTypes: string[]
}

/** Lay a template's widget types out in reading order using each widget's default size. */
export function templateLayout(tpl: DashboardTemplate): DashboardWidget[] {
  return tpl.widgetTypes
    .filter((wt) => WIDGET_REGISTRY[wt])
    .map((wt, i) => {
      const def = WIDGET_REGISTRY[wt].defaultSize
      return { widget_type: wt, x: 0, y: i, w: def.w, h: def.h }
    })
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    key: 'executive',
    name: 'Executive',
    description: 'Risk posture at a glance for leadership.',
    widgetTypes: [
      'risk_score',
      'open_findings',
      'sla_compliance',
      'mttr_critical',
      'findings_by_severity',
      'overdue_sla',
    ],
  },
  {
    key: 'soc',
    name: 'SOC / Triage',
    description: 'Work the incoming queue.',
    widgetTypes: [
      'open_findings',
      'findings_by_severity',
      'p0_open',
      'threat_intel',
      'assigned_to_me',
      'overdue_sla',
    ],
  },
  {
    key: 'vm',
    name: 'Vulnerability Management',
    description: 'Run the VM program.',
    widgetTypes: [
      'findings_by_severity',
      'open_findings',
      'scan_coverage',
      'overdue_sla',
      'assets_total',
    ],
  },
  {
    key: 'my-work',
    name: 'My Work',
    description: 'Just what you are responsible for.',
    widgetTypes: ['assigned_to_me', 'my_critical_high', 'my_overdue_sla'],
  },
  {
    key: 'appsec',
    name: 'AppSec / Developer',
    description: 'Your findings and the code-side exposure.',
    widgetTypes: ['assigned_to_me', 'my_critical_high', 'findings_by_severity', 'threat_intel'],
  },
]
