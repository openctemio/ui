import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import TicketingIntegrationPage from '../page'

/**
 * Linear and Asana used to be offered here. The API accepted them and nothing
 * ever used them: there is no client for either. These tests pin that the page
 * offers only Jira, and that a Linear/Asana row from before shows up as not
 * supported rather than as an ordinary pending connection.
 */

const mockUseIntegrations = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/features/integrations/api/use-integrations-api', () => ({
  useIntegrationsApi: () => mockUseIntegrations(),
  useCreateIntegrationApi: () => ({ trigger: mockCreate, isMutating: false }),
  useSyncIntegrationApi: () => ({ trigger: vi.fn(), isMutating: false }),
  useUpdateIntegrationApi: () => ({ trigger: vi.fn(), isMutating: false }),
  useTestIntegrationApi: () => ({ trigger: vi.fn(), isMutating: false }),
  useDeleteIntegrationApi: () => ({ trigger: vi.fn(), isMutating: false }),
  useJiraProjectsApi: () => ({ data: undefined, error: undefined, isLoading: false }),
}))
vi.mock('@/features/integrations/components/routing-rules-dialog', () => ({
  RoutingRulesDialog: () => null,
}))
vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr')
  return { ...actual, mutate: vi.fn() }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/permissions', () => ({
  Can: ({ children }: { children: React.ReactNode }) => children,
  Permission: { IntegrationsManage: 'integrations:manage' },
}))

const row = (over: Record<string, unknown>) => ({
  id: 'i-1',
  name: 'Tracker',
  category: 'ticketing',
  provider: 'jira',
  status: 'pending',
  auth_type: 'token',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...over,
})

function withRows(rows: unknown[]) {
  mockUseIntegrations.mockReturnValue({
    data: { data: rows },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TicketingIntegrationPage', () => {
  it('shows a Linear row from before as not supported', () => {
    withRows([
      row({ id: 'lin', name: 'Old Linear', provider: 'linear', supported: false }),
      row({ id: 'jira', name: 'Security board', provider: 'jira', supported: true }),
    ])
    render(<TicketingIntegrationPage />)

    expect(screen.getByText('Not supported')).toBeInTheDocument()
    expect(
      screen.getByText(/has no client yet, so this connection does nothing/)
    ).toBeInTheDocument()
    // The Linear row is not presented as pending; the Jira row keeps its real status.
    const linearRow = screen.getByText('Old Linear').closest('tr') as HTMLElement
    expect(within(linearRow).getByText('Not supported')).toBeInTheDocument()
    expect(within(linearRow).queryByText('Pending')).not.toBeInTheDocument()
    const jiraRow = screen.getByText('Security board').closest('tr') as HTMLElement
    expect(within(jiraRow).getByText('Pending')).toBeInTheDocument()
  })

  it('treats an Asana row as not supported even without the API field', () => {
    withRows([row({ id: 'asa', name: 'Old Asana', provider: 'asana' })])
    render(<TicketingIntegrationPage />)

    const asanaRow = screen.getByText('Old Asana').closest('tr') as HTMLElement
    expect(within(asanaRow).getByText('Not supported')).toBeInTheDocument()
    expect(within(asanaRow).queryByText('Pending')).not.toBeInTheDocument()
  })

  it('offers only Jira when connecting, and creates a Jira integration', async () => {
    withRows([])
    mockCreate.mockResolvedValue(row({ status: 'connected' }))
    render(<TicketingIntegrationPage />)

    fireEvent.click(screen.getAllByRole('button', { name: /connect jira/i })[0])
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Linear')).not.toBeInTheDocument()
    expect(screen.queryByText('Asana')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Jira base URL'), {
      target: { value: 'https://acme.atlassian.net' },
    })
    fireEvent.change(screen.getByLabelText('Atlassian account email'), {
      target: { value: 'sec@acme.com' },
    })
    fireEvent.change(screen.getByLabelText('API token'), { target: { value: 'tok' } })
    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }))

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ provider: 'jira', category: 'ticketing' })
  })
})
