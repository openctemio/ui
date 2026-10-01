import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { InvitationView } from '../invitation-view'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const preview = {
  invitation: {
    id: 'i1',
    email: 'new.person@co.com',
    role: 'member',
    pending: true,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    inviter_name: 'Alice',
  },
  tenant: { id: 't1', name: 'Acme', slug: 'acme' },
}

describe('InvitationView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(preview), { status: 200 }))
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  it('without a session offers sign in and "Create your account" for the invited email', async () => {
    render(<InvitationView token="tok123" hasSession={false} />)

    const create = await screen.findByRole('link', { name: /create your account/i })
    const url = new URL(create.getAttribute('href') ?? '', 'http://x')
    expect(url.pathname).toBe('/register')
    expect(url.searchParams.get('returnTo')).toBe('/invitations/tok123')
    expect(url.searchParams.get('email')).toBe('new.person@co.com')

    const signIn = screen.getByRole('link', { name: /sign in to accept/i })
    const loginUrl = new URL(signIn.getAttribute('href') ?? '', 'http://x')
    expect(loginUrl.pathname).toBe('/login')
    expect(loginUrl.searchParams.get('returnTo')).toBe('/invitations/tok123')

    // Accept/Decline need a session; they are not offered.
    expect(screen.queryByRole('button', { name: /accept invitation/i })).toBeNull()
  })

  it('with a session shows Accept / Decline', async () => {
    render(<InvitationView token="tok123" hasSession />)
    expect(await screen.findByRole('button', { name: /accept invitation/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create your account/i })).toBeNull()
  })

  it('names the inviter when the preview carries a name', async () => {
    render(<InvitationView token="tok123" hasSession />)
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('A team member')).toBeNull()
  })

  it.each([undefined, '', '  '])(
    'falls back to "A team member" for inviter_name %j',
    async (name) => {
      const unnamed = { ...preview, invitation: { ...preview.invitation, inviter_name: name } }
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify(unnamed), { status: 200 }))
      )
      render(<InvitationView token="tok123" hasSession />)
      expect(await screen.findByText('A team member')).toBeInTheDocument()
    }
  )
})
