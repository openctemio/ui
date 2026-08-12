import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ExposureHero } from '../exposure-hero'
import { FixNextQueue } from '../fix-next-queue'
import { CtemLoop } from '../ctem-loop'
import { AttackPathsCard } from '../attack-paths-card'
import { ThreatIntelCard } from '../threat-intel-card'
import type {
  ExecutiveSummary,
  ExposureChain,
  RiskTrendPoint,
  ThreatIntelStats,
} from '../../../hooks/use-ctem-dashboard'

// Charts pull in recharts via next/dynamic; the numbers under test live outside
// the SVG, so stub the chart layer to keep these deterministic.
vi.mock('@/components/charts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  const Null = () => null
  return {
    LineChart: Passthrough,
    AreaChart: Passthrough,
    BarChart: Passthrough,
    PieChart: Passthrough,
    ResponsiveContainer: Passthrough,
    Line: Null,
    Area: Null,
    Bar: Null,
    Pie: Null,
    Cell: Null,
    XAxis: Null,
    YAxis: Null,
    Tooltip: Null,
    Legend: Null,
    CartesianGrid: Null,
  }
})

const summary: ExecutiveSummary = {
  risk_score_current: 54,
  risk_score_change: 2,
  p0_open: 12,
  p0_resolved_period: 3,
  p1_open: 3,
  sla_compliance_pct: 100,
  sla_breached: 0,
  mttr_critical_hours: 40,
  crown_jewels_at_risk: 0,
  findings_total: 92,
  findings_resolved_period: 10,
  top_risks: [
    {
      title: 'Stripe access token in repo',
      severity: 'high',
      priority_class: 'P2',
      asset_name: 'proofrepo/s.env',
      epss_score: 0.42,
      is_in_kev: false,
    },
  ],
}

const trend: RiskTrendPoint[] = [
  {
    date: '2026-05-01',
    risk_score_avg: 40,
    findings_open: 50,
    sla_compliance_pct: 100,
    p0_open: 2,
    p1_open: 3,
    p2_open: 40,
    p3_open: 30,
  },
  {
    date: '2026-08-01',
    risk_score_avg: 54,
    findings_open: 93,
    sla_compliance_pct: 100,
    p0_open: 12,
    p1_open: 3,
    p2_open: 46,
    p3_open: 32,
  },
]

const chains: ExposureChain[] = [
  {
    entry_point_name: 'public',
    target_name: 'example.com',
    hops: [{ name: 'public', asset_type: 'host' }],
    kev_count: 1,
    score: 52,
    is_crown_jewel: false,
  },
]

describe('ExposureHero', () => {
  it('shows the P0 hero number, KEV chains and a losing-ground trend', () => {
    render(<ExposureHero summary={summary} trend={trend} kevChainCount={1} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(/KEV chains/i)).toBeInTheDocument()
    // p0 rose 2 -> 12 across the window
    expect(screen.getByText(/losing ground/i)).toBeInTheDocument()
    expect(screen.getByText(/3 resolved this period/i)).toBeInTheDocument()
  })

  it('renders a skeleton while loading (no hero number)', () => {
    render(<ExposureHero kevChainCount={0} isLoading />)
    expect(screen.queryByText('12')).not.toBeInTheDocument()
  })
})

describe('FixNextQueue', () => {
  it('ranks chains and top risks by score with KEV chip and Triage link', () => {
    render(<FixNextQueue chains={chains} topRisks={summary.top_risks} />)
    expect(screen.getByText(/example.com — via public/i)).toBeInTheDocument()
    expect(screen.getByText('Stripe access token in repo')).toBeInTheDocument()
    expect(screen.getAllByText('KEV').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Triage/).length).toBe(2)
    // Chain (52) outranks the finding (EPSS 0.42 -> 42)
    expect(screen.getByText('52')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is exploitable', () => {
    render(<FixNextQueue chains={[]} topRisks={[]} />)
    expect(screen.getByText(/Nothing exploitable right now/i)).toBeInTheDocument()
  })
})

describe('CtemLoop', () => {
  it('renders one KPI per CTEM stage', () => {
    render(
      <CtemLoop
        summary={summary}
        scanCoverage={{ coverage_percent: 0, never_scanned: 15, critical_uncovered: 7 }}
        validationCoverage={{ overall_pct: 0, validated: 0, total: 93 }}
        threatIntel={
          {
            epss: { critical_risk_count: 7018 },
            kev: {
              total_entries: 1662,
              past_due_count: 1000,
              ransomware_related_count: 339,
              recently_added_last_30_days: 25,
            },
          } as ThreatIntelStats
        }
      />
    )
    for (const stage of ['Scoping', 'Discovery', 'Prioritize', 'Validate', 'Mobilize']) {
      expect(screen.getByText(stage)).toBeInTheDocument()
    }
    expect(screen.getByText(/7 critical uncovered/i)).toBeInTheDocument()
    expect(screen.getByText(/on track/i)).toBeInTheDocument()
  })
})

describe('AttackPathsCard', () => {
  it('shows the designate-crown-jewels empty state when none are at risk', () => {
    render(
      <AttackPathsCard
        attackPaths={{
          summary: { reachable_assets: 4, critical_reachable: 2, crown_jewels_at_risk: 0 },
        }}
        chains={chains}
      />
    )
    expect(screen.getByText(/No crown jewels designated/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Designate/i })).toBeInTheDocument()
    expect(screen.getByText(/Reachable now/i)).toBeInTheDocument()
  })
})

describe('ThreatIntelCard', () => {
  it('renders the KEV/EPSS stat grid', () => {
    render(
      <ThreatIntelCard
        stats={
          {
            epss: { critical_risk_count: 7018 },
            kev: {
              total_entries: 1662,
              past_due_count: 1000,
              ransomware_related_count: 339,
              recently_added_last_30_days: 25,
            },
          } as ThreatIntelStats
        }
      />
    )
    expect(screen.getByText('1,000')).toBeInTheDocument()
    expect(screen.getByText('7,018')).toBeInTheDocument()
    expect(screen.getByText(/KEV past-due/i)).toBeInTheDocument()
  })
})
