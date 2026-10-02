/**
 * The cycle detail page and the charter pickers (D6): exclusions are picked
 * from the scope exclusions scans enforce, attacker profiles are links to the
 * cycle (not free text), and the lifecycle step is one confirmed action.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { CharterExclusionsField } from '../charter-exclusions-field'
import { CharterAttackerProfilesField } from '../charter-attacker-profiles-field'
import { CycleLifecycleAction, nextTransition } from '../cycle-lifecycle-actions'
import { syncCycleProfiles } from '../../api'
import CycleDetailPage from '@/app/(dashboard)/(scoping)/cycles/[id]/page'
import type { CtemCycle } from '../../types'

const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api/client', () => api)

vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't1', slug: 't1' } }),
}))
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c1' }),
  usePathname: () => '/cycles/c1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/permissions', async (orig) => {
  const actual = await orig<typeof import('@/lib/permissions')>()
  return {
    ...actual,
    usePermissions: () => ({ can: () => true }),
    Can: ({ children }: { children: ReactNode }) => <>{children}</>,
  }
})

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.scrollIntoView ??= () => {}
})

const wrap = (ui: ReactNode) =>
  render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>)

const PROFILES = [
  { id: 'p1', name: 'External unauthenticated', profile_type: 'external_unauth', is_default: true },
  { id: 'p2', name: 'Insider', profile_type: 'malicious_insider' },
]
const EXCLUSIONS = [
  { id: 'e1', pattern: 'legacy-vpn.corp', exclusion_type: 'domain', reason: 'Decommissioned' },
  { id: 'e2', pattern: '10.9.0.0/16', exclusion_type: 'ip_range', reason: '' },
]
const CYCLE: CtemCycle = {
  id: 'c1',
  name: 'Q4 external',
  status: 'active',
  start_date: '2026-10-01T00:00:00Z',
  end_date: '2026-12-31T00:00:00Z',
  created_at: '',
  updated_at: '',
  charter: {
    objectives: ['Cut KEV exposure'],
    in_scope_services: ['s1'],
    exclusions: [{ item: 'legacy-vpn.corp', reason: 'Decommissioned' }],
    success_criteria: [{ name: 'KEV', metric: 'MTTR', target: '< 14 days' }],
  },
}

function routeGets(cycle: CtemCycle = CYCLE) {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/ctem-cycles/c1') return Promise.resolve(cycle)
    if (url === '/api/v1/ctem-cycles/c1/profiles') return Promise.resolve({ data: [PROFILES[0]] })
    if (url === '/api/v1/ctem-cycles/c1/scope')
      return Promise.resolve([
        {
          id: 'x1',
          asset_id: 'a1',
          included_at: '2026-10-01T00:00:00Z',
          asset_name: 'checkout-api',
          asset_type: 'api',
          asset_criticality: 'critical',
        },
      ])
    if (url.startsWith('/api/v1/attacker-profiles')) return Promise.resolve({ data: PROFILES })
    if (url.startsWith('/api/v1/scope/exclusions'))
      return Promise.resolve({ data: EXCLUSIONS, total: 2 })
    if (url.startsWith('/api/v1/business-services'))
      return Promise.resolve({ data: [{ id: 's1', name: 'Checkout' }] })
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/cycles/c1')
  routeGets()
  api.post.mockResolvedValue(undefined)
  api.del.mockResolvedValue(undefined)
})

describe('CharterExclusionsField', () => {
  it('stores a picked enforced exclusion as its pattern with its reason', async () => {
    const onChange = vi.fn()
    wrap(<CharterExclusionsField value={[]} onChange={onChange} editable />)
    await userEvent.click(await screen.findByRole('checkbox', { name: /legacy-vpn\.corp/ }))
    expect(onChange).toHaveBeenCalledWith([{ item: 'legacy-vpn.corp', reason: 'Decommissioned' }])
  })

  it('lists free-text entries no scan enforces, and removes them', async () => {
    const onChange = vi.fn()
    wrap(
      <CharterExclusionsField
        value={[{ item: 'Old ERP', reason: 'sunset' }]}
        onChange={onChange}
        editable
      />
    )
    expect(await screen.findByText(/Not enforced/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Old ERP' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})

describe('CharterAttackerProfilesField', () => {
  it('toggles profile ids', async () => {
    const onChange = vi.fn()
    wrap(<CharterAttackerProfilesField value={['p1']} onChange={onChange} editable />)
    await userEvent.click(await screen.findByRole('checkbox', { name: /Insider/ }))
    expect(onChange).toHaveBeenCalledWith(['p1', 'p2'])
  })
})

describe('syncCycleProfiles', () => {
  it('links the added profiles in one call and unlinks the removed ones', async () => {
    await syncCycleProfiles('c1', ['p1', 'p2'], ['p2', 'p3', 'p4'])
    expect(api.post).toHaveBeenCalledWith('/api/v1/ctem-cycles/c1/profiles', {
      profile_ids: ['p3', 'p4'],
    })
    expect(api.del).toHaveBeenCalledWith('/api/v1/ctem-cycles/c1/profiles/p1')
    expect(api.del).toHaveBeenCalledTimes(1)
  })
})

describe('CycleLifecycleAction', () => {
  it('maps each status to its next step', () => {
    expect(nextTransition('planning')).toBe('activate')
    expect(nextTransition('active')).toBe('review')
    expect(nextTransition('review')).toBe('close')
    expect(nextTransition('closed')).toBeNull()
  })

  it('activates through the activate endpoint after confirmation', async () => {
    const onDone = vi.fn()
    api.post.mockResolvedValue({ ...CYCLE, status: 'active' })
    wrap(<CycleLifecycleAction cycle={{ ...CYCLE, status: 'planning' }} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: 'Activate' }))
    const dialog = await screen.findByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Activate' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/ctem-cycles/c1/activate'))
    expect(onDone).toHaveBeenCalled()
  })

  it('offers nothing on a closed cycle', () => {
    const { container } = wrap(
      <CycleLifecycleAction cycle={{ ...CYCLE, status: 'closed' }} onDone={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('cycle detail page', () => {
  it('shows the charter, the frozen scope and the assumed attackers', async () => {
    wrap(<CycleDetailPage />)
    expect(await screen.findByRole('heading', { name: 'Q4 external' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start review' })).toBeInTheDocument()
    // Charter tab: service names, not IDs; the exclusion is marked enforced.
    expect(await screen.findByText('Checkout')).toBeInTheDocument()
    expect(await screen.findByLabelText('Enforced on scans')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Scope/ }))
    expect(await screen.findByRole('link', { name: 'checkout-api' })).toHaveAttribute(
      'href',
      '/assets/a1'
    )

    await userEvent.click(screen.getByRole('tab', { name: /Attacker profiles/ }))
    expect(await screen.findByText('External unauthenticated')).toBeInTheDocument()
  })

  it('scope rows from an API without asset names link the id; deleted assets say so', async () => {
    const base = api.get.getMockImplementation()!
    api.get.mockImplementation((url: string) =>
      url === '/api/v1/ctem-cycles/c1/scope'
        ? Promise.resolve([
            { id: 'x1', asset_id: 'a-old', included_at: '2026-10-01T00:00:00Z' },
            { id: 'x2', asset_id: 'a-gone', included_at: '2026-10-01T00:00:00Z', asset_name: '' },
          ])
        : base(url)
    )
    wrap(<CycleDetailPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Scope/ }))
    expect(await screen.findByRole('link', { name: 'a-old' })).toHaveAttribute(
      'href',
      '/assets/a-old'
    )
    expect(screen.getByText('Deleted asset')).toBeInTheDocument()
  })

  it('a planning cycle explains that scope freezes on Activate', async () => {
    routeGets({ ...CYCLE, status: 'planning' })
    wrap(<CycleDetailPage />)
    await userEvent.click(await screen.findByRole('tab', { name: /Scope/ }))
    expect(screen.getByText('Scope is frozen on Activate')).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalledWith('/api/v1/ctem-cycles/c1/scope')
  })
})
