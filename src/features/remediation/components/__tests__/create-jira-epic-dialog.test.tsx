/**
 * CreateJiraEpicDialog tests:
 * - hidden when no campaign, shown (with name) when a campaign is set
 * - Create disabled until a project key is entered
 * - trigger called with the upper-cased project key
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateJiraEpicDialog } from '../create-jira-epic-dialog'

const mockTrigger = vi.fn()
vi.mock('@/features/remediation/api/use-remediation-campaigns', () => ({
  useCreateCampaignTicket: vi.fn(() => ({ trigger: mockTrigger, isMutating: false })),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

describe('CreateJiraEpicDialog', () => {
  beforeEach(() => {
    mockTrigger.mockReset()
    mockTrigger.mockResolvedValue({
      issue_key: 'SEC-1',
      issue_url: 'https://x/browse/SEC-1',
      already_existed: false,
    })
  })

  it('does not render when no campaign is selected', () => {
    render(<CreateJiraEpicDialog campaign={null} onOpenChange={() => {}} />)
    expect(screen.queryByText('Create Jira Epic')).not.toBeInTheDocument()
  })

  it('renders with the campaign name when open', () => {
    render(
      <CreateJiraEpicDialog campaign={{ id: 'c1', name: 'Fix Log4j' }} onOpenChange={() => {}} />
    )
    expect(screen.getByText('Create Jira Epic')).toBeInTheDocument()
    expect(screen.getByText('Fix Log4j')).toBeInTheDocument()
  })

  it('disables Create until a project key is entered, then triggers with upper-cased key', async () => {
    const user = userEvent.setup()
    render(
      <CreateJiraEpicDialog campaign={{ id: 'c1', name: 'Fix Log4j' }} onOpenChange={() => {}} />
    )

    const createBtn = screen.getByRole('button', { name: /create epic/i })
    expect(createBtn).toBeDisabled()

    await user.type(screen.getByLabelText(/jira project key/i), 'sec')
    expect(createBtn).toBeEnabled()

    await user.click(createBtn)
    expect(mockTrigger).toHaveBeenCalledWith({ project_key: 'SEC' })
  })
})
