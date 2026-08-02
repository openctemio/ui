import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotificationIntegrationsPage from '../page'

/**
 * The channel list summarises each channel's routed event types. It used to do
 * that with a `.find()` against a hardcoded array, which meant any event type
 * the array did not know about was skipped — a channel routing `sla_breach`
 * displayed as though it routed nothing.
 *
 * These tests drive the page with a catalog the API "returned" and assert the
 * page renders from it. The catalog below deliberately includes labels that
 * exist nowhere in the source, so a reintroduced local list cannot satisfy them.
 */

const mockUseTenantEventTypes = vi.fn()
const mockUseNotificationIntegrations = vi.fn()

vi.mock('@/features/integrations/api/use-event-types', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/integrations/api/use-event-types')
  >('@/features/integrations/api/use-event-types')
  return { ...actual, useTenantEventTypes: () => mockUseTenantEventTypes() }
})

vi.mock('@/features/integrations', () => ({
  useNotificationIntegrationsApi: () => mockUseNotificationIntegrations(),
  invalidateNotificationIntegrationsCache: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/permissions', () => ({
  Can: ({ children }: { children: React.ReactNode }) => children,
  Permission: {
    NotificationsWrite: 'notifications:write',
    NotificationsDelete: 'notifications:delete',
  },
}))

// The add/edit dialogs fetch on their own; they are covered by
// event-type-selector.test.tsx and only get in the way here.
vi.mock('@/features/notifications/components/add-notification-dialog', () => ({
  AddNotificationDialog: () => null,
}))
vi.mock('@/features/notifications/components/edit-notification-dialog', () => ({
  EditNotificationDialog: () => null,
}))

const channel = (enabledEventTypes: string[]) => ({
  id: 'chan-1',
  name: 'Ops Slack',
  provider: 'slack',
  category: 'notification',
  status: 'active',
  auth_type: 'token',
  notification_extension: {
    enabled_severities: ['critical', 'high'],
    enabled_event_types: enabledEventTypes,
    include_details: true,
    min_interval_minutes: 5,
  },
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseNotificationIntegrations.mockReturnValue({
    data: { data: [channel(['sla_breach', 'approval_requested'])] },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })
})

describe('NotificationIntegrationsPage event-type summary', () => {
  it('labels event types using the catalog the API returned', async () => {
    mockUseTenantEventTypes.mockReturnValue({
      eventTypes: [
        // Labels chosen so they cannot come from anywhere but this mock.
        {
          type: 'sla_breach',
          category: 'finding',
          label: 'Deadline Missed',
          description: '',
          default_enabled: true,
        },
        {
          type: 'approval_requested',
          category: 'approval',
          label: 'Sign-off Wanted',
          description: '',
          default_enabled: true,
        },
      ],
      // Category labels that appear nowhere in the source, so the rendered
      // headings can only have come from this response.
      categories: [
        { category: 'finding', label: 'Deadline Group Events' },
        { category: 'approval', label: 'Signoff Group Events' },
      ],
      defaultEnabled: ['sla_breach'],
      totalCount: 12,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    })

    render(<NotificationIntegrationsPage />)

    // Two categories, each with one type: the compact badges name the
    // categories, taking their labels from the API response.
    expect(await screen.findByText(/^Deadline Group \(1\)$/)).toBeInTheDocument()
    expect(screen.getByText(/^Signoff Group \(1\)$/)).toBeInTheDocument()
  })

  it('does not claim "All events" while the catalog is still loading', async () => {
    // With a hardcoded list, "all" was `enabled.length === LIST.length`. Reading
    // the count from the API means it is 0 in flight, and 2 === 0 must not be
    // allowed to become "everything is routed".
    mockUseTenantEventTypes.mockReturnValue({
      eventTypes: [],
      categories: [],
      defaultEnabled: [],
      totalCount: 0,
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
    })

    render(<NotificationIntegrationsPage />)

    expect(await screen.findByText('Ops Slack')).toBeInTheDocument()
    expect(screen.queryByText('All events')).not.toBeInTheDocument()
  })

  it('still accounts for event types missing from the catalog', async () => {
    // A type whose module was disabled since the channel was configured. The
    // old `.find()` dropped it silently, understating what the channel routes.
    mockUseTenantEventTypes.mockReturnValue({
      eventTypes: [],
      categories: [],
      defaultEnabled: [],
      totalCount: 12,
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
    })

    render(<NotificationIntegrationsPage />)

    // Both unknown types land in one "Other" bucket rather than vanishing.
    expect(await screen.findByText(/^Other \(2\)$/)).toBeInTheDocument()
  })
})
