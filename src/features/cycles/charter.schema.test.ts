/**
 * Charter schema/converter tests.
 *
 * The converters are the contract with the API charter JSONB
 * (api/pkg/domain/ctemcycle/entity.go): they must round-trip cleanly and drop
 * empty rows so a stored charter never carries blanks.
 */

import { describe, it, expect } from 'vitest'

import {
  charterToForm,
  formToCharter,
  charterWarnings,
  emptyCharterForm,
} from './charter.schema'
import type { CtemCharter } from './types'

describe('charterToForm', () => {
  it('returns an empty form for null/undefined charter', () => {
    expect(charterToForm(null)).toEqual(emptyCharterForm)
    expect(charterToForm(undefined)).toEqual(emptyCharterForm)
  })

  it('hydrates every playbook field', () => {
    const charter: CtemCharter = {
      business_priorities: ['payments'],
      risk_appetite: 'low',
      in_scope_services: ['checkout'],
      objectives: ['reduce KEV'],
      threat_scenarios: ['ransomware'],
      exclusions: [{ item: 'legacy VPN', reason: 'decommissioned' }],
      success_criteria: [{ name: 'KEV', metric: 'MTTR', target: '< 14d' }],
      escalation_path: 'CISO',
      roles: { sponsor: 'A', operator: 'B', engineering_partner: 'C' },
      timeline: '90 days',
    }
    const form = charterToForm(charter)
    expect(form.threat_scenarios).toEqual(['ransomware'])
    expect(form.exclusions).toEqual([{ item: 'legacy VPN', reason: 'decommissioned' }])
    expect(form.success_criteria).toEqual([{ name: 'KEV', metric: 'MTTR', target: '< 14d' }])
    expect(form.roles).toEqual({ sponsor: 'A', operator: 'B', engineering_partner: 'C' })
    expect(form.escalation_path).toBe('CISO')
    expect(form.timeline).toBe('90 days')
  })
})

describe('formToCharter', () => {
  it('omits empty fields and drops blank rows', () => {
    const form = {
      ...emptyCharterForm,
      threat_scenarios: ['ransomware', '  ', ''],
      objectives: [''],
      exclusions: [
        { item: 'legacy VPN', reason: '' },
        { item: '', reason: '' },
      ],
      success_criteria: [{ name: '', metric: '', target: '' }],
      risk_appetite: '  ',
      roles: { sponsor: 'A', operator: '', engineering_partner: '' },
    }
    const charter = formToCharter(form)
    expect(charter.threat_scenarios).toEqual(['ransomware'])
    expect(charter.objectives).toBeUndefined()
    expect(charter.exclusions).toEqual([{ item: 'legacy VPN', reason: '' }])
    expect(charter.success_criteria).toBeUndefined()
    expect(charter.risk_appetite).toBeUndefined()
    expect(charter.roles).toEqual({ sponsor: 'A', operator: '', engineering_partner: '' })
  })

  it('round-trips a fully populated charter', () => {
    const original: CtemCharter = {
      business_priorities: ['payments'],
      risk_appetite: 'low',
      in_scope_services: ['checkout'],
      objectives: ['reduce KEV'],
      threat_scenarios: ['ransomware'],
      exclusions: [{ item: 'legacy VPN', reason: 'decommissioned' }],
      success_criteria: [{ name: 'KEV', metric: 'MTTR', target: '< 14d' }],
      escalation_path: 'CISO',
      roles: { sponsor: 'A', operator: 'B', engineering_partner: 'C' },
      timeline: '90 days',
    }
    expect(formToCharter(charterToForm(original))).toEqual(original)
  })
})

describe('charterWarnings', () => {
  it('flags a named success criterion that lacks a metric or target', () => {
    const form = {
      ...emptyCharterForm,
      success_criteria: [{ name: 'KEV', metric: '', target: '' }],
    }
    expect(charterWarnings(form)).toHaveLength(1)
  })

  it('does not flag a measurable criterion, nor a blank row', () => {
    const form = {
      ...emptyCharterForm,
      success_criteria: [
        { name: 'KEV', metric: 'MTTR', target: '< 14d' },
        { name: '', metric: '', target: '' },
      ],
    }
    expect(charterWarnings(form)).toHaveLength(0)
  })
})
