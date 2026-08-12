import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dashboard from '../page'

// Chart layer stubbed — recharts/next-dynamic is irrelevant to the page structure.
vi.mock('@/components/charts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  const Null = () => null
  return {
    LineChart: Pass,
    AreaChart: Pass,
    BarChart: Pass,
    PieChart: Pass,
    ResponsiveContainer: Pass,
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

vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't1', name: 'ORG' } }),
}))

vi.mock('@/lib/permissions', () => ({
  Can: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Permission: {
    ScansWrite: 'scans:write',
    FindingsRead: 'findings:read',
    RemediationRead: 'remediation:read',
    ReportsRead: 'reports:read',
    DashboardRead: 'dashboard:read',
  },
}))

// Maturity module disabled so the gated section is absent.
vi.mock('@/features/integrations/api/use-tenant-modules', () => ({
  useModuleEnabled: () => false,
}))

const emptyStats = {
  assets: { total: 0, byType: {}, byStatus: {}, riskScore: 0 },
  findings: { total: 0, bySeverity: {}, byStatus: {}, overdue: 0, averageCvss: 0 },
  repositories: { total: 0, withFindings: 0 },
  recentActivity: [],
  findingTrend: [],
}
vi.mock('@/features/dashboard', () => ({
  useDashboardStats: () => ({ stats: emptyStats, isLoading: false, error: null, mutate: vi.fn() }),
}))

const summary = {
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
  top_risks: [],
}
const trend = [
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
const threatIntel = {
  epss: { critical_risk_count: 7018 },
  kev: {
    total_entries: 1662,
    past_due_count: 1000,
    ransomware_related_count: 339,
    recently_added_last_30_days: 25,
  },
}
vi.mock('@/features/dashboard/hooks/use-ctem-dashboard', () => ({
  useRiskTrend: () => ({ data: trend, isLoading: false }),
  useExecutiveSummary: () => ({ data: summary, isLoading: false }),
  useThreatIntelStats: () => ({ data: threatIntel, isLoading: false }),
  useExposureChains: () => ({
    data: {
      chains: [
        {
          entry_point_name: 'public',
          target_name: 'example.com',
          hops: [{ name: 'public', asset_type: 'host' }],
          kev_count: 1,
          score: 52,
          is_crown_jewel: false,
        },
      ],
    },
    isLoading: false,
  }),
  useAttackPaths: () => ({
    data: { summary: { reachable_assets: 4, critical_reachable: 2, crown_jewels_at_risk: 0 } },
    isLoading: false,
  }),
  useScanCoverage: () => ({
    data: { coverage_percent: 0, never_scanned: 15, critical_uncovered: 7 },
    isLoading: false,
  }),
  useValidationCoverage: () => ({
    data: { overall_pct: 0, validated: 0, total: 93 },
    isLoading: false,
  }),
  useCtemMaturityTrend: () => ({ data: undefined, isLoading: false }),
}))

describe('CTEM Dashboard page', () => {
  it('renders the action-first CTEM story sections and keeps the header action + analyst detail', () => {
    render(<Dashboard />)

    // Header + single primary action
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Run scan')).toBeInTheDocument()

    // CTEM story
    expect(screen.getByText('Active exposure')).toBeInTheDocument()
    expect(screen.getByText('Fix next')).toBeInTheDocument()
    expect(screen.getByText(/The CTEM loop/i)).toBeInTheDocument()
    expect(screen.getByText('Priority classes over time')).toBeInTheDocument()
    expect(screen.getByText(/Attack paths/i)).toBeInTheDocument()
    expect(screen.getByText('Threat intel context')).toBeInTheDocument()
    expect(screen.getByText('Coverage & hygiene')).toBeInTheDocument()

    // Retained analyst charts
    expect(screen.getByText(/Analyst detail/i)).toBeInTheDocument()
    expect(screen.getByText('Findings trend')).toBeInTheDocument()
    expect(screen.getByText('Severity distribution')).toBeInTheDocument()
    expect(screen.getByText('Asset distribution')).toBeInTheDocument()
    expect(screen.getByText('Recent activity')).toBeInTheDocument()
  })
})
