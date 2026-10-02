/**
 * Asset linking for business context: the shared picker, the business-unit and
 * business-service panels (the calls they make), and the inventory bulk
 * actions. These links feed EffectiveCriticality and a cycle's scope snapshot,
 * and before this UI nothing could create them.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { LinkAssetsDialog, linkInBatches } from '../link-assets-dialog'
import { BusinessUnitAssets } from '@/features/business-units/components/business-unit-assets'
import { BusinessServiceAssets } from '@/features/business-services/components/business-service-assets'
import { InventoryBusinessContextActions } from '../inventory/inventory-business-context-actions'
import type { Asset } from '../../types/asset.types'

const toast = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), del: vi.fn(), put: vi.fn() }))
vi.mock('@/lib/api/client', () => api)

const assetsHook = vi.hoisted(() => ({ calls: [] as unknown[], mutate: vi.fn() }))
const PICKABLE = [
  { id: 'a1', name: 'web-01', type: 'host', criticality: 'high' },
  { id: 'a2', name: 'db-01', type: 'database', criticality: 'critical' },
  { id: 'a3', name: 'api-gw', type: 'api', criticality: 'medium' },
]
vi.mock('@/features/assets/hooks/use-assets', () => ({
  useAssets: (filters: { businessUnitIds?: string[] }) => {
    assetsHook.calls.push(filters)
    const members = filters?.businessUnitIds ? PICKABLE.slice(0, 1) : PICKABLE
    return {
      assets: members,
      total: members.length,
      isLoading: false,
      error: undefined,
      mutate: assetsHook.mutate,
    }
  },
}))

let perms: string[] = []
let modules: string[] = []
vi.mock('@/lib/permissions', async (orig) => {
  const actual = await orig<typeof import('@/lib/permissions')>()
  return {
    ...actual,
    usePermissions: () => ({ can: (p: string) => perms.includes(p) }),
    useNavItemAccess:
      () =>
      ({ module, permission }: { module?: string; permission?: string }) =>
        (!module || modules.includes(module)) && (!permission || perms.includes(permission)),
  }
})

// jsdom lacks what Radix ScrollArea and Select use.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

const wrap = (ui: ReactNode) =>
  render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{ui}</SWRConfig>)

beforeEach(() => {
  vi.clearAllMocks()
  assetsHook.calls = []
  perms = ['assets:write', 'ctem:business_services:write', 'ctem:business_services:read']
  modules = ['business_units', 'business_services']
  api.post.mockResolvedValue(undefined)
  api.del.mockResolvedValue(undefined)
})

describe('LinkAssetsDialog (shared picker)', () => {
  it('shows linked assets as linked and links only the picked ones', async () => {
    const onLink = vi.fn().mockResolvedValue(0)
    const onOpenChange = vi.fn()
    wrap(
      <LinkAssetsDialog
        open
        onOpenChange={onOpenChange}
        targetName="Payments"
        description="d"
        linkedIds={new Set(['a1'])}
        onLink={onLink}
      />
    )
    const linked = screen.getByText('web-01').closest('[role="button"]')!
    expect(linked).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(linked)
    await userEvent.click(screen.getByText('db-01'))
    await userEvent.click(screen.getByRole('button', { name: 'Link 1 asset' }))
    expect(onLink).toHaveBeenCalledWith(['a2'])
    expect(toast.success).toHaveBeenCalledWith('1 asset linked to Payments')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('reports a partial failure and stays open when every link failed', async () => {
    const onLink = vi.fn().mockResolvedValue(2)
    const onOpenChange = vi.fn()
    wrap(
      <LinkAssetsDialog
        open
        onOpenChange={onOpenChange}
        targetName="X"
        description="d"
        onLink={onLink}
      />
    )
    await userEvent.click(screen.getByText('db-01'))
    await userEvent.click(screen.getByText('api-gw'))
    await userEvent.click(screen.getByRole('button', { name: 'Link 2 assets' }))
    expect(toast.error).toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('linkInBatches counts failures', async () => {
    const failed = await linkInBatches([1, 2, 3, 4, 5, 6, 7], (n) =>
      n % 3 === 0 ? Promise.reject(new Error('x')) : Promise.resolve()
    )
    expect(failed).toBe(2)
  })
})

describe('BusinessUnitAssets', () => {
  it('lists members through the inventory filter and links through the unit endpoint', async () => {
    const onChanged = vi.fn()
    wrap(<BusinessUnitAssets unit={{ id: 'bu1', name: 'Payments' }} onChanged={onChanged} />)
    expect(assetsHook.calls).toContainEqual({ businessUnitIds: ['bu1'], pageSize: 100 })
    const list = screen.getByRole('list', { name: 'Assets linked to Payments' })
    expect(within(list).getByText('web-01')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Link assets' }))
    await userEvent.click(screen.getByText('db-01'))
    await userEvent.click(screen.getByText('api-gw'))
    await userEvent.click(screen.getByRole('button', { name: 'Link 2 assets' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2))
    expect(api.post).toHaveBeenCalledWith('/api/v1/business-units/bu1/assets', { asset_id: 'a2' })
    expect(api.post).toHaveBeenCalledWith('/api/v1/business-units/bu1/assets', { asset_id: 'a3' })
    expect(onChanged).toHaveBeenCalled()
  })

  it('unlinks through the unit endpoint', async () => {
    wrap(<BusinessUnitAssets unit={{ id: 'bu1', name: 'Payments' }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Unlink web-01' }))
    await waitFor(() =>
      expect(api.del).toHaveBeenCalledWith('/api/v1/business-units/bu1/assets/a1')
    )
  })

  it('is read-only without assets:write', () => {
    perms = []
    wrap(<BusinessUnitAssets unit={{ id: 'bu1', name: 'Payments' }} />)
    expect(screen.queryByRole('button', { name: 'Link assets' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Unlink web-01' })).toBeNull()
  })
})

describe('BusinessServiceAssets', () => {
  it('lists the service links and links with the dependency type', async () => {
    api.get.mockResolvedValue([
      {
        asset_id: 'a1',
        asset_name: 'web-01',
        asset_type: 'host',
        dependency_type: 'depends_on',
        created_at: '',
      },
    ])
    wrap(<BusinessServiceAssets service={{ id: 's1', name: 'Checkout' }} />)
    expect(await screen.findByText('web-01')).toBeInTheDocument()
    expect(screen.getByText(/depends on/)).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/api/v1/business-services/s1/assets')

    await userEvent.click(screen.getByRole('button', { name: 'Link assets' }))
    await userEvent.click(screen.getByText('db-01'))
    await userEvent.click(screen.getByRole('button', { name: 'Link 1 asset' }))
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/v1/business-services/s1/assets', {
        asset_id: 'a2',
        dependency_type: 'runs_on',
      })
    )
  })
})

describe('InventoryBusinessContextActions', () => {
  const selected = [{ id: 'a1' }, { id: 'a2' }] as Asset[]

  it('shows nothing when neither module is on', () => {
    modules = []
    const { container } = wrap(
      <InventoryBusinessContextActions selected={selected} onDone={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('hides Add to service without the services write permission', () => {
    perms = ['assets:write']
    wrap(<InventoryBusinessContextActions selected={selected} onDone={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add to unit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to service' })).toBeNull()
  })

  it('adds every selected asset to the chosen unit', async () => {
    api.get.mockResolvedValue({ data: [{ id: 'bu1', name: 'Payments' }], total: 1 })
    const onDone = vi.fn()
    wrap(<InventoryBusinessContextActions selected={selected} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add to unit' }))
    await userEvent.click(screen.getByRole('combobox', { name: /business unit/i }))
    await userEvent.click(await screen.findByRole('option', { name: 'Payments' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(api.post).toHaveBeenCalledWith('/api/v1/business-units/bu1/assets', { asset_id: 'a1' })
    expect(api.post).toHaveBeenCalledWith('/api/v1/business-units/bu1/assets', { asset_id: 'a2' })
    expect(toast.success).toHaveBeenCalledWith('Added 2 assets to Payments')
  })
})
