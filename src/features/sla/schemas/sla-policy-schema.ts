import { z } from 'zod'

/**
 * Validation for the SLA policy form.
 *
 * Bounds mirror the API validator (CreateSLAPolicyRequest in sla_handler.go):
 * name 1..100, description <=500, each day window a positive int 1..365,
 * warning threshold 0..100. Day windows are additionally required to be
 * non-decreasing from critical -> info: a tighter remediation deadline for a
 * more severe finding is the whole point of an SLA, so critical must not be
 * given more days than high, and so on.
 */

const dayField = z
  .number()
  .int('Whole days only')
  .min(1, 'At least 1 day')
  .max(365, 'At most 365 days')

export const slaPolicySchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'At most 100 characters'),
    description: z.string().trim().max(500, 'At most 500 characters').optional(),
    is_default: z.boolean(),
    critical_days: dayField,
    high_days: dayField,
    medium_days: dayField,
    low_days: dayField,
    info_days: dayField,
    warning_threshold_pct: z
      .number()
      .int('Whole percent only')
      .min(0, 'At least 0')
      .max(100, 'At most 100'),
    escalation_enabled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // Non-decreasing windows: critical <= high <= medium <= low <= info.
    const order: [keyof typeof v, keyof typeof v, string][] = [
      ['critical_days', 'high_days', 'Critical must be remediated no later than High'],
      ['high_days', 'medium_days', 'High must be remediated no later than Medium'],
      ['medium_days', 'low_days', 'Medium must be remediated no later than Low'],
      ['low_days', 'info_days', 'Low must be remediated no later than Info'],
    ]
    for (const [tighter, looser, message] of order) {
      if ((v[tighter] as number) > (v[looser] as number)) {
        ctx.addIssue({ code: 'custom', message, path: [tighter] })
      }
    }
  })

/**
 * Form shape. Declared explicitly rather than via z.infer so the react-hook-form
 * resolver's input/output generics line up (mirrors the scan-profile schema).
 */
export interface SlaPolicyFormData {
  name: string
  description?: string
  is_default: boolean
  critical_days: number
  high_days: number
  medium_days: number
  low_days: number
  info_days: number
  warning_threshold_pct: number
  escalation_enabled: boolean
}

/** Sensible starting point for a new policy (mirrors the backend defaults). */
export const DEFAULT_SLA_FORM: SlaPolicyFormData = {
  name: '',
  description: '',
  is_default: false,
  critical_days: 2,
  high_days: 15,
  medium_days: 30,
  low_days: 60,
  info_days: 90,
  warning_threshold_pct: 80,
  escalation_enabled: false,
}
