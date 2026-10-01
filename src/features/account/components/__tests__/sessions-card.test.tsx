import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionsCard } from '../sessions-card'
import type { Session } from '../../types/account.types'

const revokeSession = vi.fn()
const revokeAllSessions = vi.fn()
vi.mock('../../api/use-sessions', () => ({
  useRevokeSession: () => ({ revokeSession, isRevoking: false }),
  useRevokeAllSessions: () => ({ revokeAllSessions, isRevoking: false }),
}))

const now = new Date().toISOString()
const sessions: Session[] = [
  {
    id: 'other',
    ip_address: '203.0.113.7',
    user_agent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    created_at: now,
    last_activity_at: now,
    is_current: false,
  },
  {
    id: 'current',
    ip_address: '198.51.100.2',
    user_agent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
    created_at: now,
    last_activity_at: now,
    is_current: true,
  },
]

describe('SessionsCard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists sessions from the API shape, current first', () => {
    render(<SessionsCard sessions={sessions} isLoading={false} onChanged={vi.fn()} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Chrome on macOS')
    expect(items[0]).toHaveTextContent('This device')
    expect(items[1]).toHaveTextContent('Safari on iOS')
    expect(items[1]).toHaveTextContent('203.0.113.7')
  })

  it('signs out one other session after confirmation', async () => {
    revokeSession.mockResolvedValue(true)
    const onChanged = vi.fn()
    const user = userEvent.setup()
    render(<SessionsCard sessions={sessions} isLoading={false} onChanged={onChanged} />)
    // only the other session has a per-row sign out
    const rowButtons = screen.getAllByRole('button', { name: 'Sign out' })
    expect(rowButtons).toHaveLength(1)
    await user.click(rowButtons[0])
    await user.click(screen.getAllByRole('button', { name: 'Sign out' }).at(-1)!)
    expect(revokeSession).toHaveBeenCalledWith('other')
    expect(onChanged).toHaveBeenCalled()
  })

  it('signs out all other sessions', async () => {
    revokeAllSessions.mockResolvedValue(true)
    const user = userEvent.setup()
    render(<SessionsCard sessions={sessions} isLoading={false} onChanged={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /sign out all others/i }))
    await user.click(screen.getAllByRole('button', { name: /sign out all others/i }).at(-1)!)
    expect(revokeAllSessions).toHaveBeenCalled()
  })

  it('hides "sign out all others" when this is the only session', () => {
    render(<SessionsCard sessions={[sessions[1]]} isLoading={false} onChanged={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /sign out all others/i })).not.toBeInTheDocument()
  })
})
