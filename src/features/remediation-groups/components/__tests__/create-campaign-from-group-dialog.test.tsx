import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateCampaignFromGroupDialog } from '../create-campaign-from-group-dialog'
import type { RemediationGroup } from '../../types'

const mockPush = vi.fn()
const mockTrigger = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/features/remediation/api/use-remediation-campaigns', () => ({
  useCreateRemediationCampaign: () => ({ trigger: mockTrigger, isMutating: false }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const group: RemediationGroup = {
  key: 'sol:deadbeef',
  title: 'Upgrade OpenSSL to 3.0.7',
  finding_count: 12,
  asset_count: 4,
  severity_counts: { high: 12 },
  fix_available: true,
}

describe('CreateCampaignFromGroupDialog', () => {
  beforeEach(() => vi.clearAllMocks())

  it('seeds the name from the group title', () => {
    render(<CreateCampaignFromGroupDialog open group={group} onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText('Name')).toHaveValue('Upgrade OpenSSL to 3.0.7')
  })

  it('creates a campaign keyed to the group and navigates to it', async () => {
    mockTrigger.mockResolvedValueOnce({ id: 'camp-99' })
    const onOpenChange = vi.fn()
    render(<CreateCampaignFromGroupDialog open group={group} onOpenChange={onOpenChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Create campaign' }))

    expect(mockTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Upgrade OpenSSL to 3.0.7',
        finding_filter: { remediation_key: 'sol:deadbeef' },
      })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockPush).toHaveBeenCalledWith('/remediation/camp-99')
  })

  it('does not submit an empty name', async () => {
    render(<CreateCampaignFromGroupDialog open group={group} onOpenChange={vi.fn()} />)
    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.click(screen.getByRole('button', { name: 'Create campaign' }))
    expect(mockTrigger).not.toHaveBeenCalled()
  })
})
