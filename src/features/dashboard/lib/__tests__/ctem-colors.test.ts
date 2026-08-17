import { describe, it, expect } from 'vitest'
import {
  PRIORITY_CHART_COLORS,
  PRIORITY_ORDER,
  coverageState,
  openCountState,
  STATE_STRIPE,
  STATE_TEXT,
} from '../ctem-colors'
import { SEVERITY_CHART_COLORS } from '@/lib/severity-colors'

describe('ctem-colors', () => {
  it('maps priority classes onto the severity hue ramp (single source of truth)', () => {
    expect(PRIORITY_CHART_COLORS.P0).toBe(SEVERITY_CHART_COLORS.critical)
    expect(PRIORITY_CHART_COLORS.P1).toBe(SEVERITY_CHART_COLORS.high)
    expect(PRIORITY_CHART_COLORS.P2).toBe(SEVERITY_CHART_COLORS.medium)
    expect(PRIORITY_CHART_COLORS.P3).toBe(SEVERITY_CHART_COLORS.low)
  })

  it('orders priorities P0..P3', () => {
    expect(PRIORITY_ORDER).toEqual(['P0', 'P1', 'P2', 'P3'])
  })

  it('grades coverage: higher is better', () => {
    expect(coverageState(95)).toBe('good')
    expect(coverageState(80)).toBe('good')
    expect(coverageState(50)).toBe('warn')
    expect(coverageState(0)).toBe('crit')
  })

  it('grades open counts: lower is better, 0 is good', () => {
    expect(openCountState(0)).toBe('good')
    expect(openCountState(2)).toBe('warn')
    expect(openCountState(12)).toBe('crit')
  })

  it('exposes a class token for every health state', () => {
    for (const state of ['good', 'warn', 'crit'] as const) {
      expect(STATE_STRIPE[state]).toBeTruthy()
      expect(STATE_TEXT[state]).toBeTruthy()
    }
  })
})
