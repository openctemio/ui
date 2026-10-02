/**
 * Scoping overview: readiness rules (pure), the page (one summary call, module
 * rows hidden, each row links to the page that fixes it), and the dashboard
 * loop tile that used to say "designate" with nine crown jewels designated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { readinessRows, readinessScore, visibleReadiness } from '../readiness'
import type { ScopingSummary } from '../api'
import { ScopingOverview } from '../components/scoping-overview'
import { CtemLoop } from '@/features/dashboard/components/ctem/ctem-loop'
import { AttackPathsCard } from '@/features/dashboard/components/ctem/attack-paths-card'

const api = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@/lib/api/client', () => api)
vi.mock('@/context/tenant-provider', () => ({ useTenant: () => ({ currentTenant: { id: 't1' } }) }))

let modules: string[] = []
vi.mock('@/lib/permissions', async (orig) => {
  const actual = await orig<typeof import('@/lib/permissions')>()
  return {
    ...actual,
    usePermissions: () => ({ can: () => true }),
    useNavItemAccess:
      () =>
      ({ module }: { module?: string }) =>
        !module || modules.includes(module),
  }
})

/** Live org-tenant on 2026-10-02 (doc §5.2), plus a cycle in planning. */
const LIVE: ScopingSummary = {
  active_cycle: {
    id: 'c1',
    name: 'test',
    status: 'planning',
    start_date: null,
    end_date: null,
    objectives: 0,
    success_criteria: 0,
    in_scope_services: 0,
    exclusions: 0,
    threat_scenarios: 0,
    scope_assets: 0,
    attacker_profiles: 0,
  },
  crown_jewels: { total: 9, with_owner: 3 },
  business_services: { total: 3, with_assets: 2 },
  business_units: { total: 4 },
  assets: { total: 69, in_business_unit: 0 },
  boundary: { targets: 5, exclusions: 3 },
  attacker_profiles: { total: 8 },
  threat_models: { total: 3, crown_jewels_covered: 3 },
  cycles: { total: 1 },
}

const ALL = [
  'ctem_cycles',
  'crown_jewels',
  'business_services',
  'business_units',
  'scope_config',
  'threat_model',
]

const wrap = (ui: ReactNode) =>
  render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>)

beforeEach(() => {
  vi.clearAllMocks()
  modules = ALL
  api.get.mockResolvedValue(LIVE)
})

describe('readinessRows', () => {
  const rows = readinessRows(LIVE)
  const row = (key: string) => rows.find((r) => r.key === key)!

  it('measures each artifact against the summary', () => {
    expect(row('cycle')).toMatchObject({ ready: false, href: '/cycles/c1' })
    expect(row('crown_jewels')).toMatchObject({ ready: true, value: '9 assets' })
    expect(row('crown_jewel_owners')).toMatchObject({ ready: false, value: '3 of 9' })
    expect(row('service_assets')).toMatchObject({ ready: false, value: '2 of 3' })
    expect(row('business_units')).toMatchObject({ ready: false, value: '0 of 69', href: '/assets' })
    expect(row('boundary')).toMatchObject({ ready: true, value: '5 targets · 3 exclusions' })
    expect(row('attacker_profiles')).toMatchObject({
      ready: false,
      href: '/cycles/c1?tab=profiles',
    })
    expect(row('threat_models')).toMatchObject({ ready: false, value: '3 of 9' })
    expect(readinessScore(rows)).toEqual({ ready: 3, total: 9 })
  })

  it('an active cycle with a charter is ready', () => {
    const r = readinessRows({
      ...LIVE,
      active_cycle: { ...LIVE.active_cycle!, status: 'active', objectives: 2 },
    })
    expect(r.find((x) => x.key === 'cycle')!.ready).toBe(true)
  })

  it('no cycle points at the cycle list', () => {
    const r = readinessRows({ ...LIVE, active_cycle: null })
    expect(r.find((x) => x.key === 'cycle')).toMatchObject({ href: '/cycles', action: 'Start' })
  })

  it('rows about a module that is off are left out', () => {
    const v = visibleReadiness(rows, (m) => m !== 'business_units' && m !== 'threat_model')
    expect(v.map((r) => r.key)).not.toContain('business_units')
    expect(v.map((r) => r.key)).not.toContain('threat_models')
    expect(v).toHaveLength(7)
  })
})

describe('ScopingOverview', () => {
  it('renders the current cycle and the checklist from one call', async () => {
    wrap(<ScopingOverview />)
    expect(await screen.findByText('3 of 9 ready')).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/api/v1/scoping/summary')
    expect(screen.getByRole('link', { name: 'test' })).toHaveAttribute('href', '/cycles/c1')
    const map = screen.getByRole('link', { name: 'Map: Assets mapped to a business unit' })
    expect(map).toHaveAttribute('href', '/assets')
    expect(screen.getByText(/3 exclusions\s+enforced on scans/)).toBeInTheDocument()
  })

  it('hides rows and the cycle card for modules that are off', async () => {
    modules = ['crown_jewels', 'scope_config']
    wrap(<ScopingOverview />)
    expect(await screen.findByText('2 of 3 ready')).toBeInTheDocument()
    expect(screen.queryByText('Current cycle')).toBeNull()
    expect(screen.queryByRole('link', { name: /Open cycle|Start a cycle/ })).toBeNull()
  })

  it('shows an error with retry when the summary fails', async () => {
    api.get.mockRejectedValue(new Error('boom'))
    wrap(<ScopingOverview />)
    expect(await screen.findByText(/Failed to load the scoping summary/)).toBeInTheDocument()
  })
})

describe('dashboard Scoping tile', () => {
  const tile = () => screen.getByText('Scoping').closest('a')!

  it('opens the overview and shows readiness, not "designate", with crown jewels designated', () => {
    render(
      <CtemLoop
        summary={{ crown_jewels_at_risk: 0 } as never}
        scoping={{ ready: 3, total: 9, crownJewels: 9 }}
      />
    )
    expect(tile()).toHaveAttribute('href', '/scoping')
    expect(within(tile()).getByText(/\/9 ready/)).toBeInTheDocument()
    expect(within(tile()).getByText('9 crown jewels · 0 at risk')).toBeInTheDocument()
    expect(within(tile()).queryByText(/designate/i)).toBeNull()
  })

  it('asks to designate only when none are designated', () => {
    render(<CtemLoop scoping={{ ready: 1, total: 9, crownJewels: 0 }} />)
    expect(within(tile()).getByText('designate crown jewels')).toBeInTheDocument()
  })

  it('without the summary it shows at-risk and never claims none are designated', () => {
    render(<CtemLoop summary={{ crown_jewels_at_risk: 0 } as never} />)
    expect(tile()).toHaveAttribute('href', '/scoping')
    expect(within(tile()).queryByText(/designate/i)).toBeNull()
  })
})

describe('AttackPathsCard', () => {
  const paths = { summary: { reachable_assets: 4, critical_reachable: 2, crown_jewels_at_risk: 0 } }

  it('none at risk with crown jewels designated is not "none designated"', () => {
    render(<AttackPathsCard attackPaths={paths as never} chains={[]} crownJewelsTotal={9} />)
    expect(screen.getByText('No crown jewels at risk')).toBeInTheDocument()
    expect(screen.getByText(/9 crown jewels are designated/)).toBeInTheDocument()
    expect(screen.queryByText(/No crown jewels designated/)).toBeNull()
  })

  it('asks to designate when none are', () => {
    render(<AttackPathsCard attackPaths={paths as never} chains={[]} crownJewelsTotal={0} />)
    expect(screen.getByText('No crown jewels designated')).toBeInTheDocument()
  })
})
