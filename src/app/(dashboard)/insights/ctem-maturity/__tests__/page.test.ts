import { describe, expect, test } from 'vitest'
import { deriveInvariants, scoreMaturity } from '../page'

// Shape loose-copied from the page to avoid re-importing private types.
type ExecSummary = Parameters<typeof deriveInvariants>[0]
type AuditVerify = Parameters<typeof deriveInvariants>[1]

const baseSummary: NonNullable<ExecSummary> = {
  period: 'last 30 days',
  risk_score_current: 70,
  risk_score_change: -2,
  findings_total: 100,
  findings_resolved: 20,
  findings_new: 15,
  p0_open: 3,
  p0_resolved: 5,
  p1_open: 10,
  p1_resolved: 8,
  sla_compliance_pct: 95,
  sla_breached: 2,
  mttr_critical_hours: 12,
  mttr_high_hours: 36,
  crown_jewels_at_risk: 1,
  regression_count: 3,
  regression_rate_pct: 2.5,
}

const okAudit: NonNullable<AuditVerify> = {
  ok: true,
  entries_verified: 1_234,
}

describe('deriveInvariants', () => {
  test('returns unknown status when no signals are available', () => {
    const cards = deriveInvariants(undefined, undefined)
    for (const card of cards) {
      if (card.id === 'O2') continue // static: rules ship in the repo
      expect(card.status).toBe('unknown')
    }
  })

  test('F3 is green when SLA compliance ≥ 90', () => {
    const cards = deriveInvariants({ ...baseSummary, sla_compliance_pct: 91 }, okAudit)
    const f3 = cards.find((c) => c.id === 'F3')
    expect(f3?.status).toBe('green')
  })

  test('F3 is amber between 70 and 90', () => {
    const cards = deriveInvariants({ ...baseSummary, sla_compliance_pct: 75 }, okAudit)
    const f3 = cards.find((c) => c.id === 'F3')
    expect(f3?.status).toBe('amber')
  })

  test('F3 is red below 70', () => {
    const cards = deriveInvariants({ ...baseSummary, sla_compliance_pct: 60 }, okAudit)
    const f3 = cards.find((c) => c.id === 'F3')
    expect(f3?.status).toBe('red')
  })

  test('F4 is red when regression rate ≥ 15 (fixes not sticking)', () => {
    const cards = deriveInvariants({ ...baseSummary, regression_rate_pct: 20 }, okAudit)
    const f4 = cards.find((c) => c.id === 'F4')
    expect(f4?.status).toBe('red')
  })

  test('B4 is amber when no breaches happened — we cannot confirm the pipe is live', () => {
    const cards = deriveInvariants({ ...baseSummary, sla_breached: 0 }, okAudit)
    const b4 = cards.find((c) => c.id === 'B4')
    expect(b4?.status).toBe('amber')
  })

  test('B5 turns red on a hash-chain break', () => {
    const cards = deriveInvariants(baseSummary, {
      ok: false,
      entries_verified: 100,
      break_at_entry_id: 'audit-42',
      break_reason: 'prev_hash mismatch',
    })
    const b5 = cards.find((c) => c.id === 'B5')
    expect(b5?.status).toBe('red')
    expect(b5?.detail).toContain('audit-42')
  })

  test('B6 is amber when no reopens — cannot prove correlator is live', () => {
    const cards = deriveInvariants({ ...baseSummary, regression_count: 0 }, okAudit)
    const b6 = cards.find((c) => c.id === 'B6')
    expect(b6?.status).toBe('amber')
  })

  test('B6 is green when correlator reopened at least one finding', () => {
    const cards = deriveInvariants({ ...baseSummary, regression_count: 1 }, okAudit)
    const b6 = cards.find((c) => c.id === 'B6')
    expect(b6?.status).toBe('green')
  })
})

describe('scoreMaturity', () => {
  test('scores 100 when every reporting edge is green', () => {
    const cards = deriveInvariants(baseSummary, okAudit).filter((c) => c.status === 'green')
    const { score } = scoreMaturity(cards)
    expect(score).toBe(100)
  })

  test('unknown cards do not move the denominator', () => {
    const { score, denom } = scoreMaturity(deriveInvariants(undefined, undefined))
    // Only O2 (static green) reports — everything else is unknown.
    expect(denom).toBe(1)
    expect(score).toBe(100)
  })

  test('amber counts as half a point', () => {
    // Craft a minimal scenario: 1 green + 1 amber → 75
    const cards = [
      {
        id: 'X',
        name: 'x',
        category: 'feedback' as const,
        description: '',
        status: 'green' as const,
        detail: '',
        icon: () => null,
      },
      {
        id: 'Y',
        name: 'y',
        category: 'feedback' as const,
        description: '',
        status: 'amber' as const,
        detail: '',
        icon: () => null,
      },
    ]
    const { score } = scoreMaturity(cards)
    expect(score).toBe(75)
  })

  test('empty (all unknown) yields score 0 / denom 0', () => {
    const { score, denom } = scoreMaturity([])
    expect(score).toBe(0)
    expect(denom).toBe(0)
  })
})
