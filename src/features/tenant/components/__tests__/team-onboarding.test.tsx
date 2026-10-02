import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TeamOnboarding } from '../team-onboarding'

type Providers = { data?: { tenant_creation_mode?: string }; error?: unknown; isLoading: boolean }
let providers: Providers = { isLoading: true }

vi.mock('@/features/auth/api/use-auth-providers', () => ({
  useAuthProviders: () => providers,
}))

// The form has its own tests; here we only care whether it is offered.
vi.mock('../create-team-form', () => ({
  CreateTeamForm: () => <form aria-label="create team form" />,
}))

describe('TeamOnboarding', () => {
  beforeEach(() => {
    providers = { isLoading: true }
  })

  it('shows neither the form nor the notice while the policy loads', () => {
    render(<TeamOnboarding hasOtherTeams={false} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: /create team form/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/not a member of any organization/i)).not.toBeInTheDocument()
  })

  it('offers the create-team form under self-service', () => {
    providers = { data: { tenant_creation_mode: 'self_service' }, isLoading: false }
    render(<TeamOnboarding hasOtherTeams={false} />)
    expect(screen.getByRole('form', { name: /create team form/i })).toBeInTheDocument()
    expect(screen.getByText('Set up your first team')).toBeInTheDocument()
  })

  it('tells a user with no organization to ask their administrator under admin_only', () => {
    providers = { data: { tenant_creation_mode: 'admin_only' }, isLoading: false }
    render(<TeamOnboarding hasOtherTeams={false} />)
    expect(screen.getByText('You are not a member of any organization yet')).toBeInTheDocument()
    expect(screen.getByText(/ask your administrator/i)).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: /create team form/i })).not.toBeInTheDocument()
  })

  it('says only the administrator creates organizations for a user who has other teams', () => {
    providers = { data: { tenant_creation_mode: 'admin_only' }, isLoading: false }
    render(<TeamOnboarding hasOtherTeams />)
    expect(screen.getByText('Organizations are created by your administrator')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: /create team form/i })).not.toBeInTheDocument()
  })

  it('falls back to the form when the policy cannot be fetched (the server still enforces it)', () => {
    providers = { error: new Error('429'), isLoading: false }
    render(<TeamOnboarding hasOtherTeams={false} />)
    expect(screen.getByRole('form', { name: /create team form/i })).toBeInTheDocument()
  })
})
