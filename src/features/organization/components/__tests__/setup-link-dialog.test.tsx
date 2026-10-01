import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ApiClientError } from '@/lib/api/error-handler'
import { SetupLinkDialog } from '../setup-link-dialog'

const target = { userId: 'u1', email: 'bob@co.com', name: 'Bob' }

describe('SetupLinkDialog', () => {
  it('issues the link only on an explicit click, then shows it once', async () => {
    const issue = vi.fn().mockResolvedValue({ email_sent: false, setup_token: 'fresh' })
    const user = userEvent.setup()
    render(<SetupLinkDialog target={target} onOpenChange={vi.fn()} issue={issue} />)

    expect(issue).not.toHaveBeenCalled()
    expect(screen.getByText(/any link issued before stops working/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /issue setup link/i }))

    await waitFor(() => expect(issue).toHaveBeenCalledWith('u1'))
    expect(await screen.findByTestId('setup-link')).toHaveTextContent('token=fresh')
  })

  it('shows the API error (e.g. not pending setup)', async () => {
    const issue = vi
      .fn()
      .mockRejectedValue(new ApiClientError('user is not pending setup', 'BAD_REQUEST', 400))
    const user = userEvent.setup()
    render(<SetupLinkDialog target={target} onOpenChange={vi.fn()} issue={issue} />)
    await user.click(screen.getByRole('button', { name: /issue setup link/i }))
    expect(await screen.findByText('user is not pending setup')).toBeInTheDocument()
  })
})
