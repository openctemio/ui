import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import type { Asset } from '@/features/assets'
import type { ApiIdentityExposure } from '../../api/credential-api.types'

const get = vi.fn()
vi.mock('@/lib/api/client', () => ({ get: (url: string) => get(url) }))

import { CredentialIdentityGroups } from '../credential-identity-groups'

const columns: ColumnDef<Asset>[] = [{ accessorKey: 'name', header: 'Name' }]

const identity = (name: string, active = 1): ApiIdentityExposure =>
  ({
    identity: name,
    identity_type: 'email',
    exposure_count: 2,
    sources: ['breach'],
    credential_types: ['password'],
    states: { active, resolved: 1 },
    highest_severity: 'high',
  }) as ApiIdentityExposure

const leak = (id: string, identifier: string) => ({
  id,
  identifier,
  credential_type: 'password',
  source: 'breach',
  severity: 'high',
  state: 'active',
})

beforeEach(() => {
  get.mockReset()
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
  get.mockImplementation(async (url: string) => {
    const who = decodeURIComponent(url.split('/identities/')[1].split('/')[0])
    return { items: [leak(`${who}-1`, `${who} leak`)], total: 1 }
  })
})

describe('CredentialIdentityGroups', () => {
  it('shows each identity as a group row and loads the first three groups’ leaks', async () => {
    const ids = ['a@x.io', 'b@x.io', 'c@x.io', 'd@x.io'].map((n) => identity(n))
    render(<CredentialIdentityGroups identities={ids} columns={columns} resetKey="" />)
    expect(screen.getByText('a@x.io')).toBeInTheDocument()
    expect(screen.getAllByText(/2 exposures · breach · password/)).toHaveLength(4)
    await screen.findByText('c@x.io leak')
    expect(get).toHaveBeenCalledTimes(3)
    expect(get.mock.calls[0][0]).toBe(
      '/api/v1/credentials/identities/a%40x.io/exposures?page=1&page_size=5'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Expand d@x.io' }))
    await screen.findByText('d@x.io leak')
    expect(document.body.textContent).toContain('of 4 identities')
  })

  it('pages through identities', () => {
    const ids = Array.from({ length: 25 }, (_, i) => identity(`u${i}@x.io`))
    render(<CredentialIdentityGroups identities={ids} columns={columns} resetKey="" />)
    expect(screen.getByText('u0@x.io')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('u20@x.io')).toBeInTheDocument()
    expect(screen.queryByText('u0@x.io')).toBeNull()
  })
})
