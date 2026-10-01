/**
 * Row-action mutations take their target id when triggered.
 *
 * These hooks used to be created with the selected row's id
 * (`useActivateSensor(selectedSensor?.id || '')`). A row action selects the
 * row and triggers in the same handler, before React re-renders, so the
 * request went to the previously selected row, or nowhere ("Can't trigger
 * the mutation: missing key"). Each test renders the hook ONCE and triggers
 * it for two different ids: both requests must hit their own URL.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SWRConfig } from 'swr'

const post = vi.fn(async (..._args: unknown[]) => ({}))
const del = vi.fn(async (..._args: unknown[]) => undefined)

vi.mock('@/lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  post: (...args: unknown[]) => post(...args),
  del: (...args: unknown[]) => del(...args),
}))
vi.mock('@/context/tenant-provider', () => ({
  useTenant: () => ({ currentTenant: { id: 't-1', slug: 'acme' } }),
}))

import {
  useActivateSensor,
  useDeactivateSensor,
  useRevokeSensor,
  useDeleteSensor,
  useRegenerateSensorKey,
} from '../sensor-hooks'
import {
  useEnableTemplateSource,
  useDisableTemplateSource,
  useSyncTemplateSource,
  templateSourceEndpoints,
} from '../template-source-hooks'
import { useSetDefaultScanProfile } from '../scan-profile-hooks'
import { useRetryOutboxEntryApi } from '@/features/notifications/api/use-notification-outbox-api'
import { sensorEndpoints, scanProfileEndpoints } from '../endpoints'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

type Trigger = (id: string) => Promise<unknown>

async function triggerBoth(useHook: () => { trigger: Trigger }) {
  const { result } = renderHook(() => useHook(), { wrapper })
  await act(async () => {
    await result.current.trigger('row-a')
  })
  await act(async () => {
    await result.current.trigger('row-b')
  })
}

const urls = (fn: typeof post | typeof del) => fn.mock.calls.map((c) => c[0])

describe('row-action mutations target the id passed to trigger()', () => {
  beforeEach(() => {
    post.mockClear()
    del.mockClear()
  })

  it.each([
    ['activate sensor', useActivateSensor, sensorEndpoints.activate],
    ['deactivate sensor', useDeactivateSensor, sensorEndpoints.deactivate],
    ['revoke sensor', useRevokeSensor, sensorEndpoints.revoke],
    ['regenerate sensor key', useRegenerateSensorKey, sensorEndpoints.regenerateKey],
    ['enable template source', useEnableTemplateSource, templateSourceEndpoints.enable],
    ['disable template source', useDisableTemplateSource, templateSourceEndpoints.disable],
    ['sync template source', useSyncTemplateSource, templateSourceEndpoints.sync],
    ['set default scan profile', useSetDefaultScanProfile, scanProfileEndpoints.setDefault],
    [
      'retry outbox entry',
      useRetryOutboxEntryApi,
      (id: string) => `/api/v1/notification-outbox/${id}/retry`,
    ],
  ] as const)('%s', async (_name, useHook, url) => {
    await triggerBoth(useHook as () => { trigger: Trigger })
    expect(urls(post)).toEqual([url('row-a'), url('row-b')])
  })

  it('delete sensor', async () => {
    await triggerBoth(useDeleteSensor as () => { trigger: Trigger })
    expect(urls(del)).toEqual([sensorEndpoints.delete('row-a'), sensorEndpoints.delete('row-b')])
  })
})
